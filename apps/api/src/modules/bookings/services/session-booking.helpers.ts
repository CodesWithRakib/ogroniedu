import { ConflictException, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type {
  NotificationEventType,
  NotificationRole,
} from '@ogroniedu/contracts';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import type { NotificationService } from '../../notifications/notification.service';

/**
 * Shared session-booking helpers (single source of truth).
 * Used by SessionSchedulingService and SessionReschedulingService so the
 * overlap invariant, outbox shape, and notification behavior cannot drift.
 * Pure functions: repositories/services are passed as arguments (no DI, no cycles).
 */

export const ACTIVE_SESSION_STATUSES = ['scheduled', 'in_progress'] as const;

/**
 * Invariant: at most one overlapping active session per tutor.
 * Cancelled and completed sessions are excluded from the check.
 */
export async function assertNoTutorOverlap(
  sessionRepo: Repository<BookingSessionEntity>,
  tutorUserId: string,
  startsAt: Date,
  endsAt: Date,
  excludeSessionId?: string,
): Promise<void> {
  const qb = sessionRepo
    .createQueryBuilder('s')
    .where('s.tutorUserId = :tutorUserId', { tutorUserId })
    .andWhere('s.status IN (:...activeStatuses)', {
      activeStatuses: [...ACTIVE_SESSION_STATUSES],
    })
    .andWhere('s.startsAt < :endsAt AND s.endsAt > :startsAt', { startsAt, endsAt });

  if (excludeSessionId) {
    qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
  }

  const collision = await qb.getOne();
  if (collision) {
    throw new ConflictException(
      'Tutor already has an active session overlapping with the requested time slot.',
    );
  }
}

/** Persist a durable outbox event within the database. */
export async function recordOutboxEvent(
  outboxRepo: Repository<OutboxEventEntity>,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<OutboxEventEntity> {
  const event = outboxRepo.create({
    eventType,
    aggregateType,
    aggregateId,
    payload,
  });
  return await outboxRepo.save(event);
}

/** Non-blocking notification dispatch (outside transaction locks). */
export function dispatchNotificationSafe(
  logger: Logger,
  notificationService: NotificationService | undefined,
  userId: string,
  eventType: NotificationEventType,
  recipientRole: NotificationRole,
  payload: Record<string, string | number>,
): void {
  const service = notificationService;
  if (!service) return;
  setImmediate(async () => {
    try {
      await service.dispatch({
        userId,
        eventType,
        recipientRole,
        payload,
      });
    } catch (err: unknown) {
      logger.warn(`Failed to dispatch notification ${eventType}: ${err}`);
    }
  });
}
