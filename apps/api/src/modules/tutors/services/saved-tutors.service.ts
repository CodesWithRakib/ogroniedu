import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedTutorEntity } from '../entities/saved-tutor.entity';
import { TutorSearchService } from './tutor-search.service';
import type { TutorPublicProfileDto } from '../dto';

export interface SavedTutorItemDto {
  tutorId: string;
  savedAt: string;
  /** Null when the tutor is no longer publicly discoverable. */
  profile: TutorPublicProfileDto | null;
}

/**
 * User-private tutor shortlist. Every query is scoped to the authenticated
 * user; there is no cross-user or tenant access path.
 */
@Injectable()
export class SavedTutorsService {
  constructor(
    @InjectRepository(SavedTutorEntity)
    private readonly savedRepo: Repository<SavedTutorEntity>,
    @Inject(TutorSearchService)
    private readonly searchService: TutorSearchService,
  ) {}

  async list(userId: string): Promise<SavedTutorItemDto[]> {
    const saved = await this.savedRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      saved.map(async (row) => {
        let profile: TutorPublicProfileDto | null = null;
        try {
          profile = await this.searchService.getPublicProfile(row.tutorUserId);
        } catch {
          // Saved entry survives; the tutor is simply no longer publicly
          // bookable (unverified, suspended, expired or unpublished).
          profile = null;
        }
        return {
          tutorId: row.tutorUserId,
          savedAt: row.createdAt.toISOString(),
          profile,
        };
      }),
    );
  }

  /** Idempotent save. Re-saving an already saved tutor keeps the first date. */
  async save(userId: string, tutorUserId: string): Promise<SavedTutorItemDto> {
    if (userId === tutorUserId) {
      throw new BadRequestException('You cannot save your own tutor profile.');
    }

    // Refuses unknown/ineligible tutors without leaking why they are private.
    await this.searchService.getPublicProfile(tutorUserId);

    const existing = await this.savedRepo.findOne({
      where: { userId, tutorUserId },
    });
    if (existing) {
      return {
        tutorId: existing.tutorUserId,
        savedAt: existing.createdAt.toISOString(),
        profile: await this.searchService.getPublicProfile(existing.tutorUserId),
      };
    }

    const saved = await this.savedRepo.save(this.savedRepo.create({ userId, tutorUserId }));
    return {
      tutorId: saved.tutorUserId,
      savedAt: saved.createdAt.toISOString(),
      profile: await this.searchService.getPublicProfile(saved.tutorUserId),
    };
  }

  /** Idempotent unsave; deleting a non-saved tutor is not an error. */
  async remove(userId: string, tutorUserId: string): Promise<{ removed: boolean }> {
    const result = await this.savedRepo.delete({ userId, tutorUserId });
    return { removed: (result.affected ?? 0) > 0 };
  }
}
