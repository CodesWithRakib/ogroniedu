import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TUTOR_VERIFICATION_LEVEL_ORDER,
  type TutorVerificationLevel,
  type VerificationLevelStatus,
} from '@ogroniedu/contracts';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import { TutorVerificationLevelEntity } from '../entities/tutor-verification-level.entity';
import { overallStatusFromLevels } from './verification-state-machine';

/**
 * Owns the level rows and the *derived* profile status.
 *
 * Single-writer rule: only this service recomputes
 * `tutor_profiles.verification_status`. Applicant submissions, reviewer
 * decisions and the expiry sweep all funnel here, which is what keeps the
 * overall status consistent with the per-level decisions.
 */
@Injectable()
export class TutorVerificationStatusService {
  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorVerificationLevelEntity)
    private readonly levelRepo: Repository<TutorVerificationLevelEntity>,
  ) {}

  /** Creates the three level rows on first touch; idempotent. */
  async ensureLevels(
    userId: string,
    policyVersion: string,
  ): Promise<TutorVerificationLevelEntity[]> {
    const existing = await this.levelRepo.find({ where: { tutorUserId: userId } });
    const byLevel = new Map(existing.map((row) => [row.level, row]));
    const missing = TUTOR_VERIFICATION_LEVEL_ORDER.filter((level) => !byLevel.has(level));
    if (missing.length > 0) {
      const created = missing.map((level) =>
        this.levelRepo.create({
          tutorUserId: userId,
          level,
          status: 'not_started',
          policyVersion,
          submissionCount: 0,
          version: 1,
        }),
      );
      const saved = await this.levelRepo.save(created);
      for (const row of saved) byLevel.set(row.level, row);
    }
    return TUTOR_VERIFICATION_LEVEL_ORDER.map(
      (level) => byLevel.get(level) as TutorVerificationLevelEntity,
    );
  }

  async getLevel(
    userId: string,
    level: TutorVerificationLevel,
  ): Promise<TutorVerificationLevelEntity | null> {
    return this.levelRepo.findOne({ where: { tutorUserId: userId, level } });
  }

  getOrCreateProfile(userId: string, policyVersion: string): Promise<TutorProfileEntity> {
    return this.resolveProfile(userId, policyVersion);
  }

  /**
   * Recomputes the derived profile status (and verified/expiry stamps) from the
   * level rows. Losing approval clears `verified_at`, drops the expiry stamp and
   * unpublishes the profile so expired/revoked verification can never silently
   * retain discovery eligibility.
   */
  async recomputeDerivedStatus(userId: string, policyVersion: string): Promise<TutorProfileEntity> {
    const profile = await this.resolveProfile(userId, policyVersion);
    const levels = await this.ensureLevels(userId, policyVersion);
    const statuses: VerificationLevelStatus[] = levels.map((row) => row.status);
    const overall = overallStatusFromLevels(statuses);
    const expiries = levels
      .filter((row) => row.status === 'approved' && row.expiresAt)
      .map((row) => (row.expiresAt as Date).getTime());
    const earliestExpiry = expiries.length > 0 ? new Date(Math.min(...expiries)) : null;

    profile.verificationStatus = overall;
    profile.verificationPolicyVersion = policyVersion;
    profile.verificationExpiresAt = overall === 'approved' ? earliestExpiry : null;
    if (overall === 'approved') {
      profile.verifiedAt = profile.verifiedAt ?? new Date();
      await this.profileRepo.manager.query(
        `UPDATE users SET status = 'active', email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1 AND status = 'pending_verification'`,
        [userId],
      );
    } else {
      profile.verifiedAt = null;
      if (
        profile.publicationStatus === 'published' &&
        overall !== 'submitted' &&
        overall !== 'under_review'
      ) {
        profile.publicationStatus = 'unpublished';
      }
    }
    profile.profileUpdatedAt = new Date();
    return this.profileRepo.save(profile);
  }

  private async resolveProfile(userId: string, policyVersion: string): Promise<TutorProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (profile) return profile;
    const created = this.profileRepo.create({
      userId,
      verificationStatus: 'not_submitted',
      publicationStatus: 'draft',
      currency: 'BDT',
      teachingModes: [],
      verificationPolicyVersion: policyVersion,
    });
    return this.profileRepo.save(created);
  }
}
