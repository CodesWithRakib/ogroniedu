import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSessionEntity, CancellationAssessment } from '../entities/booking-session.entity';
import { BookingEntity } from '../entities/booking.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { TutorAvailabilityService } from '../../tutors/services/tutor-availability.service';
import {
  assertNoTutorOverlap,
  recordOutboxEvent,
  dispatchNotificationSafe,
} from './session-booking.helpers';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { RescheduleSessionDto, CancelSessionDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SessionQueriesService } from './session-queries.service';
import { assessCancellation, CancellationInitiator } from '../utils/cancellation-policy';
import { applyBookingTransition } from '../utils/booking-lifecycle';
import {
  CANCELLABLE_SESSION_STATUSES,
  RESCHEDULABLE_SESSION_STATUSES,
  assertSessionTransition,
} from '../constants/session-status-transitions';

/**
 * Reschedule, cancel, start, complete, and meeting-url flows.
 * Every state change passes through the session transition map and records
 * actor/reason/timestamp. Cancellation produces an assessment only; no money
 * moves in this phase.
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
    @Optional()
    @Inject(forwardRef(() => TutorAvailabilityService))
    private readonly availability?: TutorAvailabilityService,
    @Optional()
    @InjectRepository(BookingEntity)
    private readonly bookingRepo?: Repository<BookingEntity>,
    @Optional()
    @Inject(forwardRef(() => GuardianAccessService))
    private readonly guardianAccess?: GuardianAccessService,
  ) {}

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

    if (!(RESCHEDULABLE_SESSION_STATUSES as readonly string[]).includes(session.status)) {
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

    if (this.availability) {
      await this.availability.assertWithinAvailability(session.tutorUserId, newStartsAt, newEndsAt);
    }

    await assertNoTutorOverlap(
      this.sessionRepo,
      session.tutorUserId,
      newStartsAt,
      newEndsAt,
      session.id,
    );

    const previousStartsAt = session.startsAt;
    assertSessionTransition(session.status, 'scheduled');
    session.startsAt = newStartsAt;
    session.endsAt = newEndsAt;
    session.status = 'scheduled';
    session.rescheduledAt = new Date();
    session.rescheduledBy = user.id;
    session.rescheduleReason = dto.reason;
    session.statusChangedAt = new Date();
    session.statusChangedBy = user.id;
    session.version += 1;
    // A rescheduled session needs a fresh reminder window; the previous
    // reminder flag must not suppress it.
    session.reminderSentAt = null;

    const saved = await this.sessionRepo.save(session);

    await recordOutboxEvent(
      this.outboxRepo,
      'session.rescheduled',
      'session',
      saved.id,
      {
        sessionId: saved.id,
        bookingId: saved.bookingId,
        previousStartsAt: previousStartsAt.toISOString(),
        newStartsAt: saved.startsAt.toISOString(),
        newEndsAt: saved.endsAt.toISOString(),
        reason: dto.reason,
      },
      `session.rescheduled:${saved.id}:${saved.version}`,
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.rescheduled',
      resourceType: 'booking_session',
      resourceId: saved.id,
      reason: dto.reason,
      safeMetadata: {
        previousStartsAt,
        newStartsAt,
        newEndsAt,
      },
    });

    const notifyRecipientId =
      user.id === session.tutorUserId ? session.studentUserId : session.tutorUserId;
    const recipientRole = user.id === session.tutorUserId ? 'student' : 'tutor';
    dispatchNotificationSafe(
      this.logger,
      this.notificationService,
      notifyRecipientId,
      'booking.confirmed',
      recipientRole,
      {
        bookingId: session.bookingId,
        subjectName: 'Rescheduled Session',
      },
    );

    return saved;
  }

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

    if (!(CANCELLABLE_SESSION_STATUSES as readonly string[]).includes(session.status)) {
      throw new BadRequestException(
        `Cannot cancel session with current status '${session.status}'.`,
      );
    }

    const initiator = this.resolveInitiator(user, session);
    const now = new Date();
    const assessment = assessCancellation({
      initiator,
      startsAt: session.startsAt,
      now,
      reason: dto.reason,
    });

    assertSessionTransition(session.status, 'cancelled');
    session.status = 'cancelled';
    session.cancellationAssessment = assessment;
    session.cancelledAt = now;
    session.cancellationReason = dto.reason;
    session.statusChangedAt = now;
    session.statusChangedBy = user.id;
    session.version += 1;

    const saved = await this.sessionRepo.save(session);

    await recordOutboxEvent(
      this.outboxRepo,
      'session.cancelled',
      'session',
      saved.id,
      {
        sessionId: saved.id,
        bookingId: session.bookingId,
        leadHours: assessment.leadHours,
        refundPercentage: assessment.refundPercentage,
        reason: dto.reason,
      },
      `session.cancelled:${saved.id}`,
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.cancelled',
      resourceType: 'booking_session',
      resourceId: saved.id,
      reason: dto.reason,
      safeMetadata: assessment as unknown as Record<string, unknown>,
    });

    const notifyRecipientId =
      user.id === session.tutorUserId ? session.studentUserId : session.tutorUserId;
    const recipientRole = user.id === session.tutorUserId ? 'student' : 'tutor';
    dispatchNotificationSafe(
      this.logger,
      this.notificationService,
      notifyRecipientId,
      'booking.cancelled',
      recipientRole,
      {
        bookingId: session.bookingId,
        reason: dto.reason,
      },
    );

    return { session: saved, policyAssessment: assessment };
  }

  async startSession(sessionId: string, user: AuthenticatedUser): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { booking: { subject: true } },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Only the delivering tutor (or platform admin) may start a session.
    // Students/guardians must never flip the lifecycle state.
    const isTutor = user.id === session.tutorUserId;
    const isAdmin = user.roles.some((r) => ['admin', 'super_admin'].includes(r));
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or an administrator can start a session.',
      );
    }

    if (session.booking && !['confirmed', 'in_progress'].includes(session.booking.status)) {
      throw new BadRequestException(
        `Cannot start a session for a booking in status '${session.booking.status}'.`,
      );
    }

    if (session.status === 'in_progress') {
      return session;
    }

    assertSessionTransition(session.status, 'in_progress');
    const now = new Date();
    session.status = 'in_progress';
    session.actualStartedAt = session.actualStartedAt ?? now;
    session.statusChangedAt = now;
    session.statusChangedBy = user.id;
    const saved = await this.sessionRepo.save(session);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.started',
      resourceType: 'booking_session',
      resourceId: saved.id,
      safeMetadata: { actualStartedAt: saved.actualStartedAt?.toISOString() },
    });

    const guardianUserIds =
      (await this.guardianAccess?.findActiveGuardianIds(saved.studentUserId)) ?? [];
    await this.recordLifecycleEvent('session.started', saved, {
      subjectName: saved.booking?.subject?.nameEn || 'Tutoring Session',
      startTime: saved.startsAt.toISOString(),
      guardianUserIds,
    });

    return saved;
  }

  async completeSession(
    sessionId: string,
    user: AuthenticatedUser,
    notes?: string,
  ): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { booking: { subject: true } },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const isTutor = user.id === session.tutorUserId;
    const isAdmin = user.roles.some((r) => ['admin', 'super_admin'].includes(r));
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can mark a session as completed.',
      );
    }

    // Repeated completion is a no-op: no second audit/outbox/financial signal.
    if (session.status === 'completed') {
      return session;
    }

    if (!session.actualStartedAt) {
      throw new BadRequestException('A session must be started before it can be completed.');
    }

    assertSessionTransition(session.status, 'completed');
    const now = new Date();
    if (now < new Date(session.actualStartedAt)) {
      throw new BadRequestException('Completion time cannot precede the actual start time.');
    }

    session.status = 'completed';
    session.completedAt = now;
    session.statusChangedAt = now;
    session.statusChangedBy = user.id;
    const saved = await this.sessionRepo.save(session);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.completed',
      resourceType: 'booking_session',
      resourceId: saved.id,
      reason: notes,
      safeMetadata: {
        actualStartedAt: saved.actualStartedAt?.toISOString() ?? null,
        completedAt: saved.completedAt?.toISOString() ?? null,
      },
    });

    await this.maybeCompleteBooking(session.bookingId, user, notes);

    const guardianUserIds =
      (await this.guardianAccess?.findActiveGuardianIds(saved.studentUserId)) ?? [];
    await this.recordLifecycleEvent('session.completed', saved, {
      subjectName: saved.booking?.subject?.nameEn || 'Tutoring Session',
      guardianUserIds,
    });

    return saved;
  }

  /**
   * Durable lifecycle event with a per-session idempotency key. A duplicate
   * insert (already emitted) is ignored rather than surfaced to the caller.
   */
  private async recordLifecycleEvent(
    eventType: 'session.started' | 'session.completed',
    session: BookingSessionEntity,
    extra: Record<string, unknown>,
  ): Promise<void> {
    try {
      await recordOutboxEvent(
        this.outboxRepo,
        eventType,
        'session',
        session.id,
        {
          sessionId: session.id,
          bookingId: session.bookingId,
          tutorUserId: session.tutorUserId,
          studentUserId: session.studentUserId,
          ...extra,
        },
        `${eventType}:${session.id}`,
      );
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
      if (code !== '23505') {
        this.logger.warn(`Could not record ${eventType} for ${session.id}: ${String(err)}`);
      }
    }
  }

  async updateMeetingUrl(
    sessionId: string,
    user: AuthenticatedUser,
    meetingUrl: string,
  ): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const isTutor = user.id === session.tutorUserId;
    const isAdmin = user.roles.some((r) => ['admin', 'super_admin'].includes(r));
    if (!isTutor && !isAdmin) {
      throw new BadRequestException('Only the assigned tutor or admin can set the meeting URL.');
    }

    if (!['scheduled', 'reschedule_pending', 'in_progress'].includes(session.status)) {
      throw new BadRequestException(
        `Cannot update the meeting URL for a session in status '${session.status}'.`,
      );
    }

    session.meetingUrl = meetingUrl;
    const saved = await this.sessionRepo.save(session);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.meeting_url_updated',
      resourceType: 'booking_session',
      resourceId: saved.id,
      safeMetadata: { meetingUrl },
    });

    return saved;
  }

  /**
   * When no active sessions remain, move the booking to `completed` through
   * the transition map. Failures here never undo the session completion.
   */
  private async maybeCompleteBooking(
    bookingId: string,
    user: AuthenticatedUser,
    notes?: string,
  ): Promise<void> {
    if (!this.bookingRepo) return;
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) return;
    if (!['confirmed', 'in_progress'].includes(booking.status)) return;

    const remaining = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.bookingId = :bookingId', { bookingId })
      .andWhere('s.status IN (:...statuses)', {
        statuses: ['scheduled', 'in_progress', 'reschedule_pending'],
      })
      .getCount();
    if (remaining > 0) return;

    try {
      applyBookingTransition(booking, 'completed', {
        actorUserId: user.id,
        reason: notes,
      });
      await this.bookingRepo.save(booking);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'booking.completed',
        resourceType: 'booking',
        resourceId: bookingId,
        reason: notes,
      });
    } catch (err) {
      this.logger.warn(`Could not complete booking ${bookingId}: ${String(err)}`);
    }
  }

  private resolveInitiator(
    user: AuthenticatedUser,
    session: BookingSessionEntity,
  ): CancellationInitiator {
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) return 'admin';
    if (user.id === session.tutorUserId) return 'tutor';
    if (user.id === session.studentUserId) return 'student';
    return 'guardian';
  }
}
