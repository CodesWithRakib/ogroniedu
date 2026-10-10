import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SessionAttendanceEntity, AttendanceStatus } from './entities/session-attendance.entity';
import { AssignmentEntity } from './entities/assignment.entity';
import {
  AssignmentSubmissionEntity,
  SubmissionStatus,
} from './entities/assignment-submission.entity';
import { ProgressReportEntity } from './entities/progress-report.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  MarkAttendanceDto,
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  CreateProgressReportDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    @InjectRepository(SessionAttendanceEntity)
    private readonly attendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<AssignmentSubmissionEntity>,
    @InjectRepository(ProgressReportEntity)
    private readonly progressReportRepo: Repository<ProgressReportEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepo: Repository<GuardianStudentLinkEntity>,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Helper: Check if an authenticated user is authorized to view a student's learning records
   */
  async assertCanAccessStudentRecords(
    user: AuthenticatedUser,
    studentUserId: string,
    bookingId?: string,
  ): Promise<void> {
    if (user.roles?.includes('admin')) {
      return;
    }

    if (user.id === studentUserId) {
      return;
    }

    // Check active guardian link
    const activeLink = await this.guardianLinkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId,
        status: 'active',
      },
    });
    if (activeLink) {
      return;
    }

    // Check if user is an assigned tutor for this student
    if (bookingId) {
      const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
      if (booking && booking.tutorUserId === user.id && booking.studentUserId === studentUserId) {
        return;
      }
    } else {
      const booking = await this.bookingRepo.findOne({
        where: {
          tutorUserId: user.id,
          studentUserId,
        },
      });
      if (booking) {
        return;
      }
    }

    throw new ForbiddenException(
      'Access denied: You are not authorized to view learning records for this student',
    );
  }

  /**
   * Mark attendance for a session participant
   */
  async markAttendance(
    user: AuthenticatedUser,
    dto: MarkAttendanceDto,
    requestId?: string,
  ): Promise<SessionAttendanceEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: { booking: { subject: true }, studentUser: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    // Only session tutor or admin can record attendance
    const isTutor = session.tutorUserId === user.id;
    const isAdmin = user.roles?.includes('admin');
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can record attendance for this session',
      );
    }

    // Validate participant matches session student
    if (session.studentUserId !== dto.participantUserId) {
      throw new BadRequestException('Participant user must match the session student');
    }

    let record = await this.attendanceRepo.findOne({
      where: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
      },
    });

    if (record) {
      record.attendanceStatus = dto.attendanceStatus;
      record.notes = dto.notes ?? null;
      record.recordedBy = user.id;
      record.recordedAt = new Date();
    } else {
      record = this.attendanceRepo.create({
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
        attendanceStatus: dto.attendanceStatus,
        recordedBy: user.id,
        notes: dto.notes ?? null,
      });
    }

    const saved = await this.attendanceRepo.save(record);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.attendance_marked',
      resourceType: 'session_attendance',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
        attendanceStatus: dto.attendanceStatus,
      },
    });

    // Notify Student
    if (this.notificationService) {
      const subjectName = session.booking?.subject?.nameEn || 'Session';
      const studentName = session.studentUser?.displayName || 'Student';

      await this.notificationService
        .dispatch({
          userId: dto.participantUserId,
          recipientRole: 'student',
          eventType: 'attendance.marked',
          payload: {
            sessionId: dto.sessionId,
            studentName,
            subjectName,
            status: dto.attendanceStatus,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch student attendance notification: ${err}`),
        );

      // Notify Active Guardians
      const guardians = await this.guardianLinkRepo.find({
        where: { studentUserId: dto.participantUserId, status: 'active' },
      });

      for (const link of guardians) {
        await this.notificationService
          .dispatch({
            userId: link.guardianUserId,
            recipientRole: 'guardian',
            eventType: 'attendance.marked',
            payload: {
              sessionId: dto.sessionId,
              studentName,
              subjectName,
              status: dto.attendanceStatus,
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian attendance notification: ${err}`),
          );
      }
    }

    return saved;
  }

  /**
   * Get attendance for a session
   */
  async getSessionAttendance(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<SessionAttendanceEntity[]> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.assertCanAccessStudentRecords(user, session.studentUserId, session.bookingId);

    return this.attendanceRepo.find({
      where: { sessionId },
      relations: { participantUser: true, recordedByUser: true },
    });
  }

  /**
   * Create an assignment
   */
  async createAssignment(
    user: AuthenticatedUser,
    dto: CreateAssignmentDto,
    requestId?: string,
  ): Promise<AssignmentEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { studentUser: true, subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // Only booking tutor or admin can create assignments
    const isTutor = booking.tutorUserId === user.id;
    const isAdmin = user.roles?.includes('admin');
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can create assignments for this booking',
      );
    }

    if (dto.sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
      if (!session || session.bookingId !== booking.id) {
        throw new BadRequestException('Provided sessionId does not belong to this booking');
      }
    }

    const assignment = this.assignmentRepo.create({
      bookingId: booking.id,
      sessionId: dto.sessionId ?? null,
      tutorUserId: booking.tutorUserId,
      studentUserId: booking.studentUserId,
      title: dto.title,
      instructions: dto.instructions ?? null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      maxScore: dto.maxScore ?? 100,
      status: 'published',
    });

    const saved = await this.assignmentRepo.save(assignment);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.assignment_created',
      resourceType: 'assignments',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        studentUserId: booking.studentUserId,
        title: dto.title,
        maxScore: saved.maxScore,
        dueAt: saved.dueAt?.toISOString(),
      },
    });

    // Notify Student & Guardians
    if (this.notificationService) {
      const subjectName = booking.subject?.nameEn || 'Course';
      const formattedDueDate = saved.dueAt ? saved.dueAt.toISOString().split('T')[0] : 'N/A';

      await this.notificationService
        .dispatch({
          userId: booking.studentUserId,
          recipientRole: 'student',
          eventType: 'assignment.created',
          payload: {
            assignmentId: saved.id,
            assignmentTitle: saved.title,
            subjectName,
            dueDate: formattedDueDate,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch student assignment notification: ${err}`),
        );

      const guardians = await this.guardianLinkRepo.find({
        where: { studentUserId: booking.studentUserId, status: 'active' },
      });

      for (const link of guardians) {
        await this.notificationService
          .dispatch({
            userId: link.guardianUserId,
            recipientRole: 'guardian',
            eventType: 'assignment.created',
            payload: {
              assignmentId: saved.id,
              assignmentTitle: saved.title,
              subjectName,
              dueDate: formattedDueDate,
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian assignment notification: ${err}`),
          );
      }
    }

    return saved;
  }

  /**
   * Submit an assignment (Learner only)
   */
  async submitAssignment(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: SubmitAssignmentDto,
    requestId?: string,
  ): Promise<AssignmentSubmissionEntity> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { booking: true, studentUser: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    // Only the assigned learner can submit
    if (user.id !== assignment.studentUserId) {
      throw new ForbiddenException('Only the assigned learner can submit work for this assignment');
    }

    const now = new Date();
    const isLate = assignment.dueAt ? now > assignment.dueAt : false;
    const initialStatus: SubmissionStatus = isLate ? 'late' : 'submitted';

    let submission = await this.submissionRepo.findOne({
      where: {
        assignmentId,
        studentUserId: user.id,
      },
    });

    if (submission) {
      submission.submissionText = dto.submissionText ?? submission.submissionText;
      submission.assetIds = dto.assetIds ?? submission.assetIds;
      submission.submittedAt = now;
      if (submission.status !== 'reviewed') {
        submission.status = initialStatus;
      }
    } else {
      submission = this.submissionRepo.create({
        assignmentId,
        studentUserId: user.id,
        submissionText: dto.submissionText ?? null,
        assetIds: dto.assetIds ?? [],
        submittedAt: now,
        status: initialStatus,
        maxScore: assignment.maxScore,
      });
    }

    const saved = await this.submissionRepo.save(submission);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.assignment_submitted',
      resourceType: 'assignment_submissions',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        assignmentId,
        studentUserId: user.id,
        status: saved.status,
        isLate,
      },
    });

    // Notify Tutor
    if (this.notificationService) {
      await this.notificationService
        .dispatch({
          userId: assignment.tutorUserId,
          recipientRole: 'tutor',
          eventType: 'assignment.submitted',
          payload: {
            assignmentId,
            studentName: assignment.studentUser?.displayName || 'Student',
            assignmentTitle: assignment.title,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch tutor submission notification: ${err}`),
        );
    }

    return saved;
  }

  /**
   * Grade a submission (Tutor only) with score revision audit
   */
  async gradeSubmission(
    user: AuthenticatedUser,
    submissionId: string,
    dto: GradeSubmissionDto,
    requestId?: string,
  ): Promise<AssignmentSubmissionEntity> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: { assignment: { booking: true }, studentUser: true },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const assignment = submission.assignment;
    if (!assignment) {
      throw new NotFoundException('Associated assignment not found');
    }

    // Only the assigned tutor or admin can grade
    const isTutor = assignment.tutorUserId === user.id;
    const isAdmin = user.roles?.includes('admin');
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can grade this assignment submission',
      );
    }

    // Score validation
    const maxScore = Number(assignment.maxScore) || 100;
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score (${dto.score}) cannot exceed maximum score (${maxScore})`,
      );
    }

    const previousScore = submission.score !== null ? Number(submission.score) : null;
    const isRevision = previousScore !== null && previousScore !== dto.score;

    // If revising an already graded submission, a revision reason is strictly required for auditability
    if (isRevision && (!dto.revisionReason || !dto.revisionReason.trim())) {
      throw new BadRequestException(
        'revisionReason is required when revising an already graded score',
      );
    }

    submission.score = dto.score;
    submission.maxScore = maxScore;
    submission.tutorFeedback = dto.tutorFeedback ?? null;
    submission.reviewedBy = user.id;
    submission.reviewedAt = new Date();
    submission.status = 'reviewed';

    const saved = await this.submissionRepo.save(submission);

    // Audit log
    if (isRevision) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.score_revised',
        resourceType: 'assignment_submissions',
        resourceId: saved.id,
        requestId,
        reason: dto.revisionReason,
        safeMetadata: {
          assignmentId: assignment.id,
          studentUserId: submission.studentUserId,
          previousScore,
          newScore: dto.score,
          revisionReason: dto.revisionReason,
        },
      });
    } else {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.submission_graded',
        resourceType: 'assignment_submissions',
        resourceId: saved.id,
        requestId,
        safeMetadata: {
          assignmentId: assignment.id,
          studentUserId: submission.studentUserId,
          score: dto.score,
          maxScore,
        },
      });
    }

    // Notify Student & Guardians
    if (this.notificationService) {
      const gradeText = `${dto.score}/${maxScore}`;

      await this.notificationService
        .dispatch({
          userId: submission.studentUserId,
          recipientRole: 'student',
          eventType: 'assignment.graded',
          payload: {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            grade: gradeText,
          },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch student graded notification: ${err}`));

      const guardians = await this.guardianLinkRepo.find({
        where: { studentUserId: submission.studentUserId, status: 'active' },
      });

      for (const link of guardians) {
        await this.notificationService
          .dispatch({
            userId: link.guardianUserId,
            recipientRole: 'guardian',
            eventType: 'assignment.graded',
            payload: {
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              grade: gradeText,
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian graded notification: ${err}`),
          );
      }
    }

    return saved;
  }

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

    await this.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);

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
    await this.assertCanAccessStudentRecords(user, studentUserId);

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
