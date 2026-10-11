import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  NotificationEventType,
  NotificationRole,
} from '@ogroniedu/contracts';
import {
  BookingSessionEntity,
  CancellationAssessment,
} from '../entities/booking-session.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import {
  RescheduleSessionDto,
  CancelSessionDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SessionQueriesService } from './session-queries.service';

/**
 * Reschedule and cancel flows: status transition guards and the
 * Bangladesh operational cancellation-policy matrix stay intact.
 * Authorization is delegated to SessionQueriesService (no cycles).
 */
@Injectable()
export class SessionReschedulingService {
  private readonly logger = new Logger(SessionReschedulingService.name);

  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService: NotificationService | undefined,
    @Inject(forwardRef(() => SessionQueriesService))
    private readonly queries: SessionQueriesService,
  ) {}

  /**
   * Reschedule an existing scheduled session
   */
  async rescheduleSession(
    sessionId: string,
    user: AuthenticatedUser,
    dto: RescheduleSessionDto,
  ): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { booking: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.booking) {
      await this.queries.assertCanManageSessions(user, session.booking);
    }

    if (session.status !== 'scheduled' && session.status !== 'reschedule_pending') {
      throw new BadRequestException(
        `Cannot reschedule session with current status '${session.status}'.`,
      );
    }

    const newStartsAt = new Date(dto.newStartsAt);
    if (isNaN(newStartsAt.getTime())) {
      throw new BadRequestException('Invalid newStartsAt timestamp.');
    }

    const durationMs = session.endsAt.getTime() - session.startsAt.getTime();
    const newEndsAt = dto.newEndsAt
      ? new Date(dto.newEndsAt)
      : new Date(newStartsAt.getTime() + durationMs);

    if (isNaN(newEndsAt.getTime()) || newEndsAt <= newStartsAt) {
      throw new BadRequestException('New end time must be strictly after start time.');
    }

    if (newStartsAt < new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time slot.');
    }

    // Check overlap excluding this session id
    await this.assertNoTutorOverlap(session.tutorUserId, newStartsAt, newEndsAt, session.id);

    session.startsAt = newStartsAt;
    session.endsAt = newEndsAt;
    session.status = 'scheduled';

    const saved = await this.sessionRepo.save(session);

    await this.recordOutboxEvent('session.rescheduled', 'session', saved.id, {
      sessionId: saved.id,
      newStartsAt: saved.startsAt.toISOString(),
      newEndsAt: saved.endsAt.toISOString(),
      reason: dto.reason,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.rescheduled',
      resourceType: 'booking_session',
      resourceId: saved.id,
      reason: dto.reason,
    });

    this.dispatchNotificationSafe(session.tutorUserId, 'booking.confirmed', 'tutor', {
      bookingId: session.bookingId,
      subjectName: 'Rescheduled Session',
    });

    return saved;
  }

  /**
   * Cancel a scheduled session applying the Bangladesh operational refund matrix
   * When a session is cancelled, status becomes 'cancelled', immediately freeing the GiST slot for reuse.
   */
  async cancelSession(
    sessionId: string,
    user: AuthenticatedUser,
    dto: CancelSessionDto,
  ): Promise<{ session: BookingSessionEntity; policyAssessment: CancellationAssessment }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { booking: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.booking) {
      await this.queries.assertCanManageSessions(user, session.booking);
    }

    if (session.status !== 'scheduled' && session.status !== 'reschedule_pending') {
      throw new BadRequestException(
        `Cannot cancel session with current status '${session.status}'.`,
      );
    }

    // Determine initiator role
    const isTutor = user.id === session.tutorUserId;
    const initiatedByRole = isTutor
      ? 'tutor'
      : user.roles?.includes('guardian')
        ? 'guardian'
        : 'student';

    // Calculate lead time in hours
    const now = new Date();
    const leadHours = Math.max(0, (session.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Apply Operational Policy Matrix (docs/BUSINESS_RULES.md Section 2)
    let assessment: CancellationAssessment;

    if (isTutor) {
      if (leadHours >= 24) {
        assessment = {
          initiatedByRole: 'tutor',
          leadHours: Math.round(leadHours * 10) / 10,
          refundPercentage: 100,
          tutorCompensationPercentage: 0,
          penaltyNotice: '1 reliability point deducted',
          reason: dto.reason,
          assessedAt: now.toISOString(),
        };
      } else {
        assessment = {
          initiatedByRole: 'tutor',
          leadHours: Math.round(leadHours * 10) / 10,
          refundPercentage: 100,
          tutorCompensationPercentage: 0,
          penaltyNotice: '3 reliability points deducted + warning',
          reason: dto.reason,
          assessedAt: now.toISOString(),
        };
      }
    } else {
      // Guardian or Student
      if (leadHours >= 24) {
        assessment = {
          initiatedByRole,
          leadHours: Math.round(leadHours * 10) / 10,
          refundPercentage: 100,
          tutorCompensationPercentage: 0,
          penaltyNotice: 'none',
          reason: dto.reason,
          assessedAt: now.toISOString(),
        };
      } else if (leadHours >= 4) {
        assessment = {
          initiatedByRole,
          leadHours: Math.round(leadHours * 10) / 10,
          refundPercentage: 80,
          tutorCompensationPercentage: 20,
          penaltyNotice: 'none',
          reason: dto.reason,
          assessedAt: now.toISOString(),
        };
      } else {
        assessment = {
          initiatedByRole,
          leadHours: Math.round(leadHours * 10) / 10,
          refundPercentage: 0,
          tutorCompensationPercentage: 80,
          penaltyNotice: 'Late cancellation recorded on history',
          reason: dto.reason,
          assessedAt: now.toISOString(),
        };
      }
    }

    session.status = 'cancelled';
    session.cancellationAssessment = assessment;

    const saved = await this.sessionRepo.save(session);

    // Persist outbox event
    await this.recordOutboxEvent('session.cancelled', 'session', saved.id, {
      sessionId: saved.id,
      bookingId: session.bookingId,
      leadHours: assessment.leadHours,
      refundPercentage: assessment.refundPercentage,
      reason: dto.reason,
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.cancelled',
      resourceType: 'booking_session',
      resourceId: saved.id,
      reason: dto.reason,
      safeMetadata: assessment as unknown as Record<string, unknown>,
    });

    // Notify other participant
    const notifyRecipientId = isTutor ? session.studentUserId : session.tutorUserId;
    const recipientRole = isTutor ? 'student' : 'tutor';
    this.dispatchNotificationSafe(notifyRecipientId, 'booking.cancelled', recipientRole, {
      bookingId: session.bookingId,
      reason: dto.reason,
    });

    return { session: saved, policyAssessment: assessment };
  }

  // ---------------------------------------------------------------------------
  // Internal Invariant Protections & Helpers
  // ---------------------------------------------------------------------------

  /**
   * Invariant: At most one overlapping active session per tutor.
   * Cancelled and completed sessions are excluded from the check.
   */
  private async assertNoTutorOverlap(
    tutorUserId: string,
    startsAt: Date,
    endsAt: Date,
    excludeSessionId?: string,
  ): Promise<void> {
    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .where('s.tutorUserId = :tutorUserId', { tutorUserId })
      .andWhere('s.status IN (:...activeStatuses)', {
        activeStatuses: ['scheduled', 'in_progress'],
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

  /**
   * Persist durable outbox event within the database
   */
  private async recordOutboxEvent(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<OutboxEventEntity> {
    const event = this.outboxRepo.create({
      eventType,
      aggregateType,
      aggregateId,
      payload,
    });
    return await this.outboxRepo.save(event);
  }

  /**
   * Non-blocking notification dispatch (outside transaction locks)
   */
  private dispatchNotificationSafe(
    userId: string,
    eventType: NotificationEventType,
    recipientRole: NotificationRole,
    payload: Record<string, string | number>,
  ): void {
    const service = this.notificationService;
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
        this.logger.warn(`Failed to dispatch notification ${eventType}: ${err}`);
      }
    });
  }
}
