import type { BlockedPeriodInput } from '../interfaces/tutor-availability.interfaces';
import { BadRequestException, ConflictException, Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { TutorAvailabilityEntity } from '../entities/tutor-availability.entity';
import { TutorAvailabilityExceptionEntity } from '../entities/tutor-availability-exception.entity';
import { AuditService } from '../../audit/audit.service';
import {
  assertValidTimezone,
  getZonedParts,
  isValidIanaTimezone,
  toDateString,
} from '../../bookings/utils/zoned-time';

export type {
  AvailabilitySlotInput,
  BlockedPeriodInput,
} from '../interfaces/tutor-availability.interfaces';

/**
 * Single home for tutor availability rules.
 *
 * - Weekly availability is stored in `tutor_availability`.
 * - Date-specific blocks are stored in `tutor_availability_exceptions`.
 * - `assertWithinAvailability` is the enforcement point used by scheduling and
 *   rescheduling. When a tutor has no configured weekly availability the rule
 *   is intentionally permissive (backwards compatible); once any slot exists,
 *   every session must fit inside one.
 */
@Injectable()
export class TutorAvailabilityService {
  constructor(
    @InjectRepository(TutorAvailabilityEntity)
    private readonly availabilityRepo: Repository<TutorAvailabilityEntity>,
    @InjectRepository(TutorAvailabilityExceptionEntity)
    private readonly exceptionRepo: Repository<TutorAvailabilityExceptionEntity>,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  async getAvailability(tutorUserId: string): Promise<TutorAvailabilityEntity[]> {
    return this.availabilityRepo.find({
      where: { tutorUserId, isActive: true },
      order: { weekday: 'ASC', startLocal: 'ASC' },
    });
  }

  async getBlockedPeriods(
    tutorUserId: string,
    from?: Date,
    to?: Date,
  ): Promise<TutorAvailabilityExceptionEntity[]> {
    const where: Record<string, unknown> = { tutorUserId };
    if (to) where.startsAt = LessThan(to);
    if (from) where.endsAt = MoreThan(from);
    return this.exceptionRepo.find({
      where,
      order: { startsAt: 'ASC' },
      take: 200,
    });
  }

  async addBlockedPeriod(
    tutorUserId: string,
    input: BlockedPeriodInput,
  ): Promise<TutorAvailabilityExceptionEntity> {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Blocked period end must be strictly after its start.');
    }
    const timezone = input.timezone || 'Asia/Dhaka';
    assertValidTimezone(timezone);

    const entity = this.exceptionRepo.create({
      tutorUserId,
      startsAt,
      endsAt,
      timezone,
      reason: input.reason?.trim() || null,
      createdByUserId: tutorUserId,
    });
    const saved = await this.exceptionRepo.save(entity);
    await this.auditService.record({
      actorUserId: tutorUserId,
      action: 'tutor.availability.blocked_period_added',
      resourceType: 'tutor_availability_exceptions',
      resourceId: saved.id,
      reason: input.reason,
      safeMetadata: { startsAt, endsAt, timezone },
    });
    return saved;
  }

  async removeBlockedPeriod(tutorUserId: string, id: string): Promise<void> {
    const existing = await this.exceptionRepo.findOne({ where: { id, tutorUserId } });
    if (!existing) {
      throw new BadRequestException('Blocked period not found.');
    }
    await this.exceptionRepo.delete({ id, tutorUserId });
    await this.auditService.record({
      actorUserId: tutorUserId,
      action: 'tutor.availability.blocked_period_removed',
      resourceType: 'tutor_availability_exceptions',
      resourceId: id,
      safeMetadata: { startsAt: existing.startsAt, endsAt: existing.endsAt },
    });
  }

  /**
   * Enforce weekly availability + blocked periods for an instant range.
   * Throws `ConflictException` with a human-readable reason.
   */
  async assertWithinAvailability(tutorUserId: string, startsAt: Date, endsAt: Date): Promise<void> {
    if (endsAt <= startsAt) {
      throw new BadRequestException('Session end time must be strictly after start time.');
    }

    const block = await this.exceptionRepo
      .createQueryBuilder('e')
      .where('e.tutorUserId = :tutorUserId', { tutorUserId })
      .andWhere('e.startsAt < :endsAt AND e.endsAt > :startsAt', { startsAt, endsAt })
      .getOne();
    if (block) {
      throw new ConflictException(
        `Tutor is unavailable during this time (blocked period: ${block.reason || 'no reason provided'}).`,
      );
    }

    const slots = await this.availabilityRepo.find({
      where: { tutorUserId, isActive: true },
    });
    if (slots.length === 0) return;

    const fits = slots.some((slot) => {
      const timezone = isValidIanaTimezone(slot.timezone) ? slot.timezone : 'Asia/Dhaka';
      const startParts = getZonedParts(startsAt, timezone);
      const endParts = getZonedParts(endsAt, timezone);
      const localDate = toDateString(startParts);
      if (startParts.weekday !== slot.weekday) return false;
      if (toDateString(endParts) !== localDate) return false;
      if (slot.effectiveFrom && localDate < slot.effectiveFrom) return false;
      if (slot.effectiveUntil && localDate > slot.effectiveUntil) return false;

      const startMinutes = startParts.hour * 60 + startParts.minute;
      const endMinutes = endParts.hour * 60 + endParts.minute;
      const [slotStartH, slotStartM] = slot.startLocal.split(':').map(Number);
      const [slotEndH, slotEndM] = slot.endLocal.split(':').map(Number);
      const slotStart = slotStartH * 60 + slotStartM;
      const slotEnd = slotEndH * 60 + slotEndM;
      return startMinutes >= slotStart && endMinutes <= slotEnd;
    });

    if (!fits) {
      throw new ConflictException(
        'Requested time is outside the tutor’s published availability. Pick one of the available slots.',
      );
    }
  }
}
