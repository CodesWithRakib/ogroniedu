import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { type TutorVerificationLevel, type VerificationLevelStatus } from '@ogroniedu/contracts';
import { TutorProfileEntity } from '../entities/tutor-profile.entity';
import { TutorVerificationLevelEntity } from '../entities/tutor-verification-level.entity';
import { TutorVerificationDocumentEntity } from '../entities/tutor-verification-document.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { AddVerificationDocumentDto } from '../dto/verification-dossier.dto';
import {
  TUTOR_VERIFICATION_POLICY,
  VERIFICATION_EVIDENCE_PURPOSE,
} from '../constants/verification-policy.constants';
import {
  canSubmitLevel,
  evaluateLevelRequirements,
  isDocumentTypeAllowedForLevel,
} from './verification-state-machine';
import { TutorVerificationStatusService } from './tutor-verification-status.service';
import { TutorVerificationReviewerDirectoryService } from './tutor-verification-reviewer-directory.service';

/**
 * Applicant side of the three-level verification dossier.
 *
 * Responsibilities: level bootstrap, private evidence registration/removal,
 * level submission & re-verification, derived-status computation and the
 * notifications that follow a submission. Reviewer decisions live in
 * `TutorVerificationService`.
 */
@Injectable()
export class TutorDossierService {
  private readonly logger = new Logger(TutorDossierService.name);

  constructor(
    @InjectRepository(TutorProfileEntity)
    private readonly profileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorVerificationLevelEntity)
    private readonly levelRepo: Repository<TutorVerificationLevelEntity>,
    @InjectRepository(TutorVerificationDocumentEntity)
    private readonly documentRepo: Repository<TutorVerificationDocumentEntity>,
    @InjectRepository(FileAssetEntity)
    private readonly fileRepo: Repository<FileAssetEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(forwardRef(() => TutorVerificationStatusService))
    private readonly statusService: TutorVerificationStatusService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => TutorVerificationReviewerDirectoryService))
    private readonly reviewerDirectory: TutorVerificationReviewerDirectoryService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @Inject(DataSource)
    private readonly dataSource?: DataSource,
  ) {}

  /** Delegates level bootstrap to the derived-status owner (single writer). */
  ensureLevels(userId: string, policyVersion: string): Promise<TutorVerificationLevelEntity[]> {
    return this.statusService.ensureLevels(userId, policyVersion);
  }

  /** Applicant dossier: levels + evidence + outstanding requirements. */
  async getOwnDossier(userId: string, policyVersion: string) {
    const profile = await this.statusService.getOrCreateProfile(userId, policyVersion);
    const levels = await this.statusService.ensureLevels(userId, policyVersion);
    const documents = await this.documentRepo.find({
      where: { tutorUserId: userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return this.buildDossierView(profile, levels, documents, {
      includeInternalNotes: false,
      user: user
        ? {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            phoneE164: user.phoneE164,
          }
        : null,
    });
  }

  /**
   * Registers an uploaded private file asset as evidence for a level.
   * Ownership, media type, purpose and document-type/level fit are all
   * validated server-side; the client can never nominate another user's file.
   */
  async addDocument(
    userId: string,
    level: TutorVerificationLevel,
    dto: AddVerificationDocumentDto,
    policyVersion: string,
  ): Promise<{
    document: TutorVerificationDocumentEntity;
    levelRecord: TutorVerificationLevelEntity;
  }> {
    if (!isDocumentTypeAllowedForLevel(dto.documentType, level)) {
      throw new BadRequestException(
        `Document type '${dto.documentType}' is not valid evidence for the ${level} level.`,
      );
    }
    const levelRecord = await this.requireLevel(userId, level, policyVersion);
    if (!this.canEditEvidence(levelRecord.status)) {
      throw new ConflictException(
        `The ${level} level cannot be edited while its status is '${levelRecord.status}'.`,
      );
    }

    const file = await this.fileRepo.findOne({
      where: { id: dto.fileAssetId, deletedAt: IsNull() },
    });
    if (!file || file.ownerUserId !== userId) {
      throw new BadRequestException(
        'The specified evidence document does not exist or does not belong to your account.',
      );
    }
    if (file.visibility !== 'private') {
      throw new BadRequestException('Verification evidence must be uploaded as a private file.');
    }
    if (file.purpose !== VERIFICATION_EVIDENCE_PURPOSE && file.purpose !== dto.documentType) {
      throw new BadRequestException(
        `Evidence file purpose '${file.purpose}' is not accepted for verification uploads.`,
      );
    }
    if (file.malwareScanStatus === 'infected' || file.malwareScanStatus === 'failed') {
      throw new BadRequestException(
        'This file did not pass the upload safety check and cannot be submitted for review.',
      );
    }

    // Replacement is explicit: an existing live document of the same type is
    // superseded (history preserved) instead of being silently overwritten.
    const previous = await this.documentRepo.findOne({
      where: {
        tutorUserId: userId,
        level,
        documentType: dto.documentType,
        deletedAt: IsNull(),
      },
    });
    const savedDocument = await this.writeDocumentTx(
      previous,
      this.documentRepo.create({
        tutorUserId: userId,
        level,
        documentType: dto.documentType,
        fileAssetId: dto.fileAssetId,
        reviewStatus: 'pending',
        expiresOn: dto.expiresOn ?? null,
      }),
      levelRecord.status === 'not_started' ? levelRecord : null,
    );
    if (levelRecord.status === 'not_started') {
      levelRecord.status = 'draft';
    }
    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.verification.document_added',
      resourceType: 'tutor_verification_document',
      resourceId: savedDocument.id,
      safeMetadata: { level, documentType: dto.documentType },
    });
    return { document: savedDocument, levelRecord };
  }

  /** Soft-deletes evidence; the row (and its review trail) is retained. */
  async deleteDocument(
    userId: string,
    documentId: string,
    policyVersion: string,
  ): Promise<boolean> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, tutorUserId: userId, deletedAt: IsNull() },
    });
    if (!document) {
      throw new NotFoundException(`Verification document not found: ${documentId}`);
    }
    const levelRecord = await this.requireLevel(userId, document.level, policyVersion);
    if (!this.canEditEvidence(levelRecord.status)) {
      throw new ConflictException(
        `Evidence cannot be removed while the ${document.level} level is '${levelRecord.status}'.`,
      );
    }
    document.deletedAt = new Date();
    await this.documentRepo.save(document);
    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.verification.document_removed',
      resourceType: 'tutor_verification_document',
      resourceId: documentId,
      safeMetadata: { level: document.level, documentType: document.documentType },
    });
    return true;
  }

  /**
   * Submits one level for review. Requirements are re-validated server-side;
   * the client cannot submit an incomplete dossier or force a status.
   */
  async submitLevel(
    userId: string,
    level: TutorVerificationLevel,
    policyVersion: string,
  ): Promise<TutorVerificationLevelEntity> {
    const submitted = await this.transitionLevelToSubmitted(userId, level, policyVersion);
    await this.notifyReviewersOfSubmission(userId, level, policyVersion);
    return submitted;
  }

  /**
   * Submits every level that is currently submittable, used by the legacy
   * `POST /tutors/me/submit-verification` contract. Levels already in review or
   * approved are left untouched.
   */
  async submitAllLevels(userId: string, policyVersion: string): Promise<TutorProfileEntity> {
    await this.statusService.getOrCreateProfile(userId, policyVersion);
    const levels = await this.statusService.ensureLevels(userId, policyVersion);
    const submittable = levels.filter((row) => canSubmitLevel(row.status, row.submissionCount));
    if (submittable.length === 0) {
      throw new BadRequestException(
        'There is no verification level awaiting submission. All levels are already in review or approved.',
      );
    }
    const submittedLevels: TutorVerificationLevel[] = [];
    for (const row of submittable) {
      await this.transitionLevelToSubmitted(userId, row.level, policyVersion);
      await this.notifyReviewersOfSubmission(userId, row.level, policyVersion);
      submittedLevels.push(row.level);
    }
    this.logger.log(`Tutor ${userId} submitted verification levels: ${submittedLevels.join(', ')}`);
    return this.statusService.getOrCreateProfile(userId, policyVersion);
  }

  /**
   * Tutor-initiated re-verification for an approved level. The level returns to
   * `draft` (audited) which immediately recomputes the derived profile status,
   * so an approved badge is never retained on unreviewed replacement evidence.
   */
  async reopenLevel(
    userId: string,
    level: TutorVerificationLevel,
    policyVersion: string,
  ): Promise<TutorVerificationLevelEntity> {
    const levelRecord = await this.requireLevel(userId, level, policyVersion);
    if (levelRecord.status !== 'approved' && levelRecord.status !== 'expired') {
      throw new ConflictException(
        `Only an approved or expired level can be reopened for re-verification (current: '${levelRecord.status}').`,
      );
    }
    const fromStatus = levelRecord.status;
    levelRecord.status = 'draft';
    levelRecord.applicantFeedback = null;
    levelRecord.decisionReasonCode = null;
    levelRecord.version += 1;
    const saved = await this.levelRepo.save(levelRecord);
    await this.recomputeDerivedStatus(userId, policyVersion);
    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.verification.level_reopened',
      resourceType: 'tutor_verification_level',
      resourceId: saved.id,
      safeMetadata: { level, fromStatus, toStatus: 'draft' },
    });
    return saved;
  }

  /* ------------------------------------------------------------------ */
  /* internals                                                          */
  /* ------------------------------------------------------------------ */

  private async transitionLevelToSubmitted(
    userId: string,
    level: TutorVerificationLevel,
    policyVersion: string,
  ): Promise<TutorVerificationLevelEntity> {
    const levelRecord = await this.requireLevel(userId, level, policyVersion);
    if (!canSubmitLevel(levelRecord.status, levelRecord.submissionCount)) {
      throw new ConflictException(
        `The ${level} level cannot be submitted from status '${levelRecord.status}'.`,
      );
    }
    const documents = await this.documentRepo.find({
      where: { tutorUserId: userId, level, deletedAt: IsNull() },
    });
    const requirements = evaluateLevelRequirements(
      level,
      levelRecord.status,
      documents.map((document) => ({
        documentType: document.documentType,
        reviewStatus: document.reviewStatus,
      })),
    );
    // Submission only needs the evidence to be uploaded; a reviewer approving
    // that evidence is enforced when the level is decided, which keeps the
    // tutor → reviewer handoff from deadlocking.
    if (!requirements.submitReady) {
      const missing = [...requirements.missingUploadDocumentTypes];
      if (missing.length === 0) {
        missing.push(...requirements.anyOfDocumentTypes);
      }
      throw new BadRequestException(
        `The ${level} level is incomplete. Upload the missing evidence first: ${missing.join(', ')}.`,
      );
    }
    const fromStatus = levelRecord.status;
    const now = new Date();
    levelRecord.status = 'submitted';
    levelRecord.submissionCount += 1;
    levelRecord.lastSubmittedAt = now;
    levelRecord.firstSubmittedAt = levelRecord.firstSubmittedAt ?? now;
    levelRecord.version += 1;
    const saved = await this.levelRepo.save(levelRecord);
    await this.recomputeDerivedStatus(userId, policyVersion);
    await this.auditService.record({
      actorUserId: userId,
      action: 'tutor.verification.level_submitted',
      resourceType: 'tutor_verification_level',
      resourceId: saved.id,
      safeMetadata: {
        level,
        fromStatus,
        toStatus: 'submitted',
        submissionCount: saved.submissionCount,
      },
    });
    return saved;
  }

  /** Delegates derived-status recomputation to its single writer. */
  recomputeDerivedStatus(userId: string, policyVersion: string): Promise<TutorProfileEntity> {
    return this.statusService.recomputeDerivedStatus(userId, policyVersion);
  }

  async buildDossierView(
    profile: TutorProfileEntity,
    levels: TutorVerificationLevelEntity[],
    documents: TutorVerificationDocumentEntity[],
    options: { includeInternalNotes: boolean; user: Record<string, unknown> | null },
  ) {
    const levelViews = levels.map((row) => {
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
        assignedReviewerUserId: row.assignedReviewerUserId,
        decisionReasonCode: row.decisionReasonCode,
        applicantFeedback: row.applicantFeedback,
        internalNotes: options.includeInternalNotes ? row.internalNotes : undefined,
        expiresAt: row.expiresAt,
        decidedAt: row.decidedAt,
        lastSubmittedAt: row.lastSubmittedAt,
        firstSubmittedAt: row.firstSubmittedAt,
        submissionCount: row.submissionCount,
        policyVersion: row.policyVersion,
        version: row.version,
        requirements,
        documents: levelDocuments.map((document) => ({
          id: document.id,
          level: document.level,
          documentType: document.documentType,
          fileAssetId: document.fileAssetId,
          reviewStatus: document.reviewStatus,
          reasonCode: document.reasonCode,
          expiresOn: document.expiresOn,
          createdAt: document.createdAt,
        })),
      };
    });
    return {
      profile: {
        userId: profile.userId,
        headline: profile.headline,
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        teachingModes: profile.teachingModes,
        hourlyRateMinor: profile.hourlyRateMinor,
        currency: profile.currency,
        verificationStatus: profile.verificationStatus,
        publicationStatus: profile.publicationStatus,
        verifiedAt: profile.verifiedAt,
        verificationExpiresAt: profile.verificationExpiresAt,
        verificationPolicyVersion: profile.verificationPolicyVersion,
      },
      user: options.user,
      levels: levelViews,
      policyVersion: profile.verificationPolicyVersion,
      expiringDocuments: documents
        .filter((document) => document.reviewStatus === 'approved' && document.expiresOn)
        .map((document) => ({
          documentId: document.id,
          level: document.level,
          documentType: document.documentType,
          expiresOn: document.expiresOn,
        })),
    };
  }

  private canEditEvidence(status: VerificationLevelStatus): boolean {
    return (
      status === 'not_started' ||
      status === 'draft' ||
      status === 'needs_information' ||
      status === 'rejected' ||
      status === 'expired'
    );
  }

  private async requireLevel(
    userId: string,
    level: TutorVerificationLevel,
    policyVersion: string,
  ): Promise<TutorVerificationLevelEntity> {
    await this.statusService.ensureLevels(userId, policyVersion);
    const row = await this.statusService.getLevel(userId, level);
    if (!row) {
      throw new NotFoundException(`Verification level '${level}' is not initialised.`);
    }
    return row;
  }

  private async notifyReviewersOfSubmission(
    userId: string,
    level: TutorVerificationLevel,
    policyVersion: string,
  ): Promise<void> {
    if (!this.notificationService) return;
    const [user, reviewers] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.reviewerDirectory.findActiveReviewers(),
    ]);
    const payload = {
      tutorName: user?.displayName ?? 'A tutor',
      level: TUTOR_VERIFICATION_POLICY[level].labelEn,
    };
    for (const reviewer of reviewers) {
      try {
        await this.notificationService.dispatch({
          userId: reviewer.userId,
          eventType: 'tutor.verification_submitted',
          recipientRole: reviewer.notificationRole,
          payload,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to notify reviewer ${reviewer.userId} about ${level} submission (${policyVersion}): ${String(err)}`,
        );
      }
    }
  }

  /**
   * Persists supersede + insert (+ optional level promotion) atomically so a
   * replacement can never leave two live documents of the same type.
   * Falls back to sequential writes only in unit tests with no DataSource.
   */
  private async writeDocumentTx(
    previous: TutorVerificationDocumentEntity | null,
    replacement: TutorVerificationDocumentEntity,
    levelPromotion: TutorVerificationLevelEntity | null,
  ): Promise<TutorVerificationDocumentEntity> {
    const supersede = async (save: (entity: object) => Promise<unknown>) => {
      if (
        previous &&
        (previous.reviewStatus === 'pending' || previous.reviewStatus === 'approved')
      ) {
        previous.reviewStatus = 'superseded';
        await save(previous);
      }
    };
    if (!this.dataSource) {
      await supersede((entity) =>
        this.documentRepo.save(entity as TutorVerificationDocumentEntity),
      );
      if (levelPromotion) {
        levelPromotion.status = 'draft';
        await this.levelRepo.save(levelPromotion);
      }
      return this.documentRepo.save(replacement);
    }
    return this.dataSource.transaction(async (manager) => {
      await supersede((entity) => manager.save(entity as TutorVerificationDocumentEntity));
      if (levelPromotion) {
        levelPromotion.status = 'draft';
        await manager.save(levelPromotion);
      }
      return manager.save(replacement);
    });
  }
}
