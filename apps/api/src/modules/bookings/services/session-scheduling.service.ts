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
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { BookingSessionSeriesEntity } from '../entities/booking-session-series.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { TutorAvailabilityService } from '../../tutors/services/tutor-availability.service';
import { assertNoTutorOverlap, recordOutboxEvent } from './session-booking.helpers';
import { CreateSessionDto, CreateRecurringSessionsDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { SessionQueriesService } from './session-queries.service';
import { applyBookingTransition, transitionHistoryValues } from '../utils/booking-lifecycle';
import {
  buildSeriesIdempotencyKey,
  computeHorizonEndDate,
  generateSeriesOccurrences,
  type GeneratedOccurrence,
} from '../utils/session-series';
import { BookingStatusEventEntity } from '../entities/booking-status-event.entity';
import { isZeroPriceBooking } from '../constants/booking-status-transitions';

/**
 * One-off and recurring session creation.
 * Conflict detection is enforced by the app overlap query and the PostgreSQL
 * GiST exclusion constraint; scheduling never confirms a paid booking.
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
    @Optional()
    @Inject(forwardRef(() => TutorAvailabilityService))
    private readonly availability?: TutorAvailabilityService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    @InjectRepository(BookingSessionSeriesEntity)
    private readonly seriesRepo?: Repository<BookingSessionSeriesEntity>,
    @Optional()
    @InjectRepository(BookingStatusEventEntity)
    private readonly statusEventRepo?: Repository<BookingStatusEventEntity>,
  ) {}

  /**
   * Schedule a single one-off session within an active booking.
   * Paid bookings must already be confirmed; scheduling never confirms them.
   */
  async scheduleSession(
    user: AuthenticatedUser,
    dto: CreateSessionDto,
    idempotencyKey?: string,
  ): Promise<BookingSessionEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { subject: true, educationLevel: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${dto.bookingId}`);
    }

    await this.queries.assertCanManageSessions(user, booking);
    await this.assertBookingSchedulable(booking, user);

    // Replay protection: the same client key returns the original row instead of
    // creating a duplicate session.
    if (idempotencyKey) {
      const existing = await this.sessionRepo.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.bookingId !== booking.id) {
          throw new ConflictException('Idempotency key was already used for another booking');
        }
        return existing;
      }
    }

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

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (startsAt < fiveMinutesAgo) {
      throw new BadRequestException('Cannot schedule tutoring sessions in the past.');
    }

    if (this.availability) {
      await this.availability.assertWithinAvailability(booking.tutorUserId, startsAt, endsAt);
    }

    await assertNoTutorOverlap(this.sessionRepo, booking.tutorUserId, startsAt, endsAt);

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
      statusChangedAt: new Date(),
      statusChangedBy: user.id,
      idempotencyKey: idempotencyKey ?? null,
    });

    let savedSession: BookingSessionEntity;
    try {
      savedSession = await this.sessionRepo.save(session);
    } catch (err: unknown) {
      if (idempotencyKey && this.isUniqueViolation(err)) {
        const existing = await this.sessionRepo.findOne({ where: { idempotencyKey } });
        if (existing) return existing;
      }
      this.rethrowConstraintError(err);
      throw err;
    }

    await recordOutboxEvent(
      this.outboxRepo,
      'session.scheduled',
      'session',
      savedSession.id,
      {
        sessionId: savedSession.id,
        bookingId: booking.id,
        tutorUserId: booking.tutorUserId,
        studentUserId: booking.studentUserId,
        subjectName: booking.subject?.nameEn || 'Tutoring Session',
        startsAt: savedSession.startsAt.toISOString(),
        endsAt: savedSession.endsAt.toISOString(),
        timezone: savedSession.timezone,
      },
      `session.scheduled:${savedSession.id}`,
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.scheduled',
      resourceType: 'booking_session',
      resourceId: savedSession.id,
      safeMetadata: {
        bookingId: booking.id,
        startsAt: savedSession.startsAt,
        endsAt: savedSession.endsAt,
        seriesId: null,
      },
    });

    return savedSession;
  }

  /**
   * Schedule a bounded recurring series atomically. The series is idempotent:
   * retrying the same request returns the existing occurrences.
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
    await this.assertBookingSchedulable(booking, user);

    const count = dto.count || 4;
    const timezone = dto.timezone || 'Asia/Dhaka';
    const slots = dto.scheduleSlots.map((slot) => ({
      weekday: slot.weekday,
      startLocal: slot.startLocal,
      durationMinutes: slot.durationMinutes || booking.durationMinutes || 60,
    }));

    const occurrences = generateSeriesOccurrences({
      startDate: dto.startDate,
      count,
      timezone,
      slots,
      defaultDurationMinutes: booking.durationMinutes || 60,
    });

    const idempotencyKey = buildSeriesIdempotencyKey({
      bookingId: booking.id,
      startDate: dto.startDate,
      timezone,
      count,
      slots,
      clientKey: dto.idempotencyKey,
    });

    if (this.seriesRepo) {
      const existingSeries = await this.seriesRepo.findOne({
        where: { bookingId: booking.id, idempotencyKey },
      });
      if (existingSeries) {
        return await this.sessionRepo.find({
          where: { seriesId: existingSeries.id },
          order: { startsAt: 'ASC' },
        });
      }
    }

    this.assertNoInternalCollisions(occurrences);
    await this.assertOccurrencesAvailable(booking, occurrences);

    const persisted = await this.persistSeries(
      booking,
      dto,
      occurrences,
      idempotencyKey,
      user,
      timezone,
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'sessions.recurring.scheduled',
      resourceType: 'booking',
      resourceId: booking.id,
      safeMetadata: {
        count: persisted.sessions.length,
        timezone,
        startDate: dto.startDate,
        seriesId: persisted.seriesId,
      },
    });

    return persisted.sessions;
  }

  private async persistSeries(
    booking: BookingEntity,
    dto: CreateRecurringSessionsDto,
    occurrences: GeneratedOccurrence[],
    idempotencyKey: string,
    user: AuthenticatedUser,
    timezone: string,
  ): Promise<{ seriesId: string | null; sessions: BookingSessionEntity[] }> {
    const createRows = (seriesId: string | null) =>
      occurrences.map((occurrence) =>
        this.sessionRepo.create({
          bookingId: booking.id,
          tutorUserId: booking.tutorUserId,
          studentUserId: booking.studentUserId,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          timezone,
          status: 'scheduled',
          meetingUrl: dto.meetingUrl || null,
          locationInstructions: dto.locationInstructions || null,
          seriesId,
          occurrenceIndex: occurrence.occurrenceIndex,
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        }),
      );

    if (!this.seriesRepo) {
      // Isolated unit-test fallback: no series metadata available.
      const rows = createRows(null);
      const saved = await this.sessionRepo.save(rows);
      for (const session of saved) {
        await recordOutboxEvent(
          this.outboxRepo,
          'session.scheduled',
          'session',
          session.id,
          {
            sessionId: session.id,
            bookingId: booking.id,
            tutorUserId: booking.tutorUserId,
            studentUserId: booking.studentUserId,
            subjectName: booking.subject?.nameEn || 'Tutoring Session',
            startsAt: session.startsAt.toISOString(),
            endsAt: session.endsAt.toISOString(),
            timezone: session.timezone,
          },
          `session.scheduled:${session.id}`,
        );
      }
      return { seriesId: null, sessions: saved };
    }

    if (this.dataSource) {
      try {
        const result = await this.dataSource.transaction(async (manager) => {
          const series = manager.create(BookingSessionSeriesEntity, {
            bookingId: booking.id,
            tutorUserId: booking.tutorUserId,
            studentUserId: booking.studentUserId,
            timezone,
            startDate: dto.startDate,
            horizonEndDate: computeHorizonEndDate(dto.startDate),
            occurrencesPlanned: occurrences.length,
            slots: dto.scheduleSlots.map((slot) => ({
              weekday: slot.weekday,
              startLocal: slot.startLocal,
              durationMinutes: slot.durationMinutes || booking.durationMinutes || 60,
            })),
            status: 'active',
            idempotencyKey,
            createdByUserId: user.id,
          });
          const savedSeries = await manager.save(series);
          const rows = createRows(savedSeries.id);
          const saved = await manager.save(rows);
          for (const session of saved) {
            await manager.save(
              manager.create(OutboxEventEntity, {
                eventType: 'session.scheduled',
                aggregateType: 'session',
                aggregateId: session.id,
                payload: {
                  sessionId: session.id,
                  bookingId: booking.id,
                  tutorUserId: booking.tutorUserId,
                  studentUserId: booking.studentUserId,
                  subjectName: booking.subject?.nameEn || 'Tutoring Session',
                  startsAt: session.startsAt.toISOString(),
                  endsAt: session.endsAt.toISOString(),
                  timezone: session.timezone,
                },
                idempotencyKey: `session.scheduled:${session.id}`,
              }),
            );
          }
          return { seriesId: savedSeries.id, sessions: saved };
        });
        return result;
      } catch (err: unknown) {
        // Idempotency race: another request inserted the same series.
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? (err as { code: unknown }).code
            : undefined;
        if (code === '23505') {
          const existing = await this.seriesRepo.findOne({
            where: { bookingId: booking.id, idempotencyKey },
          });
          if (existing) {
            const sessions = await this.sessionRepo.find({
              where: { seriesId: existing.id },
              order: { startsAt: 'ASC' },
            });
            return { seriesId: existing.id, sessions };
          }
        }
        this.rethrowConstraintError(err);
        throw err;
      }
    }

    const series = this.seriesRepo.create({
      bookingId: booking.id,
      tutorUserId: booking.tutorUserId,
      studentUserId: booking.studentUserId,
      timezone,
      startDate: dto.startDate,
      horizonEndDate: computeHorizonEndDate(dto.startDate),
      occurrencesPlanned: occurrences.length,
      slots: dto.scheduleSlots.map((slot) => ({
        weekday: slot.weekday,
        startLocal: slot.startLocal,
        durationMinutes: slot.durationMinutes || booking.durationMinutes || 60,
      })),
      status: 'active',
      idempotencyKey,
      createdByUserId: user.id,
    });
    const savedSeries = await this.seriesRepo.save(series);
    const rows = createRows(savedSeries.id);
    const saved = await this.sessionRepo.save(rows);
    for (const session of saved) {
      await recordOutboxEvent(
        this.outboxRepo,
        'session.scheduled',
        'session',
        session.id,
        {
          sessionId: session.id,
          bookingId: booking.id,
          tutorUserId: booking.tutorUserId,
          studentUserId: booking.studentUserId,
          subjectName: booking.subject?.nameEn || 'Tutoring Session',
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          timezone: session.timezone,
        },
        `session.scheduled:${session.id}`,
      );
    }
    return { seriesId: savedSeries.id, sessions: saved };
  }

  private assertNoInternalCollisions(occurrences: GeneratedOccurrence[]): void {
    for (let i = 0; i < occurrences.length; i++) {
      for (let j = i + 1; j < occurrences.length; j++) {
        const a = occurrences[i];
        const b = occurrences[j];
        if (a.startsAt < b.endsAt && a.endsAt > b.startsAt) {
          throw new ConflictException(
            `Internal conflict in recurring schedule: ${a.localDate} ${a.localStart} overlaps another generated occurrence.`,
          );
        }
      }
    }
  }

  private async assertOccurrencesAvailable(
    booking: BookingEntity,
    occurrences: GeneratedOccurrence[],
  ): Promise<void> {
    const conflicts: string[] = [];
    for (const occurrence of occurrences) {
      try {
        if (this.availability) {
          await this.availability.assertWithinAvailability(
            booking.tutorUserId,
            occurrence.startsAt,
            occurrence.endsAt,
          );
        }
        await assertNoTutorOverlap(
          this.sessionRepo,
          booking.tutorUserId,
          occurrence.startsAt,
          occurrence.endsAt,
        );
      } catch (err) {
        conflicts.push(
          `${occurrence.localDate} ${occurrence.localStart}: ${
            err instanceof Error ? err.message : 'conflict'
          }`,
        );
      }
    }
    if (conflicts.length > 0) {
      throw new ConflictException(
        `Recurring series was not created because ${conflicts.length} occurrence(s) conflict: ${conflicts
          .slice(0, 5)
          .join('; ')}${conflicts.length > 5 ? '; …' : ''}`,
      );
    }
  }

  /**
   * Paid bookings must be confirmed before scheduling. Zero-price bookings may
   * be confirmed server-side here (no payment exists to authoritatively do it).
   */
  private async assertBookingSchedulable(
    booking: BookingEntity,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (booking.status === 'confirmed' || booking.status === 'in_progress') return;

    if (
      isZeroPriceBooking(booking.pricePerSessionMinor) &&
      (booking.status === 'accepted' || booking.status === 'awaiting_payment')
    ) {
      const transition = applyBookingTransition(booking, 'confirmed', {
        actorUserId: user.id,
        reason: 'Zero-price booking confirmed at scheduling',
      });
      await this.bookingRepo.save(booking);
      if (this.statusEventRepo) {
        await this.statusEventRepo.save(
          this.statusEventRepo.create(
            transitionHistoryValues(booking.id, transition, {
              actorUserId: user.id,
              actorRole: user.roles?.[0] ?? 'student',
              reason: 'Zero-price booking confirmed at scheduling',
            }),
          ),
        );
      }
      return;
    }

    throw new BadRequestException(
      `Cannot schedule sessions for booking with status '${booking.status}'. ` +
        `Paid bookings must be confirmed by the payment provider before scheduling.`,
    );
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === '23505'
    );
  }

  private rethrowConstraintError(err: unknown): void {
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
  }
}
