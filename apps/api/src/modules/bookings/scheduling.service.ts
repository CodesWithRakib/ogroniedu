import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import {
  BookingSessionEntity,
  CancellationAssessment,
  SessionStatus,
} from './entities/booking-session.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { TutorAvailabilityEntity } from '../tutors/entities/tutor-availability.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CreateSessionDto,
  CreateRecurringSessionsDto,
  RescheduleSessionDto,
  CancelSessionDto,
  GetSessionsQueryDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export interface PublicCalendarSlot {
  startsAt: string;
  endsAt: string;
  type: 'busy' | 'available';
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @InjectRepository(TutorAvailabilityEntity)
    private readonly availabilityRepo: Repository<TutorAvailabilityEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepo: Repository<GuardianStudentLinkEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
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
    await this.assertCanManageSessions(user, booking);

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
    await this.assertNoTutorOverlap(booking.tutorUserId, startsAt, endsAt);

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
    } catch (err: any) {
      // Catch PostgreSQL GiST exclusion constraint violation ('ex_tutor_session_overlap' / 23P01)
      if (err?.code === '23P01' || err?.message?.includes('ex_tutor_session_overlap')) {
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
    await this.recordOutboxEvent('session.scheduled', 'session', savedSession.id, {
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
    this.dispatchNotificationSafe(booking.tutorUserId, 'booking.confirmed', 'tutor', {
      bookingId: booking.id,
      subjectName: booking.subject?.nameEn || 'Tutoring Session',
    });

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

    await this.assertCanManageSessions(user, booking);

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
          await this.assertNoTutorOverlap(booking.tutorUserId, startsAt, endsAt);

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
      await this.recordOutboxEvent('session.scheduled', 'session', s.id, {
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
      await this.assertCanManageSessions(user, session.booking);
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
      await this.assertCanManageSessions(user, session.booking);
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

  /**
   * List sessions accessible to current user with deterministic filters
   */
  async getSessions(
    user: AuthenticatedUser,
    query: GetSessionsQueryDto,
  ): Promise<BookingSessionEntity[]> {
    // Collect allowed student IDs for guardians
    const guardianLinks = await this.linkRepo.find({
      where: { guardianUserId: user.id, status: 'active' },
    });
    const childIds = guardianLinks.map((l) => l.studentUserId);
    const allowedStudentIds = [user.id, ...childIds];

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel');

    // Scoped ownership check
    if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
      qb.where('(session.tutorUserId = :userId OR session.studentUserId IN (:...studentIds))', {
        userId: user.id,
        studentIds: allowedStudentIds,
      });
    }

    if (query.bookingId) {
      qb.andWhere('session.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.tutorId) {
      qb.andWhere('session.tutorUserId = :tutorId', { tutorId: query.tutorId });
    }
    if (query.studentId) {
      qb.andWhere('session.studentUserId = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('session.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('session.startsAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('session.endsAt <= :to', { to: new Date(query.to) });
    }

    return await qb.orderBy('session.startsAt', 'ASC').getMany();
  }

  /**
   * Get single session with ownership check
   */
  async getSessionById(sessionId: string, user: AuthenticatedUser): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        booking: {
          subject: true,
          educationLevel: true,
        },
        tutorProfile: true,
        studentUser: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.booking) {
      await this.assertCanManageSessions(user, session.booking);
    }

    return session;
  }

  /**
   * Privacy-safe tutor calendar intervals (student PII completely excluded)
   */
  async getTutorCalendar(tutorId: string, from: Date, to: Date): Promise<PublicCalendarSlot[]> {
    const activeSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.tutorUserId = :tutorId', { tutorId })
      .andWhere('s.status IN (:...statuses)', { statuses: ['scheduled', 'in_progress'] })
      .andWhere('s.startsAt < :to AND s.endsAt > :from', { to, from })
      .orderBy('s.startsAt', 'ASC')
      .getMany();

    return activeSessions.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      type: 'busy' as const,
    }));
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
   * Ensure user is authorized to manage or view sessions for this booking
   */
  private async assertCanManageSessions(
    user: AuthenticatedUser,
    booking: BookingEntity,
  ): Promise<void> {
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
      return;
    }

    const isDirectParticipant =
      booking.tutorUserId === user.id ||
      booking.requesterUserId === user.id ||
      booking.studentUserId === user.id;

    if (isDirectParticipant) {
      return;
    }

    // Active guardian check
    const activeLink = await this.linkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId: booking.studentUserId,
        status: 'active',
      },
    });

    if (activeLink) {
      return;
    }

    throw new ForbiddenException(
      'Access denied: You are not authorized to view or manage sessions for this booking.',
    );
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
    eventType: any,
    recipientRole: any,
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
      } catch (err) {
        this.logger.warn(`Failed to dispatch notification ${eventType}: ${err}`);
      }
    });
  }
}
