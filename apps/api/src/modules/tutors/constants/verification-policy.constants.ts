import {
  TUTOR_VERIFICATION_LEVEL_ORDER,
  TUTOR_VERIFICATION_POLICY,
  type TutorVerificationLevel,
  type VerificationDocumentType,
} from '@ogroniedu/contracts';

export { TUTOR_VERIFICATION_LEVEL_ORDER, TUTOR_VERIFICATION_POLICY };

/**
 * Default validity window applied to the identity level when the environment
 * does not configure one. This is an *operational re-verification interval*,
 * not a claim about any statutory document validity period.
 */
const DEFAULT_IDENTITY_VALIDITY_DAYS = 3650;

function readPositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/**
 * Validity window in days for a level after approval.
 * `TUTOR_VERIFICATION_VALIDITY_DAYS` overrides the identity level; `0`/unset
 * keeps the policy default. Levels whose policy declares `validityDays: null`
 * never expire.
 */
export function resolveLevelValidityDays(level: TutorVerificationLevel): number | null {
  const policyValue = TUTOR_VERIFICATION_POLICY[level].validityDays;
  if (policyValue === null) return null;
  const envValue = readPositiveInt(process.env.TUTOR_VERIFICATION_VALIDITY_DAYS);
  if (level === 'identity') {
    return envValue ?? DEFAULT_IDENTITY_VALIDITY_DAYS;
  }
  return policyValue;
}

/** Reminder offsets (days before expiry) that trigger `tutor.document_expiring`. */
export const VERIFICATION_REMINDER_OFFSETS_DAYS: readonly number[] = [30, 7];

/** Days after the earliest offset at which the reminder sweep also nudges admins. */
export const VERIFICATION_OPS_ALERT_OFFSET_DAYS = 7;

/**
 * Resubmission policy. A rejection does not grant unlimited resubmission: the
 * tutor may resubmit up to this many times per level, after which only an
 * admin/super_admin can reopen the level. Kept in one place so the policy can
 * be changed without touching workflow code.
 */
export const MAX_LEVEL_RESUBMISSIONS = 2;

/** Which levels a document type belongs to. A type is valid for exactly one level. */
export const DOCUMENT_TYPE_LEVEL: Record<VerificationDocumentType, TutorVerificationLevel> = {
  nid_front: 'identity',
  nid_back: 'identity',
  selfie_with_nid: 'identity',
  academic_certificate: 'educational',
  transcript: 'educational',
  professional_certificate: 'institutional',
  institution_letter: 'institutional',
  employment_letter: 'institutional',
  other_supporting: 'educational',
};

export function isDocumentTypeAllowedForLevel(
  documentType: VerificationDocumentType,
  level: TutorVerificationLevel,
): boolean {
  return DOCUMENT_TYPE_LEVEL[documentType] === level;
}

/**
 * Maps a legacy `tutor_qualifications.qualification_type` to the dossier
 * document type used by the level workflow, so both entry points converge on
 * one evidence model.
 */
export function resolveDocumentTypeForQualification(
  qualificationType: string,
): VerificationDocumentType {
  switch (qualificationType) {
    case 'nid':
      return 'nid_front';
    case 'degree':
    case 'academic_certificate':
      return 'academic_certificate';
    case 'experience':
      return 'employment_letter';
    default:
      return 'other_supporting';
  }
}

/** Storage purpose values accepted for verification evidence uploads. */
export const VERIFICATION_EVIDENCE_PURPOSE = 'tutor_verification_evidence';

/** Signed download URL lifetime (seconds) for private dossier evidence. */
export const VERIFICATION_SIGNED_URL_TTL_SECONDS = 300;

/** Max rows inspected per reminder sweep batch. */
export const VERIFICATION_SWEEP_BATCH_SIZE = 500;
