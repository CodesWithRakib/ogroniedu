import {
  deriveOverallVerificationStatus,
  TUTOR_VERIFICATION_POLICY,
  type TutorVerificationLevel,
  type TutorVerificationStatus,
  type VerificationDocumentType,
  type VerificationLevelRequirements,
  type VerificationLevelStatus,
  type VerificationNextAction,
} from '@ogroniedu/contracts';
import {
  MAX_LEVEL_RESUBMISSIONS,
  isDocumentTypeAllowedForLevel,
  resolveLevelValidityDays,
} from '../constants/verification-policy.constants';

export { isDocumentTypeAllowedForLevel };

/** Evidence shape the state machine needs; keeps the evaluator repo-agnostic. */
export interface VerificationEvidenceItem {
  documentType: VerificationDocumentType;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'superseded';
}

/**
 * Allowed level transitions. Every edge is validated before persistence:
 *  - `draft`/`not_started`  → tutor submits
 *  - `submitted`            → reviewer opens the case (`under_review`) or
 *                             decides directly
 *  - `needs_information`    → tutor revises and resubmits
 *  - `approved`             → may expire (policy window) or be suspended
 *  - `rejected`             → resubmission is permitted only up to the
 *                             configured cap (see MAX_LEVEL_RESUBMISSIONS)
 *  - `suspended`/`expired`  → re-review after corrective evidence
 */
export const VERIFICATION_LEVEL_TRANSITIONS: Record<
  VerificationLevelStatus,
  readonly VerificationLevelStatus[]
> = {
  not_started: ['draft', 'submitted'],
  draft: ['not_started', 'submitted'],
  submitted: ['under_review', 'needs_information', 'approved', 'rejected'],
  under_review: ['needs_information', 'approved', 'rejected', 'suspended'],
  needs_information: ['draft', 'submitted'],
  approved: ['expired', 'suspended'],
  rejected: ['draft', 'submitted'],
  suspended: ['under_review', 'rejected', 'approved'],
  expired: ['draft', 'submitted'],
};

export function canTransitionLevel(
  from: VerificationLevelStatus,
  to: VerificationLevelStatus,
): boolean {
  return VERIFICATION_LEVEL_TRANSITIONS[from].includes(to);
}

/** Target status for a reviewer decision. `reinstated` re-opens a suspended level. */
export function resolveDecisionTargetStatus(
  from: VerificationLevelStatus,
  decision: 'approved' | 'rejected' | 'needs_information' | 'suspended' | 'reinstated',
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
      return from === 'suspended' ? 'under_review' : from;
    default:
      return from;
  }
}

/** Tutor-visible next action for a level. */
export function resolveNextAction(
  status: VerificationLevelStatus,
  evidence: readonly VerificationEvidenceItem[],
  complete: boolean,
): VerificationNextAction {
  if (status === 'approved') return 'none';
  if (status === 'submitted' || status === 'under_review') return 'await_review';
  const hasRejected = evidence.some((item) => item.reviewStatus === 'rejected');
  if (hasRejected) return 'fix_rejected_documents';
  if (!complete) return 'upload_documents';
  return 'submit_level';
}

/**
 * Outstanding mandatory evidence for a level, computed from approved documents
 * only: a pending or rejected upload never satisfies a requirement.
 */
export function evaluateLevelRequirements(
  level: TutorVerificationLevel,
  status: VerificationLevelStatus,
  evidence: readonly VerificationEvidenceItem[],
): VerificationLevelRequirements {
  const policy = TUTOR_VERIFICATION_POLICY[level];
  const approvedTypes = new Set(
    evidence.filter((item) => item.reviewStatus === 'approved').map((item) => item.documentType),
  );
  const missingRequiredDocumentTypes = policy.requiredDocumentTypes.filter(
    (type) => !approvedTypes.has(type),
  );
  const anyOfSatisfied =
    policy.anyOfDocumentTypes.length === 0 ||
    policy.anyOfDocumentTypes.some((type) => approvedTypes.has(type));
  const complete = missingRequiredDocumentTypes.length === 0 && anyOfSatisfied;
  return {
    level,
    requiredDocumentTypes: policy.requiredDocumentTypes,
    anyOfDocumentTypes: policy.anyOfDocumentTypes,
    missingRequiredDocumentTypes,
    anyOfSatisfied,
    complete,
    nextAction: resolveNextAction(status, evidence, complete),
  };
}

/**
 * Whether the tutor may submit (or resubmit) a level right now.
 * A rejected level only becomes submittable again while the resubmission cap
 * for that level has not been exhausted.
 */
export function canSubmitLevel(status: VerificationLevelStatus, submissionsCount: number): boolean {
  switch (status) {
    case 'not_started':
    case 'draft':
    case 'needs_information':
    case 'expired':
      return true;
    case 'rejected':
      return submissionsCount <= MAX_LEVEL_RESUBMISSIONS;
    default:
      return false;
  }
}

/** Expiry timestamp for a level approved at `from` (null = no expiry policy). */
export function resolveLevelExpiry(level: TutorVerificationLevel, from: Date): Date | null {
  const days = resolveLevelValidityDays(level);
  if (days === null) return null;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export { deriveOverallVerificationStatus };

/**
 * Discovery eligibility. Pending / rejected / suspended / expired verification,
 * an expired validity window or an inactive account must never appear as a
 * verified tutor — enforced server-side, not by frontend filters.
 */
export function isDiscoveryEligible(params: {
  publicationStatus: string;
  verificationStatus: string;
  verificationExpiresAt: Date | null;
  accountStatus?: string | null;
  deletedAt?: Date | null;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  if (params.publicationStatus !== 'published') return false;
  if (params.verificationStatus !== 'approved') return false;
  if (params.accountStatus && params.accountStatus !== 'active') return false;
  if (params.deletedAt) return false;
  if (params.verificationExpiresAt && params.verificationExpiresAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

/** True when any approved level expiry sits inside the reminder window. */
export function isExpiringSoon(expiresAt: Date | null, now: Date, withinDays: number): boolean {
  if (!expiresAt) return false;
  const diff = expiresAt.getTime() - now.getTime();
  return diff > 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
}

/** Overall status the profile must carry for a given set of level statuses. */
export function overallStatusFromLevels(
  statuses: readonly VerificationLevelStatus[],
): TutorVerificationStatus {
  return deriveOverallVerificationStatus(statuses);
}
