import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import {
  TUTOR_VERIFICATION_POLICY,
  type TutorVerificationLevel,
  type VerificationLevelDecision,
  type VerificationLevelStatus,
} from '@ogroniedu/contracts';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import { TutorQualificationEntity } from '../entities/tutor-qualification.entity';
import { TutorVerificationReviewEntity } from '../entities/tutor-verification-review.entity';
import { TutorVerificationLevelEntity } from '../entities/tutor-verification-level.entity';
import { TutorVerificationDocumentEntity } from '../entities/tutor-verification-document.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { FilesService } from '../../files/files.service';
import {
  AdminReviewTutorDto,
  ReviewerDecisionDto,
  VerifyVerificationDocumentDto,
  VerificationQueueQueryDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { TUTOR_VERIFICATION_POLICY_VERSION } from '../constants/tutor.constants';
import { VERIFICATION_SIGNED_URL_TTL_SECONDS } from '../constants/verification-policy.constants';
import { isAdminRole } from '../../../common/auth/role.utils';
import {
  canTransitionLevel,
  evaluateLevelRequirements,
  resolveLevelExpiry,
} from './verification-state-machine';
import { TutorVerificationStatusService } from './tutor-verification-status.service';
import { TutorVerificationReviewerDirectoryService } from './tutor-verification-reviewer-directory.service';

const QUEUE_DEFAULT_STATUSES: readonly VerificationLevelStatus[] = ['submitted', 'under_review'];

function primaryReviewerRole(user: AuthenticatedUser): string {
  if (user.roles?.includes('super_admin')) return 'super_admin';
  if (user.roles?.includes('admin')) return 'admin';
  return 'compliance_reviewer';
}

/**
 * Reviewer side of the verification workflow: paginated queue, dossier views,
 * per-level decisions, document review and reviewer-scoped document access.
 *
 * Authorization model (enforced here, not in the UI):
 *  - `admin`/`super_admin` may review any dossier and (re)assign cases.
 *  - `compliance_reviewer` may review unassigned cases and cases assigned to
 *    themselves; it cannot reassign work to other users and never inherits
 *    admin powers.
 *  - Nobody may decide their own dossier (self-approval denial).
 */
@Injectable()
export class TutorVerificationService {
  private readonly logger = new Logger(TutorVerificationService.name);

  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorQualificationEntity)
    private readonly qualificationRepo: Repository<TutorQualificationEntity>,
    @InjectRepository(TutorVerificationReviewEntity)
    private readonly reviewRepo: Repository<TutorVerificationReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @InjectRepository(TutorVerificationLevelEntity)
    private readonly levelRepo?: Repository<TutorVerificationLevelEntity>,
    @Optional()
    @InjectRepository(TutorVerificationDocumentEntity)
    private readonly documentRepo?: Repository<TutorVerificationDocumentEntity>,
    @Optional()
    @Inject(forwardRef(() => TutorVerificationStatusService))
    private readonly statusService?: TutorVerificationStatusService,
    @Optional()
    @Inject(forwardRef(() => FilesService))
    private readonly filesService?: FilesService,
    @Optional()
    @Inject(forwardRef(() => TutorVerificationReviewerDirectoryService))
    private readonly reviewerDirectory?: TutorVerificationReviewerDirectoryService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Queue                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Paginated, server-filtered review queue. One row per *level* awaiting a
   * decision, so a partially approved dossier surfaces exactly the level the
   * reviewer still has to decide.
   */
  async getVerificationQueue(reviewer: AuthenticatedUser, query: VerificationQueueQueryDto) {
    if (!this.levelRepo) {
      return { data: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    }
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const qb = this.levelRepo
      .createQueryBuilder('lvl')
      .innerJoin('tutor_profiles', 'p', 'p.user_id = lvl.tutor_user_id')
      .innerJoin('users', 'u', 'u.id = lvl.tutor_user_id')
      .where('u.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('lvl.status = :status', { status: query.status });
    } else if (query.overallStatus) {
      qb.andWhere('p.verification_status = :overall', { overall: query.overallStatus });
    } else {
      qb.andWhere('lvl.status IN (:...statuses)', { statuses: [...QUEUE_DEFAULT_STATUSES] });
    }
    if (query.level) qb.andWhere('lvl.level = :level', { level: query.level });
    if (query.assignment === 'assigned_to_me') {
      qb.andWhere('lvl.assigned_reviewer_user_id = :me', { me: reviewer.id });
    } else if (query.assignment === 'unassigned') {
      qb.andWhere('lvl.assigned_reviewer_user_id IS NULL');
    }
    if (query.q && query.q.trim()) {
      qb.andWhere('(u.display_name ILIKE :term OR u.email ILIKE :term OR p.headline ILIKE :term)', {
        term: `%${query.q.trim()}%`,
      });
    }
    if (query.submittedFrom) {
      qb.andWhere('lvl.last_submitted_at >= :from', { from: `${query.submittedFrom}T00:00:00Z` });
    }
    if (query.submittedTo) {
      qb.andWhere('lvl.last_submitted_at < :to', { to: `${query.submittedTo}T00:00:00Z` });
    }

    switch (query.sort) {
      case 'newest':
        qb.orderBy('lvl.last_submitted_at', 'DESC', 'NULLS LAST');
        break;
      case 'expiring_soon':
        qb.orderBy('lvl.expires_at', 'ASC', 'NULLS LAST');
        break;
      case 'oldest_waiting':
      default:
        qb.orderBy('lvl.last_submitted_at', 'ASC', 'NULLS LAST');
        break;
    }
    qb.addOrderBy('lvl.created_at', 'ASC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [levelRows, total] = await qb.getManyAndCount();
    if (levelRows.length === 0) {
      return { data: [], total, page, pageSize };
    }

    const tutorIds = [...new Set(levelRows.map((row) => row.tutorUserId))];
    const [profiles, users] = await Promise.all([
      this.profileRepo.find({ where: { userId: In(tutorIds) } }),
      this.userRepo.find({ where: { id: In(tutorIds) } }),
    ]);
    const profileById = new Map(profiles.map((profile) => [profile.userId, profile]));
    const userById = new Map(users.map((user) => [user.id, user]));

    const pendingCounts = this.documentRepo
      ? await this.countPendingDocuments(tutorIds)
      : new Map<string, number>();

    const data = levelRows.map((row) => {
      const profile = profileById.get(row.tutorUserId);
      const user = userById.get(row.tutorUserId);
      return {
        tutorUserId: row.tutorUserId,
        displayName: user?.displayName ?? 'Unknown',
        email: user?.email ?? null,
        phoneE164: user?.phoneE164 ?? null,
        headline: profile?.headline ?? null,
        accountStatus: user?.status ?? null,
        level: row.level,
        levelStatus: row.status,
        levelVersion: row.version,
        assignedReviewerUserId: row.assignedReviewerUserId,
        assignedToMe: row.assignedReviewerUserId === reviewer.id,
        overallVerificationStatus: profile?.verificationStatus ?? 'not_submitted',
        publicationStatus: profile?.publicationStatus ?? 'draft',
        submissionCount: row.submissionCount,
        submittedAt: row.lastSubmittedAt,
        expiresAt: row.expiresAt,
        pendingDocuments: pendingCounts.get(`${row.tutorUserId}:${row.level}`) ?? 0,
        canDecide:
          isAdminRole(reviewer) ||
          row.assignedReviewerUserId === null ||
          row.assignedReviewerUserId === reviewer.id,
      };
    });
    return { data, total, page, pageSize };
  }

  private async countPendingDocuments(tutorIds: string[]): Promise<Map<string, number>> {
    if (!this.documentRepo) return new Map();
    const rows = await this.documentRepo
      .createQueryBuilder('doc')
      .select('doc.tutor_user_id', 'tutorUserId')
      .addSelect('doc.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('doc.tutor_user_id IN (:...tutorIds)', { tutorIds })
      .andWhere('doc.deleted_at IS NULL')
      .andWhere("doc.review_status = 'pending'")
      .groupBy('doc.tutor_user_id')
      .addGroupBy('doc.level')
      .getRawMany<{ tutorUserId: string; level: string; count: string }>();
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(`${row.tutorUserId}:${row.level}`, Number(row.count));
    }
    return map;
  }

  /**
   * Legacy unfiltered pending list (kept for API compatibility).
   * Prefer `getVerificationQueue` for new surfaces.
   */
  async getPendingVerificationTutors() {
    const profiles = await this.profileRepo.find({
      where: { verificationStatus: In(['submitted', 'under_review', 'needs_information']) },
      relations: { qualifications: true },
      order: { updatedAt: 'ASC' },
    });
    const userIds = profiles.map((p) => p.userId);
    const users =
      userIds.length > 0 ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    return profiles.map((p) => {
      const u = users.find((user) => user.id === p.userId);
      return {
        userId: p.userId,
        displayName: u?.displayName || 'Unknown',
        email: u?.email,
        phoneE164: u?.phoneE164,
        headline: p.headline,
        verificationStatus: p.verificationStatus,
        publicationStatus: p.publicationStatus,
        qualificationsCount: (p.qualifications || []).length,
        submittedAt: p.updatedAt,
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Dossier                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Reviewer dossier. Legacy fields (`profile`, `user`, `reviewHistory`) are
   * preserved for the existing admin surface; `levels` and `documents` carry
   * the Phase-02 data. Internal notes are only ever returned here.
   */
  async getReviewDossier(tutorId: string, reviewer?: AuthenticatedUser) {
    const profile = await this.profileRepo.findOne({
      where: { userId: tutorId },
      relations: {
        qualifications: { evidenceAsset: true },
        subjects: true,
        serviceAreas: true,
        availabilities: true,
      },
    });
    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }
    const user = await this.userRepo.findOne({ where: { id: tutorId } });
    const reviewHistory = await this.reviewRepo.find({
      where: { tutorUserId: tutorId },
      order: { createdAt: 'DESC' },
    });
    const base = {
      profile,
      user: user
        ? {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            phoneE164: user.phoneE164,
            status: user.status,
            createdAt: user.createdAt,
          }
        : null,
      reviewHistory,
      verificationPolicyVersion:
        profile.verificationPolicyVersion ?? TUTOR_VERIFICATION_POLICY_VERSION,
    };
    if (!this.levelRepo || !this.statusService) return base;

    const levels = await this.statusService.ensureLevels(
      tutorId,
      profile.verificationPolicyVersion ?? TUTOR_VERIFICATION_POLICY_VERSION,
    );
    const documents = this.documentRepo
      ? await this.documentRepo.find({
          where: { tutorUserId: tutorId, deletedAt: IsNull() },
          relations: { fileAsset: true },
          order: { createdAt: 'DESC' },
        })
      : [];

    return {
      ...base,
      levels: levels
        .filter((row) => !reviewer || this.canReviewerAccessLevel(reviewer, row))
        .map((row) => {
          const levelDocuments = documents.filter((document) => document.level === row.level);
          const requirements = evaluateLevelRequirements(
            row.level,
            row.status,
            levelDocuments.map((document) => ({
              documentType: document.documentType,
              reviewStatus: document.reviewStatus,
            })),
          );
          return {
            id: row.id,
            level: row.level,
            status: row.status,
            version: row.version,
            submissionCount: row.submissionCount,
            assignedReviewerUserId: row.assignedReviewerUserId,
            decidedByUserId: row.decidedByUserId,
            decisionReasonCode: row.decisionReasonCode,
            applicantFeedback: row.applicantFeedback,
            internalNotes: row.internalNotes,
            expiresAt: row.expiresAt,
            firstSubmittedAt: row.firstSubmittedAt,
            lastSubmittedAt: row.lastSubmittedAt,
            decidedAt: row.decidedAt,
            policyVersion: row.policyVersion,
            requirements,
            documents: levelDocuments.map((document) => ({
              id: document.id,
              level: document.level,
              documentType: document.documentType,
              fileAssetId: document.fileAssetId,
              originalFilename: document.fileAsset?.originalFilename ?? null,
              mediaType: document.fileAsset?.mediaType ?? null,
              sizeBytes: document.fileAsset ? Number(document.fileAsset.sizeBytes) : null,
              reviewStatus: document.reviewStatus,
              reasonCode: document.reasonCode,
              expiresOn: document.expiresOn,
              reviewedAt: document.reviewedAt,
              createdAt: document.createdAt,
            })),
          };
        }),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Decisions                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Decide one verification level. Validates the transition, mandatory
   * evidence, reviewer scope, self-approval and the optimistic-concurrency
   * version, then persists the level, the review-history row, the audit entry,
   * the recomputed derived status and finally the notification.
   */
  async decideLevel(
    reviewer: AuthenticatedUser,
    tutorId: string,
    level: TutorVerificationLevel,
    dto: ReviewerDecisionDto,
  ) {
    if (!this.levelRepo || !this.statusService) {
      throw new BadRequestException('Verification levels are not available in this environment.');
    }
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot decide verification on their own tutor profile.',
      );
    }
    const levelRow = await this.statusService.getLevel(tutorId, level);
    if (!levelRow) {
      throw new NotFoundException(`Verification level '${level}' not found for tutor: ${tutorId}`);
    }
    this.assertReviewerCanDecide(reviewer, levelRow);

    if (dto.expectedVersion !== undefined && dto.expectedVersion !== levelRow.version) {
      throw new ConflictException(
        'This verification level was updated by another reviewer. Reload the dossier before deciding.',
      );
    }

    const targetStatus = this.resolveLevelTarget(levelRow.status, dto.decision);
    if (!canTransitionLevel(levelRow.status, targetStatus)) {
      throw new ConflictException(
        `Illegal verification transition: ${levelRow.status} -> ${targetStatus}.`,
      );
    }
    if (
      (dto.decision === 'rejected' ||
        dto.decision === 'needs_information' ||
        dto.decision === 'suspended') &&
      !dto.applicantFeedback?.trim()
    ) {
      throw new BadRequestException(
        'Applicant-facing feedback is required for a rejection, information request or suspension.',
      );
    }
    if (targetStatus === 'approved' && this.documentRepo) {
      const documents = await this.documentRepo.find({
        where: { tutorUserId: tutorId, level, deletedAt: IsNull() },
      });
      const requirements = evaluateLevelRequirements(
        level,
        levelRow.status,
        documents.map((document) => ({
          documentType: document.documentType,
          reviewStatus: document.reviewStatus,
        })),
      );
      if (!requirements.complete) {
        const missing = [
          ...requirements.missingRequiredDocumentTypes,
          ...(requirements.anyOfSatisfied ? [] : requirements.anyOfDocumentTypes),
        ];
        throw new BadRequestException(
          `The ${level} level cannot be approved while mandatory evidence is unapproved: ${missing.join(', ')}.`,
        );
      }
    }

    const now = new Date();
    const fromStatus = levelRow.status;
    const policyVersion = dto.policyVersion ?? levelRow.policyVersion;
    levelRow.status = targetStatus;
    levelRow.version += 1;
    levelRow.decidedAt = now;
    levelRow.decidedByUserId = reviewer.id;
    levelRow.decisionReasonCode = dto.reasonCode;
    levelRow.applicantFeedback = dto.applicantFeedback?.trim() || null;
    levelRow.internalNotes = dto.internalNotes?.trim() || null;
    levelRow.assignedReviewerUserId = levelRow.assignedReviewerUserId ?? reviewer.id;
    levelRow.policyVersion = policyVersion;
    levelRow.expiresAt = targetStatus === 'approved' ? resolveLevelExpiry(level, now) : null;
    const savedLevel = await this.levelRepo.save(levelRow);

    await this.reviewRepo.save(
      this.reviewRepo.create({
        tutorUserId: tutorId,
        reviewerUserId: reviewer.id,
        decision: dto.decision === 'reinstated' ? 'reinstated' : dto.decision,
        reasonCode: dto.reasonCode,
        internalNotes: levelRow.internalNotes,
        applicantFeedback: levelRow.applicantFeedback,
        level,
        fromStatus,
        toStatus: targetStatus,
        reviewerRole: primaryReviewerRole(reviewer),
        policyVersion,
      }),
    );

    const profile = await this.statusService.recomputeDerivedStatus(tutorId, policyVersion);

    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.level_decided',
      resourceType: 'tutor_verification_level',
      resourceId: savedLevel.id,
      reason: dto.reasonCode,
      safeMetadata: {
        tutorId,
        level,
        decision: dto.decision,
        fromStatus,
        toStatus: targetStatus,
        reviewerRole: primaryReviewerRole(reviewer),
        internalNotesPresent: Boolean(levelRow.internalNotes),
      },
    });

    await this.notifyLevelDecision(
      tutorId,
      level,
      dto.decision,
      targetStatus,
      profile.verificationStatus,
    );
    return { level: savedLevel, profile };
  }

  /** Reviewer decision on a single evidence document. */
  async verifyDocument(
    reviewer: AuthenticatedUser,
    tutorId: string,
    documentId: string,
    dto: VerifyVerificationDocumentDto,
  ): Promise<TutorVerificationDocumentEntity> {
    if (!this.documentRepo || !this.statusService) {
      throw new BadRequestException('Dossier documents are not available in this environment.');
    }
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify evidence on their own profile.',
      );
    }
    const document = await this.documentRepo.findOne({
      where: { id: documentId, tutorUserId: tutorId, deletedAt: IsNull() },
    });
    if (!document) {
      throw new NotFoundException(
        `Verification document not found for tutor ${tutorId}: ${documentId}`,
      );
    }
    if (document.reviewStatus === 'superseded') {
      throw new ConflictException('A superseded document can no longer be reviewed.');
    }
    const levelRow = await this.statusService.getLevel(tutorId, document.level);
    if (levelRow) this.assertReviewerCanDecide(reviewer, levelRow);

    const wasApproved = document.reviewStatus === 'approved';
    document.reviewStatus = dto.reviewStatus;
    document.reviewedByUserId = reviewer.id;
    document.reviewedAt = new Date();
    document.reasonCode = dto.reasonCode ?? null;
    const saved = await this.documentRepo.save(document);
    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.document_reviewed',
      resourceType: 'tutor_verification_document',
      resourceId: documentId,
      reason: dto.reasonCode,
      safeMetadata: { tutorId, level: document.level, reviewStatus: dto.reviewStatus },
    });

    // Revoking an approved document invalidates the level it was approved for.
    if (
      wasApproved &&
      dto.reviewStatus === 'rejected' &&
      levelRow &&
      levelRow.status === 'approved'
    ) {
      const now = new Date();
      await this.reviewRepo.save(
        this.reviewRepo.create({
          tutorUserId: tutorId,
          reviewerUserId: reviewer.id,
          decision: 'needs_information',
          reasonCode: dto.reasonCode ?? 'evidence_revoked',
          applicantFeedback: levelRow.applicantFeedback,
          level: document.level,
          documentId,
          fromStatus: 'approved',
          toStatus: 'needs_information',
          reviewerRole: primaryReviewerRole(reviewer),
          policyVersion: levelRow.policyVersion,
        }),
      );
      levelRow.status = 'needs_information';
      levelRow.version += 1;
      levelRow.decidedAt = now;
      levelRow.decidedByUserId = reviewer.id;
      levelRow.decisionReasonCode = dto.reasonCode ?? 'evidence_revoked';
      levelRow.expiresAt = null;
      await this.levelRepo!.save(levelRow);
      await this.statusService.recomputeDerivedStatus(tutorId, levelRow.policyVersion);
    }
    return saved;
  }

  /**
   * Claims an unassigned case or, for admins, assigns it to another reviewer.
   * A compliance reviewer may only ever act on unassigned or self-assigned work.
   */
  async assignLevel(
    reviewer: AuthenticatedUser,
    tutorId: string,
    level: TutorVerificationLevel,
    targetReviewerUserId?: string,
  ): Promise<TutorVerificationLevelEntity> {
    if (!this.levelRepo || !this.statusService) {
      throw new BadRequestException('Verification levels are not available in this environment.');
    }
    const levelRow = await this.statusService.getLevel(tutorId, level);
    if (!levelRow) {
      throw new NotFoundException(`Verification level '${level}' not found for tutor: ${tutorId}`);
    }
    const target = targetReviewerUserId ?? reviewer.id;
    const assigningToOther = target !== reviewer.id;
    if (assigningToOther && !isAdminRole(reviewer)) {
      throw new ForbiddenException(
        'Access denied: only an administrator can assign a verification case to another reviewer.',
      );
    }
    if (
      !assigningToOther &&
      levelRow.assignedReviewerUserId &&
      levelRow.assignedReviewerUserId !== reviewer.id
    ) {
      throw new ForbiddenException(
        'Access denied: this verification case is assigned to another reviewer.',
      );
    }
    if (assigningToOther) {
      const targetUser = await this.userRepo.findOne({ where: { id: target } });
      if (!targetUser || targetUser.status !== 'active' || targetUser.deletedAt) {
        throw new BadRequestException('The selected reviewer account is not active.');
      }
    }
    levelRow.assignedReviewerUserId = target;
    levelRow.version += 1;
    const saved = await this.levelRepo.save(levelRow);
    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.level_assigned',
      resourceType: 'tutor_verification_level',
      resourceId: saved.id,
      safeMetadata: { tutorId, level, assignedTo: target, assignedBy: reviewer.id },
    });
    if (assigningToOther && this.notificationService) {
      const [tutor, reviewers] = await Promise.all([
        this.userRepo.findOne({ where: { id: tutorId } }),
        this.reviewerDirectory?.findActiveReviewers() ?? Promise.resolve([]),
      ]);
      const recipient = reviewers.find((entry) => entry.userId === target);
      if (!recipient) {
        this.logger.warn(
          `Assignee ${target} does not hold an active reviewer grant; assignment notification skipped.`,
        );
      } else {
        try {
          await this.notificationService.dispatch({
            userId: target,
            eventType: 'tutor.review_assigned',
            recipientRole: recipient.notificationRole,
            payload: {
              level: TUTOR_VERIFICATION_POLICY[level].labelEn,
              tutorName: tutor?.displayName ?? 'A tutor',
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to notify reviewer ${target} about assignment: ${String(err)}`);
        }
      }
    }
    return saved;
  }

  /**
   * Authorization-checked signed download for private dossier evidence.
   * The generic `/files/:id/access` route stays closed to compliance reviewers;
   * access to dossier evidence goes through this reviewer-scoped path only.
   */
  async getDocumentAccess(
    reviewer: AuthenticatedUser,
    tutorId: string,
    documentId: string,
  ): Promise<{
    document: TutorVerificationDocumentEntity;
    signedAccessUrl: string;
    expiresAt: string;
  }> {
    if (!this.documentRepo || !this.filesService || !this.statusService) {
      throw new BadRequestException('Dossier documents are not available in this environment.');
    }
    const document = await this.documentRepo.findOne({
      where: { id: documentId, tutorUserId: tutorId, deletedAt: IsNull() },
    });
    if (!document) {
      throw new NotFoundException(
        `Verification document not found for tutor ${tutorId}: ${documentId}`,
      );
    }
    const levelRow = await this.statusService.getLevel(tutorId, document.level);
    if (levelRow) this.assertReviewerCanDecide(reviewer, levelRow);
    const access = await this.filesService.issueSignedAccess(
      document.fileAssetId,
      reviewer.id,
      VERIFICATION_SIGNED_URL_TTL_SECONDS,
    );
    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.document_accessed',
      resourceType: 'tutor_verification_document',
      resourceId: document.id,
      safeMetadata: { tutorId, level: document.level },
    });
    return {
      document,
      signedAccessUrl: access.signedUrl,
      expiresAt: access.expiresAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Legacy profile-level decision (pre-Phase-02 contract)              */
  /* ------------------------------------------------------------------ */

  /**
   * Legacy coarse decision. Kept for API compatibility; when the level model is
   * present the decision is projected onto the level rows so the derived status
   * can never disagree with the recorded decision.
   */
  async submitReviewDecision(
    reviewer: AuthenticatedUser,
    tutorId: string,
    dto: AdminReviewTutorDto,
  ): Promise<TutorVerificationReviewEntity> {
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify, approve, or alter their own tutor profile.',
      );
    }
    const profile = await this.profileRepo.findOne({ where: { userId: tutorId } });
    if (!profile) {
      throw new NotFoundException(`Tutor profile not found for user: ${tutorId}`);
    }
    const policyVersion = dto.policyVersion || TUTOR_VERIFICATION_POLICY_VERSION;
    const review = this.reviewRepo.create({
      tutorUserId: tutorId,
      reviewerUserId: reviewer.id,
      decision: dto.decision,
      reasonCode: dto.reasonCode,
      internalNotes: dto.internalNotes ?? null,
      applicantFeedback: dto.applicantFeedback ?? null,
      reviewerRole: primaryReviewerRole(reviewer),
      policyVersion,
    });
    const savedReview = await this.reviewRepo.save(review);

    if (this.levelRepo && this.statusService) {
      await this.projectLegacyDecisionOntoLevels(reviewer, tutorId, dto.decision, policyVersion);
      await this.statusService.recomputeDerivedStatus(tutorId, policyVersion);
    } else {
      switch (dto.decision) {
        case 'approved':
          profile.verificationStatus = 'approved';
          break;
        case 'rejected':
          profile.verificationStatus = 'rejected';
          profile.publicationStatus = 'unpublished';
          break;
        case 'needs_information':
          profile.verificationStatus = 'needs_information';
          break;
        case 'suspended':
          profile.verificationStatus = 'suspended';
          profile.publicationStatus = 'unpublished';
          break;
        case 'reinstated':
          profile.verificationStatus = 'approved';
          break;
      }
      profile.profileUpdatedAt = new Date();
      await this.profileRepo.save(profile);
    }

    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.verification.reviewed',
      resourceType: 'tutor_profile',
      resourceId: tutorId,
      reason: dto.reasonCode,
      safeMetadata: {
        decision: dto.decision,
        policyVersion,
        internalNotesPresent: Boolean(dto.internalNotes),
      },
    });

    if (this.notificationService) {
      try {
        if (dto.decision === 'approved' || dto.decision === 'reinstated') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.verified',
            recipientRole: 'tutor',
            payload: {},
          });
        } else if (dto.decision === 'needs_information') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.needs_information',
            recipientRole: 'tutor',
            // Applicant-facing text only: internal reviewer notes must never
            // travel in a tutor notification payload.
            payload: { notes: dto.applicantFeedback || dto.reasonCode },
          });
        } else if (dto.decision === 'rejected') {
          await this.notificationService.dispatch({
            userId: tutorId,
            eventType: 'tutor.rejected',
            recipientRole: 'tutor',
            payload: { notes: dto.applicantFeedback || dto.reasonCode },
          });
        }
      } catch (err) {
        this.logger.warn(
          `Failed to dispatch verification notification to tutor ${tutorId}: ${err}`,
        );
      }
    }
    return savedReview;
  }

  async verifyQualification(
    reviewer: AuthenticatedUser,
    tutorId: string,
    qualificationId: string,
    reviewStatus: 'approved' | 'rejected',
  ): Promise<TutorQualificationEntity> {
    if (reviewer.id === tutorId) {
      throw new ForbiddenException(
        'Self-approval denial: Reviewer cannot verify qualifications on their own profile.',
      );
    }
    const qualification = await this.qualificationRepo.findOne({
      where: { id: qualificationId, tutorUserId: tutorId },
    });
    if (!qualification) {
      throw new NotFoundException(
        `Qualification not found for tutor ${tutorId}: ${qualificationId}`,
      );
    }
    qualification.reviewStatus = reviewStatus;
    const saved = await this.qualificationRepo.save(qualification);

    // Keep the dossier evidence row for the same file in step with the
    // qualification decision so level requirements stay truthful.
    if (this.documentRepo && qualification.evidenceAssetId) {
      const document = await this.documentRepo.findOne({
        where: {
          tutorUserId: tutorId,
          fileAssetId: qualification.evidenceAssetId,
          deletedAt: IsNull(),
        },
      });
      if (document && document.reviewStatus !== 'superseded') {
        document.reviewStatus = reviewStatus;
        document.reviewedByUserId = reviewer.id;
        document.reviewedAt = new Date();
        await this.documentRepo.save(document);
      }
    }

    await this.auditService.record({
      actorUserId: reviewer.id,
      action: 'tutor.qualification.reviewed',
      resourceType: 'tutor_qualification',
      resourceId: qualificationId,
      safeMetadata: { tutorId, reviewStatus },
    });
    return saved;
  }

  /* ------------------------------------------------------------------ */
  /* internals                                                          */
  /* ------------------------------------------------------------------ */

  private resolveLevelTarget(
    fromStatus: VerificationLevelStatus,
    decision: VerificationLevelDecision,
  ): VerificationLevelStatus {
    switch (decision) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'needs_information':
        return 'needs_information';
      case 'suspended':
        return 'suspended';
      case 'reinstated':
        return fromStatus === 'suspended' ? 'under_review' : fromStatus;
      default:
        return fromStatus;
    }
  }

  /** Compliance reviewers only see unassigned work or their own assignments. */
  private canReviewerAccessLevel(
    reviewer: AuthenticatedUser,
    levelRow: TutorVerificationLevelEntity,
  ): boolean {
    if (isAdminRole(reviewer)) return true;
    return (
      levelRow.assignedReviewerUserId === null || levelRow.assignedReviewerUserId === reviewer.id
    );
  }

  private assertReviewerCanDecide(
    reviewer: AuthenticatedUser,
    levelRow: TutorVerificationLevelEntity,
  ): void {
    if (!this.canReviewerAccessLevel(reviewer, levelRow)) {
      throw new ForbiddenException(
        'Access denied: this verification case is assigned to another reviewer.',
      );
    }
  }

  private async projectLegacyDecisionOntoLevels(
    reviewer: AuthenticatedUser,
    tutorId: string,
    decision: AdminReviewTutorDto['decision'],
    policyVersion: string,
  ): Promise<void> {
    if (!this.levelRepo) return;
    const levels = await this.levelRepo.find({ where: { tutorUserId: tutorId } });
    const now = new Date();
    for (const row of levels) {
      if (decision === 'approved' || decision === 'reinstated') {
        row.status = 'approved';
        row.expiresAt = resolveLevelExpiry(row.level, now);
      } else if (decision === 'rejected') {
        row.status = 'rejected';
        row.expiresAt = null;
      } else if (decision === 'suspended') {
        row.status = 'suspended';
        row.expiresAt = null;
      } else if (decision === 'needs_information' && row.status !== 'approved') {
        row.status = 'needs_information';
      }
      row.policyVersion = policyVersion;
      row.decidedByUserId = reviewer.id;
      row.decidedAt = now;
      row.version += 1;
      await this.levelRepo.save(row);
    }
  }

  private async notifyLevelDecision(
    tutorId: string,
    level: TutorVerificationLevel,
    decision: VerificationLevelDecision,
    targetStatus: VerificationLevelStatus,
    overallStatus: string,
  ): Promise<void> {
    if (!this.notificationService) return;
    const payload = {
      level: TUTOR_VERIFICATION_POLICY[level].labelEn,
      status: targetStatus,
    };
    try {
      if (decision === 'approved' && overallStatus === 'approved') {
        await this.notificationService.dispatch({
          userId: tutorId,
          eventType: 'tutor.verified',
          recipientRole: 'tutor',
          payload: {},
        });
      } else if (decision === 'approved') {
        await this.notificationService.dispatch({
          userId: tutorId,
          eventType: 'tutor.level_approved',
          recipientRole: 'tutor',
          payload,
        });
      } else if (decision === 'suspended') {
        await this.notificationService.dispatch({
          userId: tutorId,
          eventType: 'tutor.verification_suspended',
          recipientRole: 'tutor',
          payload,
        });
      } else {
        // needs_information / rejected / reinstated. The applicant-facing
        // feedback lives on the level row and is read from `/tutors/me/verification`;
        // notification payloads stay free of reviewer notes and document URLs.
        await this.notificationService.dispatch({
          userId: tutorId,
          eventType: 'tutor.level_decided',
          recipientRole: 'tutor',
          payload,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to dispatch level decision notification to tutor ${tutorId}: ${String(err)}`,
      );
    }
  }
}
