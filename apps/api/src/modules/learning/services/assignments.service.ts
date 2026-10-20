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
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AssignmentEntity, type AssignmentStatus } from '../entities/assignment.entity';
import {
  AssignmentSubmissionEntity,
  SubmissionStatus,
} from '../entities/assignment-submission.entity';
import { AssignmentRevisionEntity } from '../entities/assignment-revision.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { NotificationService } from '../../notifications/notification.service';
import { LearningAccessService } from './learning-access.service';
import { LearningMaterialsService } from './learning-materials.service';
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  LearningListQueryDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { toPageSize } from '../../../common/pagination';
import { computeAverageScorePercent, computeCompletionRate } from '../utils/learning-metrics';

export interface AssignmentView {
  id: string;
  bookingId: string;
  sessionId: string | null;
  tutorUserId: string;
  studentUserId: string;
  subjectId: string | null;
  title: string;
  topic: string | null;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  status: AssignmentStatus;
  publishedAt: string | null;
  resubmissionAllowed: boolean;
  lateSubmissionAllowed: boolean;
  maxAttempts: number;
  createdAt: string;
  submission: SubmissionView | null;
}

export interface SubmissionView {
  id: string;
  assignmentId: string;
  studentUserId: string;
  submissionText: string | null;
  assetIds: string[];
  submittedAt: string;
  status: SubmissionStatus;
  workflowState: 'submitted' | 'under_review' | 'reviewed' | 'returned' | 'late';
  attemptCount: number;
  score: number | null;
  maxScore: number | null;
  tutorFeedback: string | null;
  returnReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  canSubmitAgain: boolean;
}

/**
 * Homework lifecycle. Attachments are validated against `file_assets`
 * ownership/purpose before persistence; every overwrite snapshots the previous
 * attempt into `assignment_revisions`.
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
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access?: LearningAccessService,
    @Optional()
    @InjectRepository(AssignmentRevisionEntity)
    private readonly revisionRepo?: Repository<AssignmentRevisionEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    @Inject(forwardRef(() => LearningMaterialsService))
    private readonly materialsService?: LearningMaterialsService,
  ) {}

  async createAssignment(
    user: AuthenticatedUser,
    dto: CreateAssignmentDto,
    requestId?: string,
  ): Promise<AssignmentView> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { studentUser: true, subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    if (this.access) {
      this.access.assertCanAuthorLearning(user, booking);
    } else {
      const isTutor = booking.tutorUserId === user.id;
      if (!isTutor && !isAdminRole(user)) {
        throw new ForbiddenException(
          'Only the assigned tutor or admin can create assignments for this booking',
        );
      }
    }

    if (dto.sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
      if (!session || session.bookingId !== booking.id) {
        throw new BadRequestException('Provided sessionId does not belong to this booking');
      }
    }
    if (dto.subjectId && dto.subjectId !== booking.subjectId) {
      throw new BadRequestException('subjectId must match the booking subject');
    }
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid dueAt timestamp');
    }
    if (dueAt && dueAt.getTime() < Date.now()) {
      throw new BadRequestException('dueAt must be in the future');
    }

    // Backwards compatible default: published unless the caller opts into a
    // draft with `publishNow: false`.
    const publish = dto.publishNow !== false;
    const assignment = this.assignmentRepo.create({
      bookingId: booking.id,
      sessionId: dto.sessionId ?? null,
      tutorUserId: booking.tutorUserId,
      studentUserId: booking.studentUserId,
      subjectId: dto.subjectId ?? null,
      title: dto.title.trim(),
      topic: dto.topic ?? null,
      instructions: dto.instructions ?? null,
      dueAt,
      maxScore: dto.maxScore ?? 100,
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? new Date() : null,
      resubmissionAllowed: dto.resubmissionAllowed ?? true,
      lateSubmissionAllowed: dto.lateSubmissionAllowed ?? true,
      maxAttempts: dto.maxAttempts ?? 3,
    });

    const saved = await this.assignmentRepo.save(assignment);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.assignment_created',
      resourceType: 'assignments',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        studentUserId: booking.studentUserId,
        title: saved.title,
        maxScore: saved.maxScore,
        dueAt: saved.dueAt?.toISOString() ?? null,
        status: saved.status,
      },
    });

    if (publish) {
      await this.notifyAssignmentPublished(saved, booking, 'assignment.created');
    }

    return this.toAssignmentView(saved, null);
  }

  async publishAssignment(
    user: AuthenticatedUser,
    assignmentId: string,
    requestId?: string,
  ): Promise<AssignmentView> {
    const assignment = await this.getAssignmentOrFail(assignmentId);
    await this.assertCanAuthor(user, assignment);
    if (assignment.status === 'archived') {
      throw new BadRequestException('Archived assignments cannot be published');
    }
    if (assignment.status !== 'published') {
      assignment.status = 'published';
      assignment.publishedAt = assignment.publishedAt ?? new Date();
      await this.assignmentRepo.save(assignment);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.assignment_published',
        resourceType: 'assignments',
        resourceId: assignment.id,
        requestId,
        safeMetadata: { bookingId: assignment.bookingId },
      });
      const booking = await this.bookingRepo.findOne({
        where: { id: assignment.bookingId },
        relations: { subject: true },
      });
      if (booking)
        await this.notifyAssignmentPublished(assignment, booking, 'assignment.published');
    }
    return this.getAssignmentById(user, assignmentId);
  }

  async archiveAssignment(
    user: AuthenticatedUser,
    assignmentId: string,
    requestId?: string,
  ): Promise<AssignmentView> {
    const assignment = await this.getAssignmentOrFail(assignmentId);
    await this.assertCanAuthor(user, assignment);
    if (assignment.status !== 'archived') {
      assignment.status = 'archived';
      await this.assignmentRepo.save(assignment);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.assignment_archived',
        resourceType: 'assignments',
        resourceId: assignment.id,
        requestId,
        safeMetadata: { bookingId: assignment.bookingId },
      });
    }
    return this.getAssignmentById(user, assignmentId);
  }

  /** Role-scoped, offset-paginated assignment list. */
  async listAssignments(user: AuthenticatedUser, query: LearningListQueryDto) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);
    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);

    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.submissions', 'submission')
      .orderBy('assignment.createdAt', 'DESC')
      .addOrderBy('assignment.id', 'DESC');

    if (query.bookingId) {
      const booking = await this.bookingRepo.findOne({ where: { id: query.bookingId } });
      if (!booking) throw new NotFoundException(`Booking ${query.bookingId} not found`);
      await this.access?.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
      qb.andWhere('assignment.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.sessionId) {
      qb.andWhere('assignment.sessionId = :sessionId', { sessionId: query.sessionId });
    }

    if (isAdminRole(user)) {
      if (query.studentId) {
        qb.andWhere('assignment.studentUserId = :studentId', { studentId: query.studentId });
      }
    } else if (user.roles?.includes('tutor')) {
      qb.andWhere('assignment.tutorUserId = :tutorUserId', { tutorUserId: user.id });
      if (query.studentId) {
        qb.andWhere('assignment.studentUserId = :studentId', { studentId: query.studentId });
      }
    } else if (query.studentId) {
      await this.access?.assertCanAccessStudentRecords(user, query.studentId);
      qb.andWhere('assignment.studentUserId = :studentId', { studentId: query.studentId });
      qb.andWhere("assignment.status = 'published'");
    } else if (user.roles?.includes('guardian')) {
      if (childIds.length === 0) return { items: [], totalItems: 0, page, pageSize };
      qb.andWhere('assignment.studentUserId IN (:...childIds)', { childIds });
      qb.andWhere("assignment.status = 'published'");
    } else {
      qb.andWhere('assignment.studentUserId = :studentId', { studentId: user.id });
      qb.andWhere("assignment.status = 'published'");
    }

    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const views = rows.map((assignment) => {
      const ownSubmission = this.pickVisibleSubmission(assignment, user);
      return this.toAssignmentView(assignment, ownSubmission);
    });
    return { items: views, totalItems: total, page, pageSize };
  }

  async getAssignmentById(user: AuthenticatedUser, assignmentId: string): Promise<AssignmentView> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: {
        booking: { subject: true },
        studentUser: true,
        submissions: { studentUser: true },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (this.access) {
      await this.access.assertCanAccessStudentRecords(
        user,
        assignment.studentUserId,
        assignment.bookingId,
      );
    }

    const isOwner = isAdminRole(user) || assignment.tutorUserId === user.id;
    if (!isOwner && assignment.status !== 'published') {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    return this.toAssignmentView(assignment, this.pickVisibleSubmission(assignment, user));
  }

  async submitAssignment(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: SubmitAssignmentDto,
    requestId?: string,
  ): Promise<SubmissionView> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: { booking: true, studentUser: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (user.id !== assignment.studentUserId) {
      throw new ForbiddenException('Only the assigned learner can submit work for this assignment');
    }
    if (assignment.status !== 'published') {
      throw new BadRequestException('This assignment is not open for submissions');
    }
    if (dto.assetIds && dto.assetIds.length > 0) {
      if (!this.materialsService) {
        throw new BadRequestException('Attachment validation is unavailable');
      }
      await this.materialsService.assertParticipantFileAssets(user.id, dto.assetIds);
    }
    if (!dto.submissionText?.trim() && (!dto.assetIds || dto.assetIds.length === 0)) {
      throw new BadRequestException('Provide submission text or at least one attachment');
    }

    const now = new Date();
    const isLate = assignment.dueAt ? now > new Date(assignment.dueAt) : false;
    if (isLate && assignment.lateSubmissionAllowed === false) {
      throw new BadRequestException('Late submissions are not allowed for this assignment');
    }

    const existing = await this.submissionRepo.findOne({
      where: { assignmentId, studentUserId: user.id },
    });

    if (existing) {
      if (existing.status === 'reviewed') {
        throw new ConflictException(
          'This submission has already been reviewed; ask the tutor to return it for revision',
        );
      }
      if (assignment.resubmissionAllowed === false) {
        throw new ConflictException('Resubmission is not allowed for this assignment');
      }
      const attempts = existing.attemptCount ?? 1;
      if (attempts >= (assignment.maxAttempts ?? 3)) {
        throw new BadRequestException('Maximum submission attempts reached');
      }
      await this.snapshotAttempt(existing);
      existing.submissionText = dto.submissionText ?? null;
      existing.assetIds = dto.assetIds ?? [];
      existing.submittedAt = now;
      existing.status = isLate ? 'late' : 'submitted';
      existing.attemptCount = attempts + 1;
      existing.score = null;
      existing.tutorFeedback = null;
      existing.reviewedBy = null;
      existing.reviewedAt = null;
      existing.returnReason = null;
      existing.maxScore = assignment.maxScore;
      const saved = await this.submissionRepo.save(existing);
      await this.auditSubmission(user, saved, isLate, requestId);
      await this.notifyTutorSubmitted(assignment, saved, user.id);
      return this.toSubmissionView(saved, assignment);
    }

    const submission = this.submissionRepo.create({
      assignmentId,
      studentUserId: user.id,
      submissionText: dto.submissionText ?? null,
      assetIds: dto.assetIds ?? [],
      submittedAt: now,
      status: isLate ? 'late' : 'submitted',
      attemptCount: 1,
      maxScore: assignment.maxScore,
    });
    const saved = await this.submissionRepo.save(submission);
    await this.auditSubmission(user, saved, isLate, requestId);
    await this.notifyTutorSubmitted(assignment, saved, user.id);
    return this.toSubmissionView(saved, assignment);
  }

  /** Grade (review) a submission. Kept as the primary tutor action. */
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

    if (!isAdminRole(user) && assignment.tutorUserId !== user.id) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can grade this assignment submission',
      );
    }
    if (submission.status === 'returned') {
      throw new BadRequestException('This submission is awaiting student revision');
    }

    const maxScore = Number(assignment.maxScore) || 100;
    if (dto.score > maxScore) {
      throw new BadRequestException(
        `Score (${dto.score}) cannot exceed maximum score (${maxScore})`,
      );
    }

    const previousScore = submission.score !== null ? Number(submission.score) : null;
    const isRevision = previousScore !== null && previousScore !== dto.score;
    if (isRevision && (!dto.revisionReason || !dto.revisionReason.trim())) {
      throw new BadRequestException(
        'revisionReason is required when revising an already graded score',
      );
    }
    if (
      submission.status === 'reviewed' &&
      previousScore === dto.score &&
      (submission.tutorFeedback ?? '') === (dto.tutorFeedback ?? '')
    ) {
      return submission; // idempotent repeat of the same review
    }

    submission.score = dto.score;
    submission.maxScore = maxScore;
    submission.tutorFeedback = dto.tutorFeedback ?? null;
    submission.reviewedBy = user.id;
    submission.reviewedAt = new Date();
    submission.status = 'reviewed';
    submission.updatedAt = new Date();

    const saved = await this.submissionRepo.save(submission);

    await this.auditService.record({
      actorUserId: user.id,
      action: isRevision ? 'learning.score_revised' : 'learning.submission_graded',
      resourceType: 'assignment_submissions',
      resourceId: saved.id,
      requestId,
      reason: isRevision ? dto.revisionReason : undefined,
      safeMetadata: {
        assignmentId: assignment.id,
        studentUserId: submission.studentUserId,
        previousScore,
        newScore: dto.score,
        score: dto.score,
        maxScore,
      },
    });

    await this.notifyGraded(assignment, saved);
    return saved;
  }

  /** Return submitted work so the student can make another attempt. */
  async returnSubmission(
    user: AuthenticatedUser,
    submissionId: string,
    dto: ReturnSubmissionDto,
    requestId?: string,
  ): Promise<SubmissionView> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: { assignment: true },
    });
    if (!submission?.assignment) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    const assignment = submission.assignment;
    if (!isAdminRole(user) && assignment.tutorUserId !== user.id) {
      throw new ForbiddenException('Only the assigned tutor or admin can return this submission');
    }
    if (submission.status === 'returned') {
      return this.toSubmissionView(submission, assignment);
    }

    await this.snapshotAttempt(submission);
    submission.status = 'returned';
    submission.returnedAt = new Date();
    submission.returnReason = dto.returnReason.trim();
    submission.tutorFeedback = dto.tutorFeedback ?? submission.tutorFeedback;
    submission.reviewedBy = user.id;
    submission.reviewedAt = new Date();
    submission.updatedAt = new Date();
    const saved = await this.submissionRepo.save(submission);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.submission_returned',
      resourceType: 'assignment_submissions',
      resourceId: saved.id,
      requestId,
      reason: dto.returnReason,
      safeMetadata: { assignmentId: assignment.id, studentUserId: saved.studentUserId },
    });

    if (this.notificationService) {
      await this.notificationService
        .dispatch({
          userId: saved.studentUserId,
          recipientRole: 'student',
          eventType: 'assignment.returned',
          payload: {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            reason: dto.returnReason,
          },
        })
        .catch((err) => this.logger.warn(`Return notification failed: ${String(err)}`));
    }

    return this.toSubmissionView(saved, assignment);
  }

  async getSubmissionById(user: AuthenticatedUser, submissionId: string): Promise<SubmissionView> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: { assignment: true, studentUser: true },
    });
    if (!submission?.assignment) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (this.access) {
      await this.access.assertCanAccessStudentRecords(
        user,
        submission.studentUserId,
        submission.assignment.bookingId,
      );
    }
    const isOwner = isAdminRole(user) || submission.assignment.tutorUserId === user.id;
    if (!isOwner && submission.assignment.status !== 'published') {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    return this.toSubmissionView(submission, submission.assignment);
  }

  async listSubmissionRevisions(
    user: AuthenticatedUser,
    submissionId: string,
  ): Promise<AssignmentRevisionEntity[]> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: { assignment: true },
    });
    if (!submission?.assignment) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (this.access) {
      await this.access.assertCanAccessStudentRecords(
        user,
        submission.studentUserId,
        submission.assignment.bookingId,
      );
    }
    if (!this.revisionRepo) return [];
    return this.revisionRepo.find({
      where: { submissionId },
      order: { attemptNumber: 'DESC' },
      take: 20,
    });
  }

  /** Tutor review queue for one assignment. */
  async listSubmissions(user: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getAssignmentOrFail(assignmentId);
    await this.assertCanAuthor(user, assignment);

    const rows = await this.submissionRepo.find({
      where: { assignmentId },
      relations: { studentUser: true },
      order: { submittedAt: 'ASC' },
      take: 100,
    });

    return rows.map((row) => ({
      ...this.toSubmissionView(row, assignment),
      studentName: row.studentUser?.displayName ?? 'Student',
    }));
  }

  /** Evidence used by progress reporting; bounded and published-only. */
  async getStudentAssignmentMetrics(studentUserId: string): Promise<{
    published: number;
    submitted: number;
    reviewed: number;
    completionRate: number | null;
    averageScore: number | null;
  }> {
    const [assignments, submissions] = await Promise.all([
      this.assignmentRepo.find({
        where: { studentUserId, status: 'published' },
        take: 500,
      }),
      this.submissionRepo.find({ where: { studentUserId }, take: 500 }),
    ]);
    const publishedIds = new Set(assignments.map((a) => a.id));
    const relevant = submissions.filter((s) => publishedIds.has(s.assignmentId));
    const reviewed = relevant.filter((s) => s.status === 'reviewed');
    return {
      published: assignments.length,
      submitted: relevant.filter((s) => s.status !== 'returned').length,
      reviewed: reviewed.length,
      completionRate: computeCompletionRate(
        relevant.filter((s) => s.status !== 'returned').length,
        assignments.length,
      ),
      averageScore: computeAverageScorePercent(
        reviewed.map((s) => ({
          score: s.score !== null ? Number(s.score) : null,
          maxScore:
            s.maxScore !== null
              ? Number(s.maxScore)
              : Number(assignments.find((a) => a.id === s.assignmentId)?.maxScore ?? 0),
        })),
      ),
    };
  }

  private async assertCanAuthor(
    user: AuthenticatedUser,
    assignment: AssignmentEntity,
  ): Promise<void> {
    if (isAdminRole(user) || assignment.tutorUserId === user.id) return;
    throw new ForbiddenException('Only the assigned tutor or admin can manage this assignment');
  }

  private async getAssignmentOrFail(assignmentId: string): Promise<AssignmentEntity> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);
    return assignment;
  }

  private async snapshotAttempt(submission: AssignmentSubmissionEntity): Promise<void> {
    if (!this.revisionRepo) return;
    const exists = await this.revisionRepo.findOne({
      where: { submissionId: submission.id, attemptNumber: submission.attemptCount ?? 1 },
    });
    if (exists) return;
    await this.revisionRepo.save(
      this.revisionRepo.create({
        submissionId: submission.id,
        attemptNumber: submission.attemptCount ?? 1,
        submissionText: submission.submissionText,
        assetIds: submission.assetIds ?? [],
        submittedAt: submission.submittedAt,
        status: submission.status,
        score: submission.score,
        maxScore: submission.maxScore,
        tutorFeedback: submission.tutorFeedback,
        reviewedBy: submission.reviewedBy,
        reviewedAt: submission.reviewedAt,
        returnReason: submission.returnReason,
      }),
    );
  }

  private async auditSubmission(
    user: AuthenticatedUser,
    saved: AssignmentSubmissionEntity,
    isLate: boolean,
    requestId?: string,
  ): Promise<void> {
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.assignment_submitted',
      resourceType: 'assignment_submissions',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        assignmentId: saved.assignmentId,
        studentUserId: user.id,
        status: saved.status,
        attemptCount: saved.attemptCount,
        isLate,
      },
    });
  }

  private pickVisibleSubmission(
    assignment: AssignmentEntity,
    user: AuthenticatedUser,
  ): AssignmentSubmissionEntity | null {
    const submissions = assignment.submissions ?? [];
    const isOwner = isAdminRole(user) || assignment.tutorUserId === user.id;
    if (isOwner) {
      return submissions.find((s) => s.studentUserId === assignment.studentUserId) ?? null;
    }
    return submissions.find((s) => s.studentUserId === user.id) ?? null;
  }

  private toAssignmentView(
    assignment: AssignmentEntity,
    submission: AssignmentSubmissionEntity | null,
  ): AssignmentView {
    return {
      id: assignment.id,
      bookingId: assignment.bookingId,
      sessionId: assignment.sessionId,
      tutorUserId: assignment.tutorUserId,
      studentUserId: assignment.studentUserId,
      subjectId: assignment.subjectId,
      title: assignment.title,
      topic: assignment.topic,
      instructions: assignment.instructions,
      dueAt: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : null,
      maxScore: Number(assignment.maxScore),
      status: assignment.status,
      publishedAt: assignment.publishedAt ? new Date(assignment.publishedAt).toISOString() : null,
      resubmissionAllowed: assignment.resubmissionAllowed ?? true,
      lateSubmissionAllowed: assignment.lateSubmissionAllowed ?? true,
      maxAttempts: assignment.maxAttempts ?? 3,
      createdAt: this.iso(assignment.createdAt) ?? new Date(0).toISOString(),
      submission: submission ? this.toSubmissionView(submission, assignment) : null,
    };
  }

  private toSubmissionView(
    submission: AssignmentSubmissionEntity,
    assignment: AssignmentEntity,
  ): SubmissionView {
    const attempts = submission.attemptCount ?? 1;
    const canSubmitAgain =
      assignment.status === 'published' &&
      (assignment.resubmissionAllowed ?? true) &&
      submission.status !== 'reviewed' &&
      attempts < (assignment.maxAttempts ?? 3);

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentUserId: submission.studentUserId,
      submissionText: submission.submissionText,
      assetIds: submission.assetIds ?? [],
      submittedAt: this.iso(submission.submittedAt) ?? new Date(0).toISOString(),
      status: submission.status,
      workflowState:
        submission.status === 'reviewed'
          ? 'reviewed'
          : submission.status === 'returned'
            ? 'returned'
            : submission.status === 'late'
              ? 'late'
              : 'submitted',
      attemptCount: attempts,
      score: submission.score !== null ? Number(submission.score) : null,
      maxScore: submission.maxScore !== null ? Number(submission.maxScore) : null,
      tutorFeedback: submission.tutorFeedback,
      returnReason: submission.returnReason,
      reviewedBy: submission.reviewedBy,
      reviewedAt: submission.reviewedAt ? new Date(submission.reviewedAt).toISOString() : null,
      canSubmitAgain,
    };
  }

  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private async notifyAssignmentPublished(
    assignment: AssignmentEntity,
    booking: BookingEntity,
    eventType: 'assignment.created' | 'assignment.published',
  ): Promise<void> {
    if (!this.notificationService) return;
    const subjectName = booking.subject?.nameEn || 'Course';
    const dueDate = assignment.dueAt
      ? new Date(assignment.dueAt).toISOString().split('T')[0]
      : 'N/A';
    const payload = {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      subjectName,
      dueDate,
    };

    await this.notificationService
      .dispatch({
        userId: assignment.studentUserId,
        recipientRole: 'student',
        eventType,
        payload,
      })
      .catch((err) => this.logger.warn(`Student assignment notification failed: ${String(err)}`));

    const guardianIds = await this.guardianAccess.findActiveGuardianIds(assignment.studentUserId);
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType,
          payload,
        })
        .catch((err) =>
          this.logger.warn(`Guardian assignment notification failed: ${String(err)}`),
        );
    }
  }

  private async notifyTutorSubmitted(
    assignment: AssignmentEntity,
    submission: AssignmentSubmissionEntity,
    studentUserId: string,
  ): Promise<void> {
    if (!this.notificationService) return;
    void studentUserId;
    await this.notificationService
      .dispatch({
        userId: assignment.tutorUserId,
        recipientRole: 'tutor',
        eventType: 'assignment.submitted',
        payload: {
          assignmentId: assignment.id,
          studentName: assignment.studentUser?.displayName || 'Student',
          assignmentTitle: assignment.title,
        },
      })
      .catch((err) => this.logger.warn(`Tutor submission notification failed: ${String(err)}`));
    void submission;
  }

  private async notifyGraded(
    assignment: AssignmentEntity,
    submission: AssignmentSubmissionEntity,
  ): Promise<void> {
    if (!this.notificationService) return;
    const gradeText = `${submission.score}/${submission.maxScore}`;
    const payload = {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      grade: gradeText,
    };

    await this.notificationService
      .dispatch({
        userId: submission.studentUserId,
        recipientRole: 'student',
        eventType: 'assignment.graded',
        payload,
      })
      .catch((err) => this.logger.warn(`Student graded notification failed: ${String(err)}`));

    const guardianIds = await this.guardianAccess.findActiveGuardianIds(submission.studentUserId);
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'assignment.graded',
          payload,
        })
        .catch((err) => this.logger.warn(`Guardian graded notification failed: ${String(err)}`));
    }
  }
}
