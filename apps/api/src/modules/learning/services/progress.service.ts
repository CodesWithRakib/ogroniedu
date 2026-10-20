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
import { SessionAttendanceEntity, type AttendanceStatus } from '../entities/session-attendance.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { AssignmentSubmissionEntity } from '../entities/assignment-submission.entity';
import { ProgressReportEntity } from '../entities/progress-report.entity';
import { LearningGoalEntity } from '../entities/learning-goal.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { LearningAccessService } from './learning-access.service';
import { CreateProgressReportDto, AttendanceSummaryQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import type { StudentLearningSummary } from '../interfaces/student-learning-summary.interface';
import {
  computeAttendanceMetrics,
  computeAverageScorePercent,
  computeCompletionRate,
} from '../utils/learning-metrics';

export type { StudentLearningSummary } from '../interfaces/student-learning-summary.interface';

export interface StudentProgressView {
  studentUserId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessions: {
    completed: number;
    upcoming: number;
    cancelled: number;
  };
  attendance: ReturnType<typeof computeAttendanceMetrics> & { sessionsInPeriod: number };
  assignments: {
    published: number;
    submitted: number;
    reviewed: number;
    completionRate: number | null;
    averageScore: number | null;
  };
  attendanceTrend: Array<{ month: string; attendanceRate: number | null; recorded: number }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    targetDate: string | null;
  }>;
  recentFeedback: Array<{
    submissionId: string;
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number | null;
    feedback: string;
    reviewedAt: string;
  }>;
  latestReport: {
    id: string;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
  } | null;
}

/**
 * Progress analytics computed exclusively from stored learning records.
 * Formulas are documented in docs/features/lms/LEARNING_PROGRESS.md.
 */
@Injectable()
export class LearningProgressService {
  private readonly logger = new Logger(LearningProgressService.name);

  constructor(
    @InjectRepository(ProgressReportEntity)
    private readonly progressReportRepo: Repository<ProgressReportEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(SessionAttendanceEntity)
    private readonly attendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<AssignmentSubmissionEntity>,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @InjectRepository(LearningGoalEntity)
    private readonly goalsRepo?: Repository<LearningGoalEntity>,
    @Optional()
    @Inject(GuardianAccessService)
    private readonly guardianAccess?: GuardianAccessService,
  ) {}

  async generateProgressReport(
    user: AuthenticatedUser,
    dto: CreateProgressReportDto,
    requestId?: string,
  ): Promise<ProgressReportEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { studentUser: true, subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    if (!isAdminRole(user) && booking.tutorUserId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can generate progress reports for this booking',
      );
    }

    const startDate = new Date(dto.periodStart);
    const endDate = new Date(dto.periodEnd);
    if (endDate < startDate) {
      throw new BadRequestException('periodEnd must be greater than or equal to periodStart');
    }

    const sessions = await this.sessionRepo.find({
      where: { bookingId: booking.id },
      order: { startsAt: 'ASC' },
      take: 500,
    });
    const inPeriod = sessions.filter((session) => {
      const at = new Date(session.startsAt).getTime();
      return at >= startDate.getTime() && at <= endDate.getTime();
    });
    const eligibleSessions = inPeriod.filter(
      (session) => !['cancelled', 'no_show'].includes(session.status),
    );

    const attendanceRows =
      inPeriod.length > 0
        ? await this.attendanceRepo.find({
            where: { participantUserId: booking.studentUserId },
            take: 1000,
          })
        : [];
    const sessionStarts = new Map(
      inPeriod.map((session) => [session.id, new Date(session.startsAt).getTime()]),
    );
    const statuses: AttendanceStatus[] = attendanceRows
      .filter((row) => {
        const at = sessionStarts.get(row.sessionId);
        return at !== undefined && at >= startDate.getTime() && at <= endDate.getTime();
      })
      .map((row) => row.attendanceStatus);
    const attendanceMetrics = computeAttendanceMetrics(statuses, eligibleSessions.length);

    const assignments = await this.assignmentRepo.find({
      where: { bookingId: booking.id },
      take: 500,
    });
    const countedAssignments = assignments.filter(
      (assignment) => assignment.status !== 'draft' && assignment.status !== 'archived',
    );
    const assignmentIds = new Set(countedAssignments.map((assignment) => assignment.id));

    const submissions = await this.submissionRepo.find({
      where: { studentUserId: booking.studentUserId },
      take: 1000,
    });
    const periodSubmissions = submissions.filter((submission) => {
      if (!assignmentIds.has(submission.assignmentId)) return false;
      if (!submission.submittedAt) return true; // legacy rows predate the column default
      const at = new Date(submission.submittedAt).getTime();
      return at >= startDate.getTime() && at <= endDate.getTime();
    });

    const assignmentsCompleted = periodSubmissions.filter(
      (submission) => submission.status !== 'returned',
    ).length;
    const reviewed = periodSubmissions.filter((submission) => submission.status === 'reviewed');
    const averageScore = computeAverageScorePercent(
      reviewed.map((submission) => ({
        score: submission.score !== null ? Number(submission.score) : null,
        maxScore:
          submission.maxScore !== null
            ? Number(submission.maxScore)
            : Number(
                countedAssignments.find((a) => a.id === submission.assignmentId)?.maxScore ?? 0,
              ),
      })),
    );

    const report = this.progressReportRepo.create({
      bookingId: booking.id,
      studentUserId: booking.studentUserId,
      tutorUserId: booking.tutorUserId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      attendanceRate: attendanceMetrics.attendanceRate ?? 0,
      assignmentsCompleted,
      averageScore,
      observableProgress: dto.observableProgress,
      areasForGrowth: dto.areasForGrowth ?? null,
      tutorRemarks: dto.tutorRemarks ?? null,
    });

    const saved = await this.progressReportRepo.save(report);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.progress_report_generated',
      resourceType: 'progress_reports',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        studentUserId: booking.studentUserId,
        attendanceRate: attendanceMetrics.attendanceRate,
        attendanceCoverage: attendanceMetrics.coverage,
        assignmentsCompleted,
        averageScore,
      },
    });

    await this.notifyReportPublished(saved, booking);
    return saved;
  }

  async getBookingLearningRecords(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: { studentUser: true, subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);

    const assignments = await this.assignmentRepo.find({
      where: { bookingId },
      relations: { submissions: { studentUser: true } },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const sessions = await this.sessionRepo.find({
      where: { bookingId },
      order: { startsAt: 'DESC' },
      take: 200,
    });

    const sessionIds = sessions.map((session) => session.id);
    const attendance =
      sessionIds.length > 0
        ? await this.attendanceRepo.find({
            where: { participantUserId: booking.studentUserId },
            relations: { session: true },
            order: { recordedAt: 'DESC' },
            take: 500,
          })
        : [];

    const progressReports = await this.progressReportRepo.find({
      where: { bookingId },
      order: { generatedAt: 'DESC' },
      take: 50,
    });

    return {
      bookingId,
      assignments,
      attendance: attendance.filter((row) => sessionIds.includes(row.sessionId)),
      reports: progressReports,
      progressReports,
    };
  }

  /**
   * Legacy summary kept for the learning page. Uses the same formulas as
   * getStudentProgress; bounded queries only.
   */
  async getStudentLearningSummary(
    user: AuthenticatedUser,
    studentUserId: string,
  ): Promise<StudentLearningSummary> {
    await this.access.assertCanAccessStudentRecords(user, studentUserId);

    const [attendance, assignments, submissions, progressReports] = await Promise.all([
      this.attendanceRepo.find({
        where: { participantUserId: studentUserId },
        relations: { session: true },
        order: { recordedAt: 'DESC' },
        take: 500,
      }),
      this.assignmentRepo.find({
        where: { studentUserId },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
      this.submissionRepo.find({
        where: { studentUserId },
        relations: { assignment: true },
        order: { submittedAt: 'DESC' },
        take: 200,
      }),
      this.progressReportRepo.find({
        where: { studentUserId },
        order: { generatedAt: 'DESC' },
        take: 50,
      }),
    ]);

    const metrics = computeAttendanceMetrics(
      attendance.map((row) => row.attendanceStatus),
      attendance.length,
    );
    const publishedAssignments = assignments.filter(
      (assignment) => assignment.status !== 'draft' && assignment.status !== 'archived',
    );
    const publishedIds = new Set(publishedAssignments.map((assignment) => assignment.id));
    const relevantSubmissions = submissions.filter((s) => publishedIds.has(s.assignmentId));
    const reviewed = relevantSubmissions.filter((s) => s.status === 'reviewed');

    return {
      studentUserId,
      metrics: {
        totalSessionsRecorded: metrics.recorded,
        sessionsAttended: metrics.attended,
        attendanceRate: metrics.attendanceRate ?? 0,
        assignmentsAssigned: publishedAssignments.length,
        assignmentsCompleted: relevantSubmissions.filter((s) => s.status !== 'returned').length,
        averageScore: computeAverageScorePercent(
          reviewed.map((submission) => ({
            score: submission.score !== null ? Number(submission.score) : null,
            maxScore:
              submission.maxScore !== null
                ? Number(submission.maxScore)
                : Number(submission.assignment?.maxScore ?? 0),
          })),
        ),
      },
      attendance,
      assignments,
      submissions,
      progressReports,
    };
  }

  async getStudentProgress(
    user: AuthenticatedUser,
    studentUserId: string,
    query: AttendanceSummaryQueryDto,
  ): Promise<StudentProgressView> {
    if (query.bookingId) {
      const booking = await this.bookingRepo.findOne({ where: { id: query.bookingId } });
      if (!booking) throw new NotFoundException(`Booking ${query.bookingId} not found`);
      if (booking.studentUserId !== studentUserId) {
        throw new BadRequestException('studentId does not match the booking student');
      }
      await this.access.assertCanAccessStudentRecords(user, studentUserId, booking.id);
    } else {
      await this.access.assertCanAccessStudentRecords(user, studentUserId);
    }

    const now = new Date();
    const periodEnd = query.to ? new Date(query.to) : now;
    const periodStart = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (periodStart > periodEnd) {
      throw new BadRequestException('from must be before to');
    }

    const sessionQuery = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.studentUserId = :studentUserId', { studentUserId })
      .orderBy('session.startsAt', 'DESC')
      .take(500);
    if (query.bookingId) {
      sessionQuery.andWhere('session.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    const sessions = await sessionQuery.getMany();

    const inPeriod = sessions.filter((session) => {
      const at = new Date(session.startsAt);
      return at >= periodStart && at <= periodEnd;
    });
    const eligible = inPeriod.filter(
      (session) =>
        !['cancelled', 'no_show'].includes(session.status) &&
        new Date(session.startsAt) <= now,
    );
    const sessionById = new Map(inPeriod.map((session) => [session.id, session]));

    const attendanceRows = await this.attendanceRepo.find({
      where: { participantUserId: studentUserId },
      order: { recordedAt: 'DESC' },
      take: 1000,
    });
    const periodStatuses: AttendanceStatus[] = attendanceRows
      .filter((row) => sessionById.has(row.sessionId))
      .map((row) => row.attendanceStatus);
    const attendanceMetrics = computeAttendanceMetrics(periodStatuses, eligible.length);

    const assignmentQuery = this.assignmentRepo
      .createQueryBuilder('assignment')
      .where('assignment.studentUserId = :studentUserId', { studentUserId })
      .andWhere("assignment.status = 'published'")
      .take(500);
    if (query.bookingId) {
      assignmentQuery.andWhere('assignment.bookingId = :bookingId', {
        bookingId: query.bookingId,
      });
    }
    const publishedAssignments = await assignmentQuery.getMany();
    const assignmentIds = new Set(publishedAssignments.map((assignment) => assignment.id));

    const submissions = await this.submissionRepo.find({
      where: { studentUserId },
      relations: { assignment: true },
      order: { submittedAt: 'DESC' },
      take: 500,
    });
    const relevant = submissions.filter((submission) => assignmentIds.has(submission.assignmentId));
    const reviewed = relevant.filter((submission) => submission.status === 'reviewed');

    const goals = this.goalsRepo
      ? await this.goalsRepo.find({
          where: { studentUserId },
          order: { updatedAt: 'DESC' },
          take: 50,
        })
      : [];

    const latestReport = await this.progressReportRepo.findOne({
      where: { studentUserId },
      order: { generatedAt: 'DESC' },
    });

    return {
      studentUserId,
      bookingId: query.bookingId ?? null,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      sessions: {
        completed: inPeriod.filter((session) => session.status === 'completed').length,
        upcoming: sessions.filter(
          (session) =>
            ['scheduled', 'in_progress'].includes(session.status) &&
            new Date(session.startsAt) > now,
        ).length,
        cancelled: inPeriod.filter((session) => session.status === 'cancelled').length,
      },
      attendance: { ...attendanceMetrics, sessionsInPeriod: eligible.length },
      assignments: {
        published: publishedAssignments.length,
        submitted: relevant.filter((submission) => submission.status !== 'returned').length,
        reviewed: reviewed.length,
        completionRate: computeCompletionRate(
          relevant.filter((submission) => submission.status !== 'returned').length,
          publishedAssignments.length,
        ),
        averageScore: computeAverageScorePercent(
          reviewed.map((submission) => ({
            score: submission.score !== null ? Number(submission.score) : null,
            maxScore:
              submission.maxScore !== null
                ? Number(submission.maxScore)
                : Number(submission.assignment?.maxScore ?? 0),
          })),
        ),
      },
      attendanceTrend: this.buildAttendanceTrend(inPeriod, attendanceRows, now),
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        targetDate: goal.targetDate,
      })),
      recentFeedback: reviewed
        .filter((submission) => Boolean(submission.tutorFeedback))
        .slice(0, 5)
        .map((submission) => ({
          submissionId: submission.id,
          assignmentId: submission.assignmentId,
          assignmentTitle: submission.assignment?.title ?? 'Assignment',
          score: submission.score !== null ? Number(submission.score) : null,
          maxScore: submission.maxScore !== null ? Number(submission.maxScore) : null,
          feedback: submission.tutorFeedback ?? '',
          reviewedAt: submission.reviewedAt
            ? new Date(submission.reviewedAt).toISOString()
            : new Date(submission.submittedAt).toISOString(),
        })),
      latestReport: latestReport
        ? {
            id: latestReport.id,
            periodStart: latestReport.periodStart,
            periodEnd: latestReport.periodEnd,
            generatedAt: new Date(latestReport.generatedAt).toISOString(),
          }
        : null,
    };
  }

  async getProgressReportById(
    user: AuthenticatedUser,
    reportId: string,
  ): Promise<ProgressReportEntity> {
    const report = await this.progressReportRepo.findOne({
      where: { id: reportId },
      relations: { booking: { subject: true }, studentUser: true },
    });

    if (!report) {
      throw new NotFoundException(`Progress report ${reportId} not found`);
    }

    await this.access.assertCanAccessStudentRecords(user, report.studentUserId, report.bookingId);

    return report;
  }

  /**
   * Calendar months (session timezone) over the last six months. Months with no
   * eligible sessions are omitted, never rendered as 0%.
   */
  private buildAttendanceTrend(
    sessions: BookingSessionEntity[],
    attendance: SessionAttendanceEntity[],
    now: Date,
  ): Array<{ month: string; attendanceRate: number | null; recorded: number }> {
    const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const sessionById = new Map(
      sessions
        .filter(
          (session) =>
            new Date(session.startsAt) >= cutoff &&
            !['cancelled', 'no_show'].includes(session.status) &&
            new Date(session.startsAt) <= now,
        )
        .map((session) => [session.id, session]),
    );
    const statusByMonth = new Map<string, AttendanceStatus[]>();
    for (const row of attendance) {
      const session = sessionById.get(row.sessionId);
      if (!session) continue;
      const month = this.monthKey(session);
      const list = statusByMonth.get(month) ?? [];
      list.push(row.attendanceStatus);
      statusByMonth.set(month, list);
    }

    return [...statusByMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 6)
      .map(([month, statuses]) => {
        const metrics = computeAttendanceMetrics(statuses, statuses.length);
        return {
          month,
          attendanceRate: metrics.attendanceRate,
          recorded: metrics.recorded,
        };
      });
  }

  private monthKey(session: BookingSessionEntity): string {
    const timezone = session.timezone || 'Asia/Dhaka';
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
      }).formatToParts(new Date(session.startsAt));
      const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
      const month = parts.find((part) => part.type === 'month')?.value ?? '00';
      return `${year}-${month}`;
    } catch {
      return new Date(session.startsAt).toISOString().slice(0, 7);
    }
  }

  private async notifyReportPublished(
    report: ProgressReportEntity,
    booking: BookingEntity,
  ): Promise<void> {
    if (!this.notificationService) return;
    const payload = {
      reportId: report.id,
      studentName: booking.studentUser?.displayName || 'Student',
      period: `${report.periodStart} – ${report.periodEnd}`,
    };
    await this.notificationService
      .dispatch({
        userId: report.studentUserId,
        recipientRole: 'student',
        eventType: 'progress.published',
        payload,
      })
      .catch((err) => this.logger.warn(`Student report notification failed: ${String(err)}`));

    const guardianIds = (await this.guardianAccess?.findActiveGuardianIds(report.studentUserId)) ?? [];
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'progress.published',
          payload,
        })
        .catch((err) => this.logger.warn(`Guardian report notification failed: ${String(err)}`));
    }
  }
}
