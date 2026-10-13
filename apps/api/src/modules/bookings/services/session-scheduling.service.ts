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
import { BookingEntity } from '../entities/booking.entity';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import {
  assertNoTutorOverlap,
  recordOutboxEvent,
  dispatchNotificationSafe,
} from './session-booking.helpers';
import {
  CreateSessionDto,
  CreateRecurringSessionsDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SessionQueriesService } from './session-queries.service';

/**
 * One-off and recurring session creation with conflict detection intact.
 * Authorization is delegated to SessionQueriesService (no cycles).
 */
@Injectable()
export class SessionSchedulingService {
  private readonly logger = new Logger(SessionSchedulingService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
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
   * Schedule a single one-off session within an active booking
   * Enforces: Timezone intent (Asia/Dhaka UTC+6), zero overlap invariant,
   *           participant authorization, and outbox event persistence.
   */
  async scheduleSession(
    user: AuthenticatedUser,
    dto: CreateSessionDto,
  ): Promise<BookingSessionEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { subject: true, educationLevel: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${dto.bookingId}`);
    }

    // 1. Authorization check
    await this.queries.assertCanManageSessions(user, booking);

    // 2. Booking status check
    const allowedStatuses = [
      'requested',
      'accepted',
      'awaiting_payment',
      'confirmed',
      'in_progress',
    ];
    if (!allowedStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot schedule sessions for booking with status '${booking.status}'.`,
      );
    }

    // 3. Time calculation & validation
    const startsAt = new Date(dto.startsAt);
    if (isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid startsAt timestamp.');
    }

    const durationMinutes = dto.durationMinutes || booking.durationMinutes || 60;
    const endsAt = dto.endsAt
      ? new Date(dto.endsAt)
      : new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    if (isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Session end time must be strictly after start time.');
    }

    // Prevent scheduling in the past (allow a 5-minute clock drift margin)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (startsAt < fiveMinutesAgo) {
      throw new BadRequestException('Cannot schedule tutoring sessions in the past.');
    }

    // 4. Overlap & Conflict Check (Definition of Done: At most one overlapping active session per tutor)
    await assertNoTutorOverlap(this.sessionRepo, booking.tutorUserId, startsAt, endsAt);

    // 5. Build and save session
    const session = this.sessionRepo.create({
      bookingId: booking.id,
      tutorUserId: booking.tutorUserId,
      studentUserId: booking.studentUserId,
      startsAt,
      endsAt,
      timezone: dto.timezone || 'Asia/Dhaka',
      status: 'scheduled',
      meetingUrl: dto.meetingUrl || null,
      locationInstructions: dto.locationInstructions || null,
    });

    let savedSession: BookingSessionEntity;
    try {
      savedSession = await this.sessionRepo.save(session);
    } catch (err: unknown) {
      // Catch PostgreSQL GiST exclusion constraint violation ('ex_tutor_session_overlap' / 23P01)
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : '';
      if (code === '23P01' || message.includes('ex_tutor_session_overlap')) {
        throw new ConflictException(
          'Tutor already has an active session overlapping with the requested time slot (concurrency constraint enforced).',
        );
      }
      throw err;
    }

    // 6. Update booking status to confirmed if awaiting payment / accepted
    if (['accepted', 'awaiting_payment'].includes(booking.status)) {
      booking.status = 'confirmed';
      await this.bookingRepo.save(booking);
    }

    // 7. Persist Outbox Event (Durable transactional outbox pattern)
    await recordOutboxEvent(this.outboxRepo, 'session.scheduled', 'session', savedSession.id, {
      sessionId: savedSession.id,
      bookingId: booking.id,
      tutorUserId: booking.tutorUserId,
      studentUserId: booking.studentUserId,
      startsAt: savedSession.startsAt.toISOString(),
      endsAt: savedSession.endsAt.toISOString(),
      timezone: savedSession.timezone,
      meetingUrl: savedSession.meetingUrl,
    });

    // 8. Global Audit Trail
    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.scheduled',
      resourceType: 'booking_session',
      resourceId: savedSession.id,
      safeMetadata: {
        bookingId: booking.id,
        startsAt: savedSession.startsAt,
        endsAt: savedSession.endsAt,
      },
    });

    // 9. Dispatch Non-Blocking Notification
    dispatchNotificationSafe(
      this.logger,
      this.notificationService,
      booking.tutorUserId,
      'booking.confirmed',
      'tutor',
      {
        bookingId: booking.id,
        subjectName: booking.subject?.nameEn || 'Tutoring Session',
      },
    );

    return savedSession;
  }

  /**
   * Schedule recurring weekly sessions atomically
   */
  async scheduleRecurringSessions(
    user: AuthenticatedUser,
    dto: CreateRecurringSessionsDto,
  ): Promise<BookingSessionEntity[]> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${dto.bookingId}`);
    }

    await this.queries.assertCanManageSessions(user, booking);

    if (!dto.scheduleSlots || dto.scheduleSlots.length === 0) {
      throw new BadRequestException('At least one weekly schedule slot is required.');
    }

    const count = dto.count || 4;
    const timezone = dto.timezone || 'Asia/Dhaka';
    const startDate = new Date(dto.startDate + 'T00:00:00+06:00');

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid startDate format (expected YYYY-MM-DD).');
    }

    // Generate batch of slots
    const generatedSessions: BookingSessionEntity[] = [];
    let currentDate = new Date(startDate.getTime());
    const targetDays = dto.scheduleSlots.map((s) => s.weekday);

    while (generatedSessions.length < count) {
      // Compute weekday in Asia/Dhaka (+06:00)
      const dhakaTime = new Date(currentDate.getTime() + 6 * 3600 * 1000);
      const weekday = dhakaTime.getUTCDay();

      if (targetDays.includes(weekday)) {
        const slot = dto.scheduleSlots.find((s) => s.weekday === weekday);
        if (slot) {
          const dateStr = currentDate.toISOString().slice(0, 10);
          const startsAt = new Date(`${dateStr}T${slot.startLocal}:00+06:00`);
          const duration = slot.durationMinutes || booking.durationMinutes || 60;
          const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);

          // Verify no conflict with existing active sessions
          await assertNoTutorOverlap(this.sessionRepo, booking.tutorUserId, startsAt, endsAt);

          // Verify no internal collision within this generated batch
          for (const existing of generatedSessions) {
            if (startsAt < existing.endsAt && endsAt > existing.startsAt) {
              throw new ConflictException(
                'Internal conflict detected among recurring schedule slots.',
              );
            }
          }

          generatedSessions.push(
            this.sessionRepo.create({
              bookingId: booking.id,
              tutorUserId: booking.tutorUserId,
              studentUserId: booking.studentUserId,
              startsAt,
              endsAt,
              timezone,
              status: 'scheduled',
              meetingUrl: dto.meetingUrl || null,
              locationInstructions: dto.locationInstructions || null,
            }),
          );
        }
      }

      // Advance by 1 day
      currentDate = new Date(currentDate.getTime() + 24 * 3600 * 1000);
    }

    // Persist batch atomically
    const saved = await this.sessionRepo.save(generatedSessions);

    // Update booking status
    if (['accepted', 'awaiting_payment'].includes(booking.status)) {
      booking.status = 'confirmed';
      await this.bookingRepo.save(booking);
    }

    // Record outbox events & audit for each generated session
    for (const s of saved) {
      await recordOutboxEvent(this.outboxRepo, 'session.scheduled', 'session', s.id, {
        sessionId: s.id,
        bookingId: booking.id,
        startsAt: s.startsAt.toISOString(),
      });
    }

    await this.auditService.record({
      actorUserId: user.id,
      action: 'sessions.recurring.scheduled',
      resourceType: 'booking',
      resourceId: booking.id,
      safeMetadata: { count: saved.length },
    });

    return saved;
  }
}
