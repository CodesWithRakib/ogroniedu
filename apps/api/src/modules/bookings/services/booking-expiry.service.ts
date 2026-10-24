import type { BookingExpirySweepResult } from '../interfaces/booking-expiry.interfaces';
import {
  Injectable,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingStatusEventEntity } from '../entities/booking-status-event.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { applyBookingTransition } from '../utils/booking-lifecycle';

export const BOOKING_EXPIRY_LOCK_KEY = 913_402_308;
export const BOOKING_REQUEST_TTL_HOURS = 48;
export const BOOKING_PAYMENT_TTL_HOURS = 24;

export type { BookingExpirySweepResult } from '../interfaces/booking-expiry.interfaces';

@Injectable()
export class BookingExpiryService {
  private readonly logger = new Logger(BookingExpiryService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @InjectRepository(BookingStatusEventEntity)
    private readonly statusEventRepo?: Repository<BookingStatusEventEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  /**
   * Sweeps both overdue unaccepted booking requests (>48h) and
   * unpaid bookings awaiting escrow deposit (>24h).
   * Safe to call concurrently: protected by Postgres advisory lock when DataSource is present.
   */
  async sweepExpiredBookings(referenceDate: Date = new Date()): Promise<BookingExpirySweepResult> {
    const releaseLock = await this.acquireAdvisoryLock();
    if (!releaseLock) {
      this.logger.debug('Advisory lock held by another worker; skipping booking expiry sweep.');
      return { expiredRequests: 0, expiredPayments: 0, totalExpired: 0, skippedDueToLock: true };
    }

    try {
      const expiredRequests = await this.expireOverdueRequests(referenceDate);
      const expiredPayments = await this.expireOverduePayments(referenceDate);
      const totalExpired = expiredRequests + expiredPayments;

      if (totalExpired > 0) {
        this.logger.log(
          `Booking expiry sweep completed: ${expiredRequests} unaccepted request(s) and ${expiredPayments} unpaid booking(s) expired.`,
        );
      }

      return { expiredRequests, expiredPayments, totalExpired };
    } finally {
      await releaseLock();
    }
  }

  /**
   * Expire booking requests sitting in 'requested' state past 48 hours without tutor response.
   */
  private async expireOverdueRequests(referenceDate: Date): Promise<number> {
    const cutoff = new Date(referenceDate.getTime() - BOOKING_REQUEST_TTL_HOURS * 60 * 60 * 1000);

    const overdueRequests = await this.bookingRepo.find({
      where: {
        status: 'requested',
        createdAt: LessThanOrEqual(cutoff),
      },
      relations: { subject: true },
    });

    let count = 0;
    for (const booking of overdueRequests) {
      try {
        const transition = applyBookingTransition(booking, 'expired', {
          actorRole: 'system',
          reason: `Booking request expired after ${BOOKING_REQUEST_TTL_HOURS}h with no tutor response`,
        });

        const saved = await this.bookingRepo.save(booking);

        if (this.statusEventRepo) {
          const event = this.statusEventRepo.create({
            bookingId: saved.id,
            fromStatus: transition.from,
            toStatus: transition.to,
            actorUserId: null,
            actorRole: 'system',
            reason: `Booking request expired after ${BOOKING_REQUEST_TTL_HOURS}h with no tutor response`,
            safeMetadata: { cutoff: cutoff.toISOString(), autoExpired: true },
          });
          await this.statusEventRepo.save(event);
        }

        await this.auditService.record({
          actorUserId: booking.requesterUserId,
          action: 'booking.request_expired',
          resourceType: 'booking',
          resourceId: saved.id,
          reason: 'Request TTL elapsed',
          safeMetadata: {
            tutorUserId: booking.tutorUserId,
            studentUserId: booking.studentUserId,
            subjectId: booking.subjectId,
            createdAt: booking.createdAt.toISOString(),
          },
        });

        if (this.notificationService) {
          try {
            await this.notificationService.dispatch({
              userId: booking.requesterUserId,
              eventType: 'booking.cancelled',
              recipientRole: booking.requesterUserId === booking.studentUserId ? 'student' : 'guardian',
              payload: {
                bookingId: booking.id,
                subjectName: booking.subject?.nameEn || 'Tutoring Request',
                reason: `Request expired: Tutor did not respond within ${BOOKING_REQUEST_TTL_HOURS} hours.`,
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to dispatch expiry notification to requester: ${err}`);
          }
        }

        count++;
      } catch (err) {
        this.logger.error(`Failed to expire booking request ${booking.id}: ${String(err)}`);
      }
    }

    return count;
  }

  /**
   * Expire bookings in 'awaiting_payment' where student/guardian did not fund escrow within 24 hours.
   */
  private async expireOverduePayments(referenceDate: Date): Promise<number> {
    const cutoff = new Date(referenceDate.getTime() - BOOKING_PAYMENT_TTL_HOURS * 60 * 60 * 1000);

    const overduePayments = await this.bookingRepo.find({
      where: {
        status: 'awaiting_payment',
        updatedAt: LessThanOrEqual(cutoff),
      },
      relations: { subject: true },
    });

    let count = 0;
    for (const booking of overduePayments) {
      try {
        const transition = applyBookingTransition(booking, 'expired', {
          actorRole: 'system',
          reason: `Booking expired after ${BOOKING_PAYMENT_TTL_HOURS}h payment window elapsed without escrow completion`,
        });

        const saved = await this.bookingRepo.save(booking);

        if (this.statusEventRepo) {
          const event = this.statusEventRepo.create({
            bookingId: saved.id,
            fromStatus: transition.from,
            toStatus: transition.to,
            actorUserId: null,
            actorRole: 'system',
            reason: `Booking expired after ${BOOKING_PAYMENT_TTL_HOURS}h payment window elapsed without escrow completion`,
            safeMetadata: { cutoff: cutoff.toISOString(), autoExpired: true },
          });
          await this.statusEventRepo.save(event);
        }

        await this.auditService.record({
          actorUserId: booking.requesterUserId,
          action: 'booking.payment_window_expired',
          resourceType: 'booking',
          resourceId: saved.id,
          reason: 'Payment TTL elapsed',
          safeMetadata: {
            tutorUserId: booking.tutorUserId,
            studentUserId: booking.studentUserId,
            subjectId: booking.subjectId,
            updatedAt: booking.updatedAt.toISOString(),
          },
        });

        if (this.notificationService) {
          try {
            await this.notificationService.dispatch({
              userId: booking.requesterUserId,
              eventType: 'booking.cancelled',
              recipientRole: booking.requesterUserId === booking.studentUserId ? 'student' : 'guardian',
              payload: {
                bookingId: booking.id,
                subjectName: booking.subject?.nameEn || 'Tutoring Session',
                reason: `Booking expired: Escrow deposit was not completed within ${BOOKING_PAYMENT_TTL_HOURS} hours.`,
              },
            });
            await this.notificationService.dispatch({
              userId: booking.tutorUserId,
              eventType: 'booking.cancelled',
              recipientRole: 'tutor',
              payload: {
                bookingId: booking.id,
                subjectName: booking.subject?.nameEn || 'Tutoring Session',
                reason: `Booking expired: Escrow deposit was not completed within ${BOOKING_PAYMENT_TTL_HOURS} hours.`,
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to dispatch payment window expiry notification: ${err}`);
          }
        }

        count++;
      } catch (err) {
        this.logger.error(`Failed to expire unpaid booking ${booking.id}: ${String(err)}`);
      }
    }

    return count;
  }

  private async acquireAdvisoryLock(): Promise<(() => Promise<void>) | null> {
    if (!this.dataSource?.isInitialized) {
      return async () => {};
    }
    try {
      const rows = (await this.dataSource.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [BOOKING_EXPIRY_LOCK_KEY],
      )) as Array<{ locked: boolean }>;

      if (!rows?.[0]?.locked) return null;

      return async () => {
        try {
          await this.dataSource?.query('SELECT pg_advisory_unlock($1)', [BOOKING_EXPIRY_LOCK_KEY]);
        } catch (err) {
          this.logger.warn(`Failed to release advisory lock ${BOOKING_EXPIRY_LOCK_KEY}: ${String(err)}`);
        }
      };
    } catch {
      return async () => {};
    }
  }
}
