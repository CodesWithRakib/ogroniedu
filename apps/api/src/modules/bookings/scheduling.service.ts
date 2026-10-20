import { Injectable, Inject, Optional, forwardRef } from '@nestjs/common';
import { SessionSchedulingService } from './services/session-scheduling.service';
import { SessionReschedulingService } from './services/session-rescheduling.service';
import { SessionQueriesService } from './services/session-queries.service';
import { SessionSeriesService } from './services/session-series.service';
import {
  CreateSessionDto,
  CreateRecurringSessionsDto,
  RescheduleSessionDto,
  CancelSessionDto,
  GetSessionsQueryDto,
  SeriesCancelDto,
  SeriesRescheduleDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export type { PublicCalendarSlot } from './services/session-queries.service';

/**
 * Backward-compatible facade over the split session domain services.
 * Controllers and other modules keep importing SchedulingService; new code
 * should inject SessionSchedulingService / SessionReschedulingService /
 * SessionQueriesService directly.
 */
@Injectable()
export class SchedulingService {
  constructor(
    @Inject(forwardRef(() => SessionSchedulingService))
    private readonly scheduling: SessionSchedulingService,
    @Inject(forwardRef(() => SessionReschedulingService))
    private readonly rescheduling: SessionReschedulingService,
    @Inject(forwardRef(() => SessionQueriesService))
    private readonly queries: SessionQueriesService,
    @Optional()
    @Inject(forwardRef(() => SessionSeriesService))
    private readonly series?: SessionSeriesService,
  ) {}

  scheduleSession(user: AuthenticatedUser, dto: CreateSessionDto, idempotencyKey?: string) {
    return this.scheduling.scheduleSession(user, dto, idempotencyKey);
  }
  scheduleRecurringSessions(user: AuthenticatedUser, dto: CreateRecurringSessionsDto) {
    return this.scheduling.scheduleRecurringSessions(user, dto);
  }
  rescheduleSession(sessionId: string, user: AuthenticatedUser, dto: RescheduleSessionDto) {
    return this.rescheduling.rescheduleSession(sessionId, user, dto);
  }
  cancelSession(sessionId: string, user: AuthenticatedUser, dto: CancelSessionDto) {
    return this.rescheduling.cancelSession(sessionId, user, dto);
  }
  getSessions(user: AuthenticatedUser, query: GetSessionsQueryDto) {
    return this.queries.getSessions(user, query);
  }
  getSessionById(sessionId: string, user: AuthenticatedUser) {
    return this.queries.getSessionById(sessionId, user);
  }
  getTutorCalendar(tutorId: string, from: Date, to: Date) {
    return this.queries.getTutorCalendar(tutorId, from, to);
  }
  generateIcsCalendar(user: AuthenticatedUser, query: GetSessionsQueryDto) {
    return this.queries.generateIcsCalendar(user, query);
  }
  getSeries(seriesId: string, user: AuthenticatedUser) {
    return this.requireSeries().getSeries(seriesId, user);
  }
  cancelSeries(seriesId: string, user: AuthenticatedUser, dto: SeriesCancelDto) {
    return this.requireSeries().cancelSeries(seriesId, user, dto);
  }
  rescheduleSeries(seriesId: string, user: AuthenticatedUser, dto: SeriesRescheduleDto) {
    return this.requireSeries().rescheduleSeries(seriesId, user, dto);
  }
  private requireSeries(): SessionSeriesService {
    if (!this.series) {
      throw new Error('SessionSeriesService is not configured.');
    }
    return this.series;
  }
  startSession(sessionId: string, user: AuthenticatedUser) {
    return this.rescheduling.startSession(sessionId, user);
  }
  completeSession(sessionId: string, user: AuthenticatedUser, notes?: string) {
    return this.rescheduling.completeSession(sessionId, user, notes);
  }
  updateMeetingUrl(sessionId: string, user: AuthenticatedUser, meetingUrl: string) {
    return this.rescheduling.updateMeetingUrl(sessionId, user, meetingUrl);
  }
}
