import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SessionAttendanceEntity } from '../entities/session-attendance.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { AssignmentSubmissionEntity } from '../entities/assignment-submission.entity';
import { ProgressReportEntity } from '../entities/progress-report.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { LearningAccessService } from './learning-access.service';
import { CreateProgressReportDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface StudentLearningSummary {
  studentUserId: string;
  metrics: {
    totalSessionsRecorded: number;
    sessionsAttended: number;
    attendanceRate: number;
    assignmentsAssigned: number;
    assignmentsCompleted: number;
    averageScore: number | null;
  };
  attendance: SessionAttendanceEntity[];
  assignments: AssignmentEntity[];
  submissions: AssignmentSubmissionEntity[];
  progressReports: ProgressReportEntity[];
}

/**
 * Progress analytics: auditable progress reports computed from real
 * attendance/submission records, booking record aggregation, and
 * student learning summaries with verifiable metrics.
 */
@Injectable()
export class LearningProgressService {
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
    private readonly access: LearningAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate an auditable progress report based on real database records
   */
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

    // Only assigned tutor or admin can generate progress reports
    const isTutor = booking.tutorUserId === user.id;
    const isAdmin = user.roles?.includes('admin');
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can generate progress reports for this booking',
      );
    }

    const startDate = new Date(dto.periodStart);
    const endDate = new Date(dto.periodEnd);
    if (endDate < startDate) {
      throw new BadRequestException('periodEnd must be greater than or equal to periodStart');
    }

    // 1. Calculate Attendance Rate from real DB sessions & attendance
    const sessions = await this.sessionRepo.find({
      where: {
        bookingId: booking.id,
        startsAt: Between(startDate, endDate),
      },
    });

    let attendanceRate = 100.0;
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      const attendanceRecords = await this.attendanceRepo.find({
        where: {
          sessionId: In(sessionIds),
          participantUserId: booking.studentUserId,
        },
      });

      if (attendanceRecords.length > 0) {
        const attended = attendanceRecords.filter(
          (a) => a.attendanceStatus === 'present' || a.attendanceStatus === 'late',
        ).length;
        attendanceRate = Number(((attended / attendanceRecords.length) * 100).toFixed(2));
      }
    }

    // 2. Calculate Completed Assignments & Average Score from real submissions
    const assignments = await this.assignmentRepo.find({
      where: { bookingId: booking.id },
    });
    const assignmentIds = assignments.map((a) => a.id);

    let assignmentsCompleted = 0;
    let averageScore: number | null = null;

    if (assignmentIds.length > 0) {
      const submissions = await this.submissionRepo.find({
        where: {
          assignmentId: In(assignmentIds),
          studentUserId: booking.studentUserId,
          submittedAt: Between(startDate, endDate),
        },
      });

      assignmentsCompleted = submissions.filter((s) => s.status !== 'returned').length;

      const scoredSubmissions = submissions.filter((s) => s.score !== null && s.maxScore);
      if (scoredSubmissions.length > 0) {
        const totalPct = scoredSubmissions.reduce(
          (sum, sub) => sum + (Number(sub.score) / Number(sub.maxScore)) * 100,
          0,
        );
        averageScore = Number((totalPct / scoredSubmissions.length).toFixed(2));
      }
    }

    const report = this.progressReportRepo.create({
      bookingId: booking.id,
      studentUserId: booking.studentUserId,
      tutorUserId: booking.tutorUserId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      attendanceRate,
      assignmentsCompleted,
      averageScore,
      observableProgress: dto.observableProgress,
      areasForGrowth: dto.areasForGrowth ?? null,
      tutorRemarks: dto.tutorRemarks ?? null,
    });

    const saved = await this.progressReportRepo.save(report);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.progress_report_generated',
      resourceType: 'progress_reports',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        studentUserId: booking.studentUserId,
        attendanceRate,
        assignmentsCompleted,
        averageScore,
      },
    });

    return saved;
  }

  /**
   * Get all learning records for a booking
   */
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
    });

    const sessions = await this.sessionRepo.find({
      where: { bookingId },
      order: { startsAt: 'DESC' },
    });

    const sessionIds = sessions.map((s) => s.id);
    const attendance =
      sessionIds.length > 0
        ? await this.attendanceRepo.find({
            where: { sessionId: In(sessionIds) },
            relations: { session: true },
            order: { recordedAt: 'DESC' },
          })
        : [];

    const progressReports = await this.progressReportRepo.find({
      where: { bookingId },
      order: { generatedAt: 'DESC' },
    });

    return {
      bookingId,
      assignments,
      attendance,
      progressReports,
    };
  }

  /**
   * Get student learning summary with verifiable metrics
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
      }),
      this.assignmentRepo.find({
        where: { studentUserId },
        order: { createdAt: 'DESC' },
      }),
      this.submissionRepo.find({
        where: { studentUserId },
        relations: { assignment: true },
        order: { submittedAt: 'DESC' },
      }),
      this.progressReportRepo.find({
        where: { studentUserId },
        order: { generatedAt: 'DESC' },
      }),
    ]);

    const totalSessionsRecorded = attendance.length;
    const sessionsAttended = attendance.filter(
      (a) => a.attendanceStatus === 'present' || a.attendanceStatus === 'late',
    ).length;
    const attendanceRate =
      totalSessionsRecorded > 0
        ? Number(((sessionsAttended / totalSessionsRecorded) * 100).toFixed(2))
        : 100.0;

    const assignmentsAssigned = assignments.length;
    const assignmentsCompleted = submissions.filter((s) => s.status !== 'returned').length;

    const scoredSubmissions = submissions.filter((s) => s.score !== null && s.maxScore);
    let averageScore: number | null = null;
    if (scoredSubmissions.length > 0) {
      const totalPct = scoredSubmissions.reduce(
        (acc, cur) => acc + (Number(cur.score) / Number(cur.maxScore)) * 100,
        0,
      );
      averageScore = Number((totalPct / scoredSubmissions.length).toFixed(2));
    }

    return {
      studentUserId,
      metrics: {
        totalSessionsRecorded,
        sessionsAttended,
        attendanceRate,
        assignmentsAssigned,
        assignmentsCompleted,
        averageScore,
      },
      attendance,
      assignments,
      submissions,
      progressReports,
    };
  }
}
