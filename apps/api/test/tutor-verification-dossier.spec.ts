import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TUTOR_VERIFICATION_POLICY, deriveOverallVerificationStatus } from '@ogroniedu/contracts';
import { TutorDossierService } from '../src/modules/tutors/services/tutor-dossier.service';
import { TutorVerificationService } from '../src/modules/tutors/services/tutor-verification.service';
import { TutorVerificationExpiryService } from '../src/modules/tutors/services/tutor-verification-expiry.service';
import {
  canSubmitLevel,
  canTransitionLevel,
  evaluateLevelRequirements,
  isDiscoveryEligible,
  resolveLevelExpiry,
} from '../src/modules/tutors/services/verification-state-machine';
import {
  resolveReminderStage,
  utcDaysUntil,
} from '../src/modules/tutors/services/tutor-verification-expiry.service';
import {
  isVerificationSweepEnabled,
  msUntilNextSweep,
  resolveSweepHourUtc,
  TutorVerificationSweepScheduler,
} from '../src/modules/tutors/services/tutor-verification-sweep.scheduler';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

const tutorId = '11111111-1111-4111-8111-111111111111';
const reviewerId = '99999999-9999-4999-8999-999999999999';

const adminReviewer: AuthenticatedUser = {
  id: reviewerId,
  email: 'admin@ogroniedu.com',
  roles: ['admin'],
};

const complianceReviewer: AuthenticatedUser = {
  id: '88888888-8888-4888-8888-888888888888',
  email: 'compliance@ogroniedu.com',
  roles: ['compliance_reviewer'],
};

function levelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: `level-${String(overrides.level ?? 'identity')}`,
    tutorUserId: tutorId,
    level: 'identity',
    status: 'draft',
    assignedReviewerUserId: null,
    decidedByUserId: null,
    decisionReasonCode: null,
    applicantFeedback: null,
    internalNotes: null,
    expiresAt: null,
    firstSubmittedAt: null,
    lastSubmittedAt: null,
    decidedAt: null,
    policyVersion: 'v1.0-bd-tutor-verification',
    submissionCount: 0,
    version: 1,
    ...overrides,
  };
}

function documentRow(documentType: string, reviewStatus = 'approved') {
  return {
    id: `doc-${documentType}`,
    tutorUserId: tutorId,
    level: 'identity',
    documentType,
    fileAssetId: 'file-1',
    reviewStatus,
    reasonCode: null,
    expiresOn: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('Verification state machine invariants', () => {
  it('derives the overall status from level statuses with blocking states first', () => {
    expect(deriveOverallVerificationStatus([])).toBe('not_submitted');
    expect(deriveOverallVerificationStatus(['approved', 'approved', 'approved'])).toBe('approved');
    expect(deriveOverallVerificationStatus(['approved', 'submitted', 'approved'])).toBe(
      'submitted',
    );
    expect(deriveOverallVerificationStatus(['approved', 'rejected', 'approved'])).toBe('rejected');
    expect(deriveOverallVerificationStatus(['approved', 'needs_information', 'approved'])).toBe(
      'needs_information',
    );
    expect(deriveOverallVerificationStatus(['approved', 'expired', 'approved'])).toBe('expired');
    expect(deriveOverallVerificationStatus(['approved', 'suspended', 'approved'])).toBe(
      'suspended',
    );
  });

  it('separates the upload gate from the approval gate', () => {
    const pendingUploads = evaluateLevelRequirements('identity', 'draft', [
      { documentType: 'nid_front', reviewStatus: 'pending' },
      { documentType: 'nid_back', reviewStatus: 'pending' },
    ]);
    // Uploaded evidence satisfies submission but never the approval gate.
    expect(pendingUploads.submitReady).toBe(true);
    expect(pendingUploads.complete).toBe(false);
    expect(pendingUploads.missingRequiredDocumentTypes).toEqual(['nid_front', 'nid_back']);
    expect(pendingUploads.nextAction).toBe('submit_level');

    const nothingUploaded = evaluateLevelRequirements('identity', 'draft', []);
    expect(nothingUploaded.submitReady).toBe(false);
    expect(nothingUploaded.missingUploadDocumentTypes).toEqual(['nid_front', 'nid_back']);
    expect(nothingUploaded.nextAction).toBe('upload_documents');

    const rejectedBack = evaluateLevelRequirements(
      'identity',
      'draft',
      [documentRow('nid_front', 'pending'), documentRow('nid_back', 'rejected')].map((doc) => ({
        documentType: doc.documentType as never,
        reviewStatus: doc.reviewStatus as never,
      })),
    );
    expect(rejectedBack.complete).toBe(false);
    expect(rejectedBack.submitReady).toBe(false);
    expect(rejectedBack.missingUploadDocumentTypes).toEqual(['nid_back']);
    expect(rejectedBack.nextAction).toBe('fix_rejected_documents');

    const complete = evaluateLevelRequirements('identity', 'draft', [
      { documentType: 'nid_front', reviewStatus: 'approved' },
      { documentType: 'nid_back', reviewStatus: 'approved' },
    ]);
    expect(complete.complete).toBe(true);
    expect(complete.submitReady).toBe(true);
    expect(complete.nextAction).toBe('submit_level');
  });

  it('satisfies the educational level through any one of its accepted document types', () => {
    expect(TUTOR_VERIFICATION_POLICY.educational.anyOfDocumentTypes).toContain('transcript');
    const withTranscript = evaluateLevelRequirements('educational', 'draft', [
      { documentType: 'transcript', reviewStatus: 'approved' },
    ]);
    expect(withTranscript.anyOfSatisfied).toBe(true);
    expect(withTranscript.complete).toBe(true);

    const withoutAny = evaluateLevelRequirements('educational', 'draft', [
      { documentType: 'selfie_with_nid', reviewStatus: 'approved' },
    ]);
    expect(withoutAny.complete).toBe(false);
  });

  it('rejects illegal level transitions', () => {
    expect(canTransitionLevel('approved', 'submitted')).toBe(false);
    expect(canTransitionLevel('approved', 'expired')).toBe(true);
    expect(canTransitionLevel('submitted', 'approved')).toBe(true);
    expect(canTransitionLevel('rejected', 'submitted')).toBe(true);
    expect(canTransitionLevel('not_started', 'approved')).toBe(false);
  });

  it('enforces the resubmission cap after a rejection', () => {
    expect(canSubmitLevel('rejected', 1)).toBe(true);
    expect(canSubmitLevel('rejected', 3)).toBe(false);
    expect(canSubmitLevel('submitted', 0)).toBe(false);
  });

  it('applies a validity window only where the policy declares one', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const identityExpiry = resolveLevelExpiry('identity', from);
    expect(identityExpiry).not.toBeNull();
    expect(identityExpiry!.getTime() - from.getTime()).toBe(3650 * 86_400_000);
    expect(resolveLevelExpiry('educational', from)).toBeNull();
    expect(resolveLevelExpiry('institutional', from)).toBeNull();
  });

  it('denies discovery eligibility for expired, unpublished or inactive tutors', () => {
    const base = {
      publicationStatus: 'published',
      verificationStatus: 'approved',
      verificationExpiresAt: new Date('2027-01-01T00:00:00Z'),
      accountStatus: 'active',
      now: new Date('2026-06-01T00:00:00Z'),
    };
    expect(isDiscoveryEligible(base)).toBe(true);
    expect(
      isDiscoveryEligible({ ...base, verificationExpiresAt: new Date('2026-05-01T00:00:00Z') }),
    ).toBe(false);
    expect(isDiscoveryEligible({ ...base, verificationStatus: 'expired' })).toBe(false);
    expect(isDiscoveryEligible({ ...base, publicationStatus: 'unpublished' })).toBe(false);
    expect(isDiscoveryEligible({ ...base, accountStatus: 'suspended' })).toBe(false);
    expect(isDiscoveryEligible({ ...base, deletedAt: new Date() })).toBe(false);
  });
});

describe('Verification expiry maths', () => {
  it('computes UTC calendar-day distances without timezone drift', () => {
    const now = new Date('2026-03-01T23:30:00Z');
    expect(utcDaysUntil('2026-03-31', now)).toBe(30);
    expect(utcDaysUntil('2026-03-01', now)).toBe(0);
    expect(utcDaysUntil('2026-02-28', now)).toBe(-1);
  });

  it('resolves the reminder stage for each offset window', () => {
    expect(resolveReminderStage(45)).toBeNull();
    expect(resolveReminderStage(30)).toBe('D-30');
    expect(resolveReminderStage(10)).toBe('D-30');
    expect(resolveReminderStage(7)).toBe('D-7');
    expect(resolveReminderStage(0)).toBe('D-7');
    expect(resolveReminderStage(-1)).toBe('EXPIRED');
  });
});

describe('TutorDossierService (applicant workflow)', () => {
  let service: TutorDossierService;
  let levelRepo: any;
  let documentRepo: any;
  let fileRepo: any;
  let statusService: any;
  let auditService: any;

  const profile = {
    userId: tutorId,
    verificationStatus: 'not_submitted',
    publicationStatus: 'draft',
    verificationPolicyVersion: 'v1.0-bd-tutor-verification',
  };

  function build(levels: Record<string, unknown>[], documents: unknown[] = []) {
    levelRepo = {
      find: vi.fn(async () => levels),
      findOne: vi.fn(async ({ where }: any) => levels.find((row) => row.level === where.level)),
      create: vi.fn((dto) => ({ ...dto })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    documentRepo = {
      find: vi.fn(async () => documents),
      findOne: vi.fn(async () => null),
      create: vi.fn((dto) => ({ id: 'new-doc', ...dto })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    fileRepo = { findOne: vi.fn() };
    statusService = {
      getOrCreateProfile: vi.fn(async () => profile),
      ensureLevels: vi.fn(async () => levels),
      getLevel: vi.fn(async (_userId: string, level: string) =>
        levels.find((row) => row.level === level),
      ),
      recomputeDerivedStatus: vi.fn(async () => ({ ...profile, verificationStatus: 'submitted' })),
    };
    auditService = { record: vi.fn(async () => ({})) };
    service = new TutorDossierService(
      { findOne: vi.fn(async () => profile) } as never,
      levelRepo,
      documentRepo,
      fileRepo,
      { findOne: vi.fn(async () => ({ id: tutorId, displayName: 'Karim' })) } as never,
      statusService,
      auditService,
      { findActiveReviewers: vi.fn(async () => []) } as never,
      undefined,
      undefined,
    );
  }

  beforeEach(() => {
    build([levelRow({ level: 'identity' })]);
  });

  it('rejects submission while mandatory evidence has not been uploaded', async () => {
    build([levelRow({ level: 'identity' })], [documentRow('nid_front', 'approved')]);
    await expect(
      service.submitLevel(tutorId, 'identity', 'v1.0-bd-tutor-verification'),
    ).rejects.toThrow(BadRequestException);
    expect(levelRepo.save).not.toHaveBeenCalled();
  });

  it('accepts a submission whose uploads are still awaiting review', async () => {
    build(
      [levelRow({ level: 'identity' })],
      [documentRow('nid_front', 'pending'), documentRow('nid_back', 'pending')],
    );
    const submitted = await service.submitLevel(tutorId, 'identity', 'v1.0-bd-tutor-verification');
    expect(submitted.status).toBe('submitted');
    expect(submitted.submissionCount).toBe(1);
  });

  it('submits a complete level and recomputes the derived profile status', async () => {
    build([levelRow({ level: 'identity' })], [documentRow('nid_front'), documentRow('nid_back')]);
    const submitted = await service.submitLevel(tutorId, 'identity', 'v1.0-bd-tutor-verification');
    expect(submitted.status).toBe('submitted');
    expect(submitted.submissionCount).toBe(1);
    expect(submitted.version).toBe(2);
    expect(statusService.recomputeDerivedStatus).toHaveBeenCalledWith(
      tutorId,
      'v1.0-bd-tutor-verification',
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tutor.verification.level_submitted' }),
    );
  });

  it('refuses to attach another user’s file as evidence', async () => {
    fileRepo.findOne.mockResolvedValue({
      id: 'file-1',
      ownerUserId: 'someone-else',
      visibility: 'private',
      purpose: 'tutor_verification_evidence',
      malwareScanStatus: 'clean',
    });
    await expect(
      service.addDocument(
        tutorId,
        'identity',
        { level: 'identity', documentType: 'nid_front', fileAssetId: 'file-1' } as never,
        'v1.0-bd-tutor-verification',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(documentRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a document type that does not belong to the target level', async () => {
    await expect(
      service.addDocument(
        tutorId,
        'educational',
        { level: 'educational', documentType: 'nid_front', fileAssetId: 'file-1' } as never,
        'v1.0-bd-tutor-verification',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('supersedes the previous live document instead of overwriting it', async () => {
    fileRepo.findOne.mockResolvedValue({
      id: 'file-2',
      ownerUserId: tutorId,
      visibility: 'private',
      purpose: 'tutor_verification_evidence',
      malwareScanStatus: 'clean',
    });
    documentRepo.findOne.mockResolvedValue(documentRow('nid_front', 'pending'));
    await service.addDocument(
      tutorId,
      'identity',
      { level: 'identity', documentType: 'nid_front', fileAssetId: 'file-2' } as never,
      'v1.0-bd-tutor-verification',
    );
    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'nid_front', reviewStatus: 'superseded' }),
    );
    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fileAssetId: 'file-2', reviewStatus: 'pending' }),
    );
  });
});

describe('TutorVerificationService (reviewer workflow)', () => {
  let service: TutorVerificationService;
  let levelRepo: any;
  let documentRepo: any;
  let reviewRepo: any;
  let statusService: any;
  let auditService: any;
  let notificationService: any;

  function build(levels: Record<string, unknown>[], documents: unknown[] = []) {
    levelRepo = {
      find: vi.fn(async () => levels),
      findOne: vi.fn(async ({ where }: any) => levels.find((row) => row.level === where.level)),
      create: vi.fn((dto) => ({ ...dto })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    documentRepo = {
      find: vi.fn(async () => documents),
      findOne: vi.fn(async ({ where }: any) =>
        documents.find((document: any) => document.id === where.id),
      ),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    reviewRepo = {
      find: vi.fn(async () => []),
      create: vi.fn((dto) => ({ id: 'review-1', ...dto })),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    statusService = {
      ensureLevels: vi.fn(async () => levels),
      getLevel: vi.fn(async (_userId: string, level: string) =>
        levels.find((row) => row.level === level),
      ),
      recomputeDerivedStatus: vi.fn(async () => ({
        userId: tutorId,
        verificationStatus: 'approved',
      })),
    };
    auditService = { record: vi.fn(async () => ({})) };
    notificationService = { dispatch: vi.fn(async () => ({})) };
    service = new TutorVerificationService(
      { findOne: vi.fn() } as never,
      { findOne: vi.fn() } as never,
      reviewRepo,
      { findOne: vi.fn(async () => ({ id: reviewerId, displayName: 'Reviewer' })) } as never,
      auditService,
      notificationService,
      levelRepo,
      documentRepo,
      statusService,
      { issueSignedAccess: vi.fn() } as never,
      undefined,
    );
  }

  beforeEach(() => {
    build([levelRow({ level: 'identity', status: 'submitted' })]);
  });

  it('denies self-approval even for an admin reviewer', async () => {
    await expect(
      service.decideLevel(
        { ...adminReviewer, id: tutorId, roles: ['admin', 'tutor'] },
        tutorId,
        'identity',
        { decision: 'approved', reasonCode: 'VALID' } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a decision made against a stale level version', async () => {
    await expect(
      service.decideLevel(adminReviewer, tutorId, 'identity', {
        decision: 'approved',
        reasonCode: 'VALID',
        expectedVersion: 7,
      } as never),
    ).rejects.toThrow(ConflictException);
    expect(levelRepo.save).not.toHaveBeenCalled();
  });

  it('does not let a compliance reviewer act on another reviewer’s case', async () => {
    build([
      levelRow({ level: 'identity', status: 'submitted', assignedReviewerUserId: reviewerId }),
    ]);
    await expect(
      service.decideLevel(complianceReviewer, tutorId, 'identity', {
        decision: 'approved',
        reasonCode: 'VALID',
      } as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires applicant-facing feedback for an information request', async () => {
    await expect(
      service.decideLevel(adminReviewer, tutorId, 'identity', {
        decision: 'needs_information',
        reasonCode: 'BLURRY_DOCUMENT',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('approves a complete identity level and stamps the policy expiry', async () => {
    build(
      [levelRow({ level: 'identity', status: 'submitted' })],
      [documentRow('nid_front'), documentRow('nid_back')],
    );
    const result = await service.decideLevel(adminReviewer, tutorId, 'identity', {
      decision: 'approved',
      reasonCode: 'CREDENTIALS_VALIDATED',
    } as never);
    expect(result.level.status).toBe('approved');
    expect(result.level.expiresAt).toBeInstanceOf(Date);
    expect(reviewRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'approved',
        fromStatus: 'submitted',
        toStatus: 'approved',
        reviewerRole: 'admin',
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tutor.verification.level_decided' }),
    );
    expect(notificationService.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'tutor.verified', userId: tutorId }),
    );
  });

  it('refuses to approve a level whose mandatory evidence is unapproved', async () => {
    build([levelRow({ level: 'identity', status: 'submitted' })], [documentRow('nid_front')]);
    await expect(
      service.decideLevel(adminReviewer, tutorId, 'identity', {
        decision: 'approved',
        reasonCode: 'CREDENTIALS_VALIDATED',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('recomputes the derived status when an approved document is revoked', async () => {
    build(
      [levelRow({ level: 'identity', status: 'approved' })],
      [{ ...documentRow('nid_front'), id: 'doc-1' }],
    );
    await service.verifyDocument(adminReviewer, tutorId, 'doc-1', {
      reviewStatus: 'rejected',
      reasonCode: 'FORGED',
    } as never);
    expect(levelRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'identity', status: 'needs_information' }),
    );
    expect(statusService.recomputeDerivedStatus).toHaveBeenCalledWith(
      tutorId,
      'v1.0-bd-tutor-verification',
    );
  });
});

describe('TutorVerificationSweepScheduler', () => {
  it('is disabled in tests and when explicitly switched off', () => {
    expect(isVerificationSweepEnabled({ NODE_ENV: 'test' })).toBe(false);
    expect(isVerificationSweepEnabled({ NODE_ENV: 'production' })).toBe(true);
    expect(
      isVerificationSweepEnabled({
        NODE_ENV: 'production',
        TUTOR_VERIFICATION_SWEEP_ENABLED: 'false',
      }),
    ).toBe(false);
    expect(
      isVerificationSweepEnabled({ NODE_ENV: 'test', TUTOR_VERIFICATION_SWEEP_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('parses the daily UTC hour with a safe fallback', () => {
    expect(resolveSweepHourUtc({ TUTOR_VERIFICATION_SWEEP_HOUR_UTC: '5' })).toBe(5);
    expect(resolveSweepHourUtc({ TUTOR_VERIFICATION_SWEEP_HOUR_UTC: '0' })).toBe(0);
    expect(resolveSweepHourUtc({ TUTOR_VERIFICATION_SWEEP_HOUR_UTC: '24' })).toBe(2);
    expect(resolveSweepHourUtc({ TUTOR_VERIFICATION_SWEEP_HOUR_UTC: 'nope' })).toBe(2);
    expect(resolveSweepHourUtc({})).toBe(2);
  });

  it('computes the next daily run strictly in the future', () => {
    const before = new Date('2026-07-01T01:30:00Z');
    expect(msUntilNextSweep(before, 2)).toBe(30 * 60_000);

    const exactlyAt = new Date('2026-07-01T02:00:00Z');
    expect(msUntilNextSweep(exactlyAt, 2)).toBe(24 * 60 * 60_000);

    const after = new Date('2026-07-01T23:00:00Z');
    expect(msUntilNextSweep(after, 0)).toBe(60 * 60_000);
  });

  it('runs the sweep once when it owns the advisory lock', async () => {
    const sweep = vi.fn(async () => ({
      scannedAt: '2026-07-01T02:00:00.000Z',
      expiredLevels: 0,
      expiredDocuments: 0,
      remindersSent: 0,
      alreadyNotified: 0,
      notifiedTutors: [],
      failures: [],
    }));
    const query = vi.fn(async (sql: string) =>
      sql.includes('pg_try_advisory_lock') ? [{ locked: true }] : [{ pg_advisory_unlock: true }],
    );
    const scheduler = new TutorVerificationSweepScheduler(
      { sweep } as never,
      {
        query,
      } as never,
    );

    await scheduler.runOnce();

    expect(sweep).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('pg_advisory_unlock'))).toBe(true);
  });

  it('skips the run when another instance holds the lock', async () => {
    const sweep = vi.fn(async () => ({}));
    const scheduler = new TutorVerificationSweepScheduler(
      { sweep } as never,
      {
        query: vi.fn(async () => [{ locked: false }]),
      } as never,
    );

    await scheduler.runOnce();

    expect(sweep).not.toHaveBeenCalled();
  });
});

describe('TutorVerificationExpiryService', () => {
  it('expires approved levels past their window and recomputes the derived status', async () => {
    const now = new Date('2026-07-01T00:00:00Z');
    const expiredLevel = levelRow({
      level: 'identity',
      status: 'approved',
      expiresAt: new Date('2026-06-01T00:00:00Z'),
    });
    const levelRepo = {
      // Mirrors the `status = 'approved'` predicate of the real repository.
      find: vi.fn(async ({ where }: any = {}) =>
        where?.status
          ? [expiredLevel].filter((row) => row.status === where.status)
          : [expiredLevel],
      ),
      findOne: vi.fn(async () => expiredLevel),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    const documentRepo = {
      find: vi.fn(async () => []),
      save: vi.fn(async (entity) => ({ ...entity })),
    };
    const statusService = { recomputeDerivedStatus: vi.fn(async () => ({})) };
    const auditService = { record: vi.fn(async () => ({})) };

    const service = new TutorVerificationExpiryService(
      levelRepo as never,
      documentRepo as never,
      statusService as never,
      auditService as never,
      undefined,
    );
    const result = await service.sweep(now);

    expect(expiredLevel.status).toBe('expired');
    expect(expiredLevel.version).toBe(2);
    expect(result.expiredLevels).toBe(1);
    expect(statusService.recomputeDerivedStatus).toHaveBeenCalledWith(
      tutorId,
      'v1.0-bd-tutor-verification',
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tutor.verification.level_expired' }),
    );

    // Idempotent: a second run with the same clock performs no further change.
    const second = await service.sweep(now);
    expect(second.expiredLevels).toBe(0);
  });
});
