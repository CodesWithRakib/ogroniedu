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
import { AssignmentEntity } from '../entities/assignment.entity';
import {
  AssignmentSubmissionEntity,
  SubmissionStatus,
} from '../entities/assignment-submission.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { NotificationService } from '../../notifications/notification.service';
import { CreateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';

/**
 * Homework lifecycle: tutor-created assignments, learner submissions
 * (with late tagging), and tutor grading with score-revision auditing.
 */
@Injectable()
export class LearningAssignmentsService {
  private readonly logger = new Logger(LearningAssignmentsService.name);

  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<AssignmentSubmissionEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

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
    const isAdmin = isAdminRole(user);
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

      const guardianIds = await this.guardianAccess.findActiveGuardianIds(
        booking.studentUserId,
      );

      for (const guardianId of guardianIds) {
        await this.notificationService
          .dispatch({
            userId: guardianId,
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
    const isAdmin = isAdminRole(user);
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

      const guardianIds = await this.guardianAccess.findActiveGuardianIds(
        submission.studentUserId,
      );

      for (const guardianId of guardianIds) {
        await this.notificationService
          .dispatch({
            userId: guardianId,
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
}
