/**
 * Client-side mirror of the verification workflow rules.
 *
 * The server is authoritative — every action is re-validated there. These
 * helpers only decide which controls are *offered*, using the same policy
 * constants from `@ogroniedu/contracts` so the UI cannot drift from the API.
 */
import {
  TUTOR_VERIFICATION_POLICY,
  VERIFICATION_DOCUMENT_TYPE_LABELS,
  type TutorVerificationLevel,
  type TutorVerificationStatus,
  type VerificationDocumentType,
  type VerificationLevelStatus,
  type VerificationNextAction,
} from '@ogroniedu/contracts';
import type { Locale } from '@/lib/i18n';
import type { VerificationLevelRequirementsView } from '@/store/services/tutors-api';

/** Matches `MAX_LEVEL_RESUBMISSIONS` in the API policy constants. */
export const MAX_LEVEL_RESUBMISSIONS = 2;

const EDITABLE: readonly VerificationLevelStatus[] = [
  'not_started',
  'draft',
  'needs_information',
  'rejected',
  'expired',
];

/** Evidence may be uploaded/removed while the level is with the applicant. */
export function isEvidenceEditable(status: VerificationLevelStatus): boolean {
  return EDITABLE.includes(status);
}

/** Mirrors `canSubmitLevel` on the server, including the resubmission cap. */
export function canSubmitLevel(status: VerificationLevelStatus, submissionCount = 0): boolean {
  switch (status) {
    case 'not_started':
    case 'draft':
    case 'needs_information':
    case 'expired':
      return true;
    case 'rejected':
      return submissionCount <= MAX_LEVEL_RESUBMISSIONS;
    default:
      return false;
  }
}

/** Approved or expired levels can be reopened for re-verification. */
export function canReopenLevel(status: VerificationLevelStatus): boolean {
  return status === 'approved' || status === 'expired';
}

/** Document types accepted for a level (required + any-of + optional extras). */
export function allowedDocumentTypes(level: TutorVerificationLevel): VerificationDocumentType[] {
  const policy = TUTOR_VERIFICATION_POLICY[level];
  const all = Object.keys(VERIFICATION_DOCUMENT_TYPE_LABELS) as VerificationDocumentType[];
  return all.filter(
    (type) =>
      policy.requiredDocumentTypes.includes(type) ||
      policy.anyOfDocumentTypes.includes(type) ||
      // Optional supporting evidence belongs to the level it is filed under.
      (type === 'other_supporting' && level === 'educational') ||
      (type === 'selfie_with_nid' && level === 'identity'),
  );
}

export function documentTypeLabel(type: VerificationDocumentType, locale: Locale): string {
  return VERIFICATION_DOCUMENT_TYPE_LABELS[type]?.[locale] ?? type;
}

export function levelLabel(level: TutorVerificationLevel, locale: Locale): string {
  return locale === 'bn'
    ? TUTOR_VERIFICATION_POLICY[level].labelBn
    : TUTOR_VERIFICATION_POLICY[level].labelEn;
}

export function levelStatusLabel(
  status: VerificationLevelStatus | TutorVerificationStatus | string | undefined | null,
  locale: Locale,
): string {
  const isBn = locale === 'bn';
  const labels: Record<string, { en: string; bn: string }> = {
    not_started: { en: 'Not started', bn: 'শুরু হয়নি' },
    not_submitted: { en: 'Not submitted', bn: 'জমা দেওয়া হয়নি' },
    draft: { en: 'Draft', bn: 'খসড়া' },
    submitted: { en: 'Submitted', bn: 'জমা দেওয়া হয়েছে' },
    under_review: { en: 'Under review', bn: 'পর্যালোচনাধীন' },
    needs_information: { en: 'Information needed', bn: 'তথ্য প্রয়োজন' },
    changes_requested: { en: 'Changes requested', bn: 'সংশোধন প্রয়োজন' },
    approved: { en: 'Approved', bn: 'অনুমোদিত' },
    rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত' },
    suspended: { en: 'Suspended', bn: 'স্থগিত' },
    expired: { en: 'Expired', bn: 'মেয়াদোত্তীর্ণ' },
    active: { en: 'Active', bn: 'সক্রিয়' },
    pending: { en: 'Pending', bn: 'অপেক্ষমাণ' },
  };
  const key = String(status || '').toLowerCase();
  const entry = labels[key];
  if (entry) return isBn ? entry.bn : entry.en;
  return status ? String(status) : isBn ? 'অনির্ধারিত' : 'Unspecified';
}

export function levelStatusTone(
  status: VerificationLevelStatus | TutorVerificationStatus | string | undefined | null,
): 'success' | 'warning' | 'info' | 'destructive' | 'default' {
  switch (String(status || '').toLowerCase()) {
    case 'approved':
    case 'active':
      return 'success';
    case 'submitted':
    case 'under_review':
      return 'info';
    case 'needs_information':
    case 'changes_requested':
    case 'draft':
    case 'not_started':
    case 'not_submitted':
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'suspended':
    case 'expired':
      return 'destructive';
    default:
      return 'default';
  }
}

export function nextActionLabel(action: VerificationNextAction, locale: Locale): string {
  const labels: Record<VerificationNextAction, { en: string; bn: string }> = {
    upload_documents: { en: 'Upload the required documents', bn: 'প্রয়োজনীয় নথি আপলোড করুন' },
    fix_rejected_documents: {
      en: 'Replace the rejected documents',
      bn: 'প্রত্যাখ্যাত নথি প্রতিস্থাপন করুন',
    },
    submit_level: { en: 'Submit this level for review', bn: 'এই স্তরটি পর্যালোচনার জন্য জমা দিন' },
    await_review: { en: 'Awaiting reviewer decision', bn: 'পর্যালোচকের সিদ্ধান্তের অপেক্ষায়' },
    none: { en: 'Nothing to do', bn: 'কোনো কাজ বাকি নেই' },
  };
  return labels[action]?.[locale] ?? action;
}

/**
 * Evidence that still has to be *uploaded* before the level can be submitted.
 * Pending (not yet reviewed) uploads do not count as missing here — a reviewer
 * approves evidence after the tutor submits.
 */
export function missingUploadLabels(
  requirements: VerificationLevelRequirementsView,
  locale: Locale,
): string[] {
  if (requirements.submitReady) return [];
  const missing = requirements.missingUploadDocumentTypes.map((type) =>
    documentTypeLabel(type, locale),
  );
  if (missing.length === 0) {
    missing.push(
      requirements.anyOfDocumentTypes.map((type) => documentTypeLabel(type, locale)).join(' / '),
    );
  }
  return missing;
}

/** Human-readable evidence still awaiting reviewer approval. */
export function missingDocumentLabels(
  requirements: VerificationLevelRequirementsView,
  locale: Locale,
): string[] {
  const missing = requirements.missingRequiredDocumentTypes.map((type) =>
    documentTypeLabel(type, locale),
  );
  if (!requirements.anyOfSatisfied) {
    missing.push(
      requirements.anyOfDocumentTypes.map((type) => documentTypeLabel(type, locale)).join(' / '),
    );
  }
  return missing;
}
