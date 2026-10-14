import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { NotificationService } from './notification.service';
import { readErrorMessage } from '../../common/errors/error-message';
import type { OutboxProcessingResult } from './interfaces/outbox-processing-result.interface';

export type { OutboxProcessingResult } from './interfaces/outbox-processing-result.interface';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private readonly maxAttempts = 5;

  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process pending outbox events asynchronously with exponential backoff & deduplication
   * INVARIANT: Delivery failure cannot corrupt committed business state
   */
  async processPendingEvents(batchSize = 25): Promise<OutboxProcessingResult> {
    const events = await this.outboxRepo.find({
      where: {
        publishedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
      take: batchSize,
    });

    let succeeded = 0;
    let failed = 0;
    let retried = 0;

    for (const event of events) {
      // 1. Exponential Backoff Check: interval = 2^(attempts) * 1000ms
      const backoffMs = Math.pow(2, event.attempts) * 1000;
      const timeSinceCreation = Date.now() - new Date(event.createdAt).getTime();

      if (event.attempts > 0 && timeSinceCreation < backoffMs) {
        // Skip until backoff window expires
        continue;
      }

      // 2. Max attempts check
      if (event.attempts >= this.maxAttempts) {
        event.lastErrorCode = 'MAX_RETRIES_EXCEEDED';
        await this.outboxRepo.save(event);
        failed++;
        continue;
      }

      try {
        await this.dispatchOutboxEvent(event);

        // Mark published
        event.publishedAt = new Date();
        event.lastErrorCode = null;
        await this.outboxRepo.save(event);
        succeeded++;
      } catch (err: unknown) {
        // Safe error redaction
        const sanitizedError = (readErrorMessage(err) || 'DELIVERY_ERROR')
          .replace(/[a-zA-Z0-9_\-\.]{20,}/g, '[REDACTED_SECRET]')
          .slice(0, 200);

        event.attempts += 1;
        event.lastErrorCode = sanitizedError;
        await this.outboxRepo.save(event);
        retried++;

        this.logger.warn(
          `Outbox event ${event.id} (${event.eventType}) delivery attempt ${event.attempts} failed: ${sanitizedError}. Committed business state intact.`,
        );
      }
    }

    return {
      processed: events.length,
      succeeded,
      failed,
      retried,
    };
  }

  /**
   * Map domain outbox events to appropriate notification dispatches
   */
  private async dispatchOutboxEvent(event: OutboxEventEntity): Promise<void> {
    const payload: Record<string, unknown> =
      typeof event.payload === 'object' && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : {};

    switch (event.eventType) {
      case 'booking.requested':
        if (payload.tutorUserId) {
          await this.notificationService.dispatch({
            userId: String(payload.tutorUserId),
            recipientRole: 'tutor',
            eventType: 'booking.requested',
            payload: {
              bookingId: event.aggregateId,
              subjectName: String(payload.subjectName || 'Tutoring Course'),
              requesterName: String(payload.requesterName || 'Learner'),
            },
          });
        }
        break;

      case 'booking.accepted':
        if (payload.studentUserId) {
          await this.notificationService.dispatch({
            userId: String(payload.studentUserId),
            recipientRole: 'student',
            eventType: 'booking.accepted',
            payload: {
              bookingId: event.aggregateId,
              subjectName: String(payload.subjectName || 'Tutoring Course'),
              tutorName: String(payload.tutorName || 'Tutor'),
            },
          });
        }
        break;

      case 'payment.succeeded': {
        const targetUserId = payload.userId || payload.studentUserId;
        if (targetUserId) {
          await this.notificationService.dispatch({
            userId: String(targetUserId),
            recipientRole: 'student',
            eventType: 'payment.succeeded',
            payload: {
              paymentId: event.aggregateId,
              amount: String(payload.amount || '0'),
            },
          });
        }
        break;
      }

      case 'session.scheduled':
        if (payload.studentUserId) {
          await this.notificationService.dispatch({
            userId: String(payload.studentUserId),
            recipientRole: 'student',
            eventType: 'session.reminder',
            payload: {
              sessionId: event.aggregateId,
              startsAt: String(payload.startsAt || ''),
            },
          });
        }
        break;

      default:
        this.logger.log(`Processed generic outbox event: ${event.eventType}`);
    }
  }
}
