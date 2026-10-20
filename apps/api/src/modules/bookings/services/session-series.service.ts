import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingSessionSeriesEntity } from '../entities/booking-session-series.entity';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { AuditService } from '../../audit/audit.service';
import { TutorAvailabilityService } from '../../tutors/services/tutor-availability.service';
import { SessionQueriesService } from './session-queries.service';
import {
  assertNoTutorOverlapExcluding,
  recordOutboxEvent,
} from './session-booking.helpers';
import { SeriesCancelDto, SeriesRescheduleDto, SeriesScope } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { assessCancellation, CancellationInitiator } from '../utils/cancellation-policy';
import { addDaysToDateString, localDateString } from '../utils/zoned-time';
import {
  CANCELLABLE_SESSION_STATUSES,
  RESCHEDULABLE_SESSION_STATUSES,
} from '../constants/session-status-transitions';

export interface SeriesMutationResult {
  series: BookingSessionSeriesEntity;
  sessions: BookingSessionEntity[];
}

/**
 * Series-scoped cancel/reschedule. Every operation preserves history:
 * cancelled rows stay, reschedules update in place with previous values in
 * audit metadata and an incremented `version` for calendar `SEQUENCE`.
 */
@Injectable()
export class SessionSeriesService {
  constructor(
    @InjectRepository(BookingSessionSeriesEntity)
    private readonly seriesRepo: Repository<BookingSessionSeriesEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(forwardRef(() => SessionQueriesService))
    private readonly queries: SessionQueriesService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => TutorAvailabilityService))
    private readonly availability?: TutorAvailabilityService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  async getSeries(seriesId: string, user: AuthenticatedUser) {
    const series = await this.loadAuthorizedSeries(seriesId, user);
    const sessions = await this.sessionRepo.find({
      where: { seriesId },
      order: { startsAt: 'ASC' },
    });
    return { series, sessions };
  }

  async cancelSeries(
    seriesId: string,
    user: AuthenticatedUser,
    dto: SeriesCancelDto,
  ): Promise<SeriesMutationResult & { assessments: unknown[] }> {
    const series = await this.loadAuthorizedSeries(seriesId, user);
    const allSessions = await this.sessionRepo.find({
      where: { seriesId },
      order: { startsAt: 'ASC' },
    });
    const selected = this.selectScope(allSessions, dto.scope, dto.anchorSessionId);
    const cancellable = selected.filter((s) =>
      (CANCELLABLE_SESSION_STATUSES as readonly string[]).includes(s.status),
    );
    if (cancellable.length === 0) {
      throw new BadRequestException('No cancellable occurrences in the selected scope.');
    }

    const initiator = this.resolveInitiator(user, series);
    const assessments: unknown[] = [];
    const now = new Date();

    const apply = async (manager?: DataSource['manager']) => {
      const sessionRepo = manager ? manager.getRepository(BookingSessionEntity) : this.sessionRepo;
      for (const session of cancellable) {
        const assessment = assessCancellation({
          initiator,
          startsAt: session.startsAt,
          now,
          reason: dto.reason,
        });
        assessments.push({ sessionId: session.id, ...assessment });
        session.status = 'cancelled';
        session.cancellationAssessment = assessment;
        session.cancelledAt = now;
        session.cancellationReason = dto.reason;
        session.statusChangedAt = now;
        session.statusChangedBy = user.id;
        session.version += 1;
        await sessionRepo.save(session);
      }

      series.status =
        dto.scope === 'entire_series' ? 'cancelled' : series.status;
      if (dto.scope === 'this_and_future' && dto.anchorSessionId) {
        const anchor = allSessions.find((s) => s.id === dto.anchorSessionId);
        if (anchor) {
          const anchorLocalDate = localDateString(anchor.startsAt, series.timezone);
          series.horizonEndDate = addDaysToDateString(anchorLocalDate, -1);
        }
      }
      const seriesRepo = manager
        ? manager.getRepository(BookingSessionSeriesEntity)
        : this.seriesRepo;
      await seriesRepo.save(series);
    };

    if (this.dataSource) {
      await this.dataSource.transaction(apply);
    } else {
      await apply();
    }

    for (const session of cancellable) {
      await recordOutboxEvent(
        this.outboxRepo,
        'session.cancelled',
        'session',
        session.id,
        {
          sessionId: session.id,
          bookingId: session.bookingId,
          seriesId,
          reason: dto.reason,
          scope: dto.scope,
        },
        `session.cancelled:${session.id}`,
      );
    }

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.series.cancelled',
      resourceType: 'booking_session_series',
      resourceId: seriesId,
      reason: dto.reason,
      safeMetadata: {
        scope: dto.scope,
        anchorSessionId: dto.anchorSessionId ?? null,
        cancelledCount: cancellable.length,
      },
    });

    return {
      series,
      sessions: cancellable,
      assessments,
    };
  }

  async rescheduleSeries(
    seriesId: string,
    user: AuthenticatedUser,
    dto: SeriesRescheduleDto,
  ): Promise<SeriesMutationResult> {
    const series = await this.loadAuthorizedSeries(seriesId, user);
    const allSessions = await this.sessionRepo.find({
      where: { seriesId },
      order: { startsAt: 'ASC' },
    });

    const activeSessions = allSessions.filter((s) =>
      (RESCHEDULABLE_SESSION_STATUSES as readonly string[]).includes(s.status),
    );
    const scopeSessions = this.selectScope(activeSessions, dto.scope, dto.anchorSessionId);
    if (scopeSessions.length === 0) {
      throw new BadRequestException('No reschedulable occurrences in the selected scope.');
    }

    const anchor = this.resolveAnchor(scopeSessions, dto.anchorSessionId, dto.scope);
    const newAnchorStart = new Date(dto.newStartsAt);
    if (isNaN(newAnchorStart.getTime())) {
      throw new BadRequestException('Invalid newStartsAt timestamp.');
    }
    if (newAnchorStart < new Date()) {
      throw new BadRequestException('Cannot reschedule to a past time slot.');
    }
    const deltaMs = newAnchorStart.getTime() - anchor.startsAt.getTime();
    if (deltaMs === 0) {
      throw new BadRequestException('The new time is identical to the current time.');
    }

    const moves = scopeSessions.map((session) => {
      const startsAt = new Date(session.startsAt.getTime() + deltaMs);
      const endsAt = new Date(session.endsAt.getTime() + deltaMs);
      return { session, startsAt, endsAt, previousStartsAt: session.startsAt };
    });

    const scopeIds = new Set(scopeSessions.map((s) => s.id));
    for (const move of moves) {
      if (this.availability) {
        await this.availability.assertWithinAvailability(
          series.tutorUserId,
          move.startsAt,
          move.endsAt,
        );
      }
      await assertNoTutorOverlapExcluding(
        this.sessionRepo,
        series.tutorUserId,
        move.startsAt,
        move.endsAt,
        [...scopeIds],
      );
    }

    const now = new Date();
    const apply = async (manager?: DataSource['manager']) => {
      const repo = manager ? manager.getRepository(BookingSessionEntity) : this.sessionRepo;
      for (const move of moves) {
        move.session.startsAt = move.startsAt;
        move.session.endsAt = move.endsAt;
        move.session.status = 'scheduled';
        move.session.rescheduledAt = now;
        move.session.rescheduledBy = user.id;
        move.session.rescheduleReason = dto.reason;
        move.session.statusChangedAt = now;
        move.session.statusChangedBy = user.id;
        move.session.version += 1;
        await repo.save(move.session);
      }
      series.status = 'active';
      const seriesRepo = manager
        ? manager.getRepository(BookingSessionSeriesEntity)
        : this.seriesRepo;
      await seriesRepo.save(series);
    };

    if (this.dataSource) {
      await this.dataSource.transaction(apply);
    } else {
      await apply();
    }

    for (const move of moves) {
      await recordOutboxEvent(
        this.outboxRepo,
        'session.rescheduled',
        'session',
        move.session.id,
        {
          sessionId: move.session.id,
          bookingId: move.session.bookingId,
          seriesId,
          previousStartsAt: move.previousStartsAt.toISOString(),
          newStartsAt: move.startsAt.toISOString(),
          newEndsAt: move.endsAt.toISOString(),
          reason: dto.reason,
          scope: dto.scope,
        },
        `session.rescheduled:${move.session.id}:${move.session.version}`,
      );
    }

    await this.auditService.record({
      actorUserId: user.id,
      action: 'session.series.rescheduled',
      resourceType: 'booking_session_series',
      resourceId: seriesId,
      reason: dto.reason,
      safeMetadata: {
        scope: dto.scope,
        anchorSessionId: anchor.id,
        movedCount: moves.length,
        previousStartsAt: anchor.startsAt,
        newStartsAt: newAnchorStart,
      },
    });

    return { series, sessions: moves.map((m) => m.session) };
  }

  private async loadAuthorizedSeries(
    seriesId: string,
    user: AuthenticatedUser,
  ): Promise<BookingSessionSeriesEntity> {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
      relations: { booking: true },
    });
    if (!series) {
      throw new NotFoundException(`Session series not found: ${seriesId}`);
    }
    if (series.booking) {
      await this.queries.assertCanManageSessions(user, series.booking);
    }
    return series;
  }

  private selectScope(
    sessions: BookingSessionEntity[],
    scope: SeriesScope,
    anchorSessionId?: string,
  ): BookingSessionEntity[] {
    if (scope === 'entire_series') {
      return sessions;
    }
    if (!anchorSessionId) {
      throw new BadRequestException(
        `anchorSessionId is required for scope '${scope}'.`,
      );
    }
    const anchor = sessions.find((s) => s.id === anchorSessionId);
    if (!anchor) {
      throw new BadRequestException(
        'Anchor session does not belong to this series or is not in a mutable state.',
      );
    }
    if (scope === 'this_occurrence') {
      return [anchor];
    }
    return sessions.filter((s) => s.startsAt.getTime() >= anchor.startsAt.getTime());
  }

  private resolveAnchor(
    scopeSessions: BookingSessionEntity[],
    anchorSessionId: string | undefined,
    scope: SeriesScope,
  ): BookingSessionEntity {
    if (anchorSessionId) {
      const found = scopeSessions.find((s) => s.id === anchorSessionId);
      if (!found) {
        throw new BadRequestException('Anchor session is not part of the selected scope.');
      }
      return found;
    }
    if (scope !== 'entire_series') {
      throw new BadRequestException('anchorSessionId is required for this scope.');
    }
    const first = scopeSessions[0];
    if (!first) {
      throw new BadRequestException('No sessions available to reschedule.');
    }
    return first;
  }

  private resolveInitiator(
    user: AuthenticatedUser,
    series: BookingSessionSeriesEntity,
  ): CancellationInitiator {
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) return 'admin';
    if (user.id === series.tutorUserId) return 'tutor';
    if (user.id === series.studentUserId) return 'student';
    return 'guardian';
  }
}
