import { z } from 'zod';

/**
 * Tutor domain & verification contracts.
 * Cross-stack source of truth for tutor onboarding, 3-tier verification,
 * credentials dossier, and administrative review decisions.
 */

export const TutorVerificationStatusValues = [
  'not_submitted',
  'submitted',
  'under_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended',
  'expired',
] as const;
export type TutorVerificationStatus = (typeof TutorVerificationStatusValues)[number];

/* ------------------------------------------------------------------------
 * Three-level verification dossier (Phase 02)
 * Level 1 identity, Level 2 educational, Level 3 institutional/professional.
 * Each level carries its own status + review history; the profile-level
 * `verificationStatus` is always *derived* from the three level records.
 * --------------------------------------------------------------------- */

export const TutorVerificationLevelValues = ['identity', 'educational', 'institutional'] as const;
export type TutorVerificationLevel = (typeof TutorVerificationLevelValues)[number];

export const VerificationLevelStatusValues = [
  'not_started',
  'draft',
  'submitted',
  'under_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended',
  'expired',
] as const;
export type VerificationLevelStatus = (typeof VerificationLevelStatusValues)[number];

export const VerificationDocumentTypeValues = [
  'nid_front',
  'nid_back',
  'selfie_with_nid',
  'academic_certificate',
  'transcript',
  'professional_certificate',
  'institution_letter',
  'employment_letter',
  'other_supporting',
] as const;
export type VerificationDocumentType = (typeof VerificationDocumentTypeValues)[number];

export const VerificationDocumentReviewStatusValues = [
  'pending',
  'approved',
  'rejected',
  'superseded',
] as const;
export type VerificationDocumentReviewStatus =
  (typeof VerificationDocumentReviewStatusValues)[number];

/** Level review decisions accepted by the reviewer API. */
export const VerificationLevelDecisionValues = [
  'approved',
  'rejected',
  'needs_information',
  'suspended',
  'reinstated',
] as const;
export type VerificationLevelDecision = (typeof VerificationLevelDecisionValues)[number];

/**
 * Legal/regulatory validity is *not* asserted here. `validityDays` only drives
 * re-verification reminders and is overridable per environment
 * (`TUTOR_VERIFICATION_VALIDITY_DAYS`); a null value means "no expiry policy".
 */
export interface VerificationLevelPolicy {
  level: TutorVerificationLevel;
  labelEn: string;
  labelBn: string;
  /** Mandatory evidence: one approved document of each listed type. */
  requiredDocumentTypes: readonly VerificationDocumentType[];
  /** Optional evidence group: at least one of these must be approved. */
  anyOfDocumentTypes: readonly VerificationDocumentType[];
  /** Reviewer role family allowed to decide this level. */
  decisionRoles: readonly string[];
  /** Re-verification window in days after approval (null = never expires). */
  validityDays: number | null;
  /** Reminder offsets (days before expiry) that produce `tutor.document_expiring`. */
  reminderOffsetsDays: readonly number[];
}

export const TUTOR_VERIFICATION_LEVEL_ORDER: readonly TutorVerificationLevel[] = [
  'identity',
  'educational',
  'institutional',
];

/**
 * Mandatory evidence per level. Level 1 (identity) requires both sides of the
 * NID/approved identity document; level 2 requires an academic certificate or
 * transcript; level 3 requires at least one institutional/professional artefact.
 * Extra evidence types (e.g. `selfie_with_nid`) may be uploaded and are reviewed
 * but are not mandatory. A human reviewer decides the level — uploading a
 * document never approves identity by itself.
 */
export const TUTOR_VERIFICATION_POLICY: Record<TutorVerificationLevel, VerificationLevelPolicy> = {
  identity: {
    level: 'identity',
    labelEn: 'Identity Verification',
    labelBn: 'পরিচয় যাচাইকরণ',
    requiredDocumentTypes: ['nid_front', 'nid_back'],
    anyOfDocumentTypes: [],
    decisionRoles: ['admin', 'super_admin', 'compliance_reviewer'],
    validityDays: 3650,
    reminderOffsetsDays: [30, 7],
  },
  educational: {
    level: 'educational',
    labelEn: 'Educational Verification',
    labelBn: 'শিক্ষাগত যোগ্যতা যাচাইকরণ',
    requiredDocumentTypes: [],
    anyOfDocumentTypes: ['academic_certificate', 'transcript'],
    decisionRoles: ['admin', 'super_admin', 'compliance_reviewer'],
    validityDays: null,
    reminderOffsetsDays: [30, 7],
  },
  institutional: {
    level: 'institutional',
    labelEn: 'Institutional & Professional Verification',
    labelBn: 'প্রাতিষ্ঠানিক ও পেশাগত যাচাইকরণ',
    requiredDocumentTypes: [],
    anyOfDocumentTypes: ['institution_letter', 'employment_letter', 'professional_certificate'],
    decisionRoles: ['admin', 'super_admin', 'compliance_reviewer'],
    validityDays: null,
    reminderOffsetsDays: [30, 7],
  },
};

/** Human-readable labels for the document taxonomy (shared by both apps). */
export const VERIFICATION_DOCUMENT_TYPE_LABELS: Record<
  VerificationDocumentType,
  { en: string; bn: string }
> = {
  nid_front: { en: 'National ID — Front', bn: 'জাতীয় পরিচয়পত্র — সামনের অংশ' },
  nid_back: { en: 'National ID — Back', bn: 'জাতীয় পরিচয়পত্র — পেছনের অংশ' },
  selfie_with_nid: { en: 'Selfie holding National ID', bn: 'এনআইডি হাতে সেলফি' },
  academic_certificate: { en: 'Academic Certificate', bn: 'শিক্ষাগত সনদপত্র' },
  transcript: { en: 'Academic Transcript', bn: 'একাডেমিক ট্রান্সক্রিপ্ট' },
  professional_certificate: { en: 'Professional Certificate', bn: 'পেশাগত সনদ' },
  institution_letter: { en: 'Institution Authorization Letter', bn: 'প্রতিষ্ঠানের অনুমোদন পত্র' },
  employment_letter: { en: 'Employment / Experience Letter', bn: 'অভিজ্ঞতার প্রশংসাপত্র' },
  other_supporting: { en: 'Other Supporting Evidence', bn: 'অন্যান্য সহায়ক প্রমাণ' },
};

/**
 * Derived overall status. Ordering matters: an active needs-information or
 * rejection blocks approval even when other levels are approved.
 */
export function deriveOverallVerificationStatus(
  statuses: readonly VerificationLevelStatus[],
): TutorVerificationStatus {
  if (statuses.length === 0) return 'not_submitted';
  const has = (s: VerificationLevelStatus) => statuses.includes(s);
  if (has('suspended')) return 'suspended';
  if (has('expired')) return 'expired';
  if (statuses.every((s) => s === 'approved')) return 'approved';
  if (has('rejected')) return 'rejected';
  if (has('needs_information')) return 'needs_information';
  if (has('under_review')) return 'under_review';
  if (has('submitted')) return 'submitted';
  if (statuses.some((s) => s === 'draft')) return 'not_submitted';
  return 'not_submitted';
}

/** True when the level can be submitted (or resubmitted) by the tutor. */
export function isLevelSubmittable(status: VerificationLevelStatus): boolean {
  return status === 'draft' || status === 'not_started' || status === 'needs_information';
}

export const TutorPublicationStatusValues = ['draft', 'published', 'unpublished'] as const;
export type TutorPublicationStatus = (typeof TutorPublicationStatusValues)[number];

export const TutorQualificationTypeValues = [
  'nid',
  'academic_certificate',
  'degree',
  'experience',
] as const;
export type TutorQualificationType = (typeof TutorQualificationTypeValues)[number];

export const QualificationReviewStatusValues = [
  'pending',
  'approved',
  'rejected',
  'expired',
] as const;
export type QualificationReviewStatus = (typeof QualificationReviewStatusValues)[number];

export const ReviewDecisionValues = [
  'approved',
  'rejected',
  'needs_information',
  'suspended',
  'reinstated',
] as const;
export type ReviewDecision = (typeof ReviewDecisionValues)[number];

export const AddTutorQualificationSchema = z.object({
  qualificationType: z.enum(TutorQualificationTypeValues),
  title: z.string().min(2).max(200),
  institution: z.string().max(200).optional(),
  issuedYear: z.number().int().min(1950).max(2100).optional(),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  evidenceAssetId: z.string().uuid().optional(),
});
export type AddTutorQualificationInput = z.infer<typeof AddTutorQualificationSchema>;

export const AdminReviewTutorSchema = z.object({
  decision: z.enum(ReviewDecisionValues),
  reasonCode: z.string().min(2).max(100),
  internalNotes: z.string().max(1000).optional(),
  policyVersion: z.string().max(50).optional(),
});
export type AdminReviewTutorInput = z.infer<typeof AdminReviewTutorSchema>;

export const AdminVerifyQualificationSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected']),
});
export type AdminVerifyQualificationInput = z.infer<typeof AdminVerifyQualificationSchema>;

export interface TutorEvidenceAssetRecord {
  id: string;
  originalFilename: string;
  mediaType: string;
  sizeBytes: number;
  purpose: string;
  visibility: string;
  storageProvider?: string;
  createdAt: string;
}

export interface TutorQualificationRecord {
  id: string;
  tutorUserId: string;
  qualificationType: TutorQualificationType | string;
  title: string;
  institution: string | null;
  issuedYear: number | null;
  expiresOn: string | null;
  evidenceAssetId: string | null;
  reviewStatus: QualificationReviewStatus;
  evidenceAsset?: TutorEvidenceAssetRecord | null;
  createdAt: string;
}

export interface TutorVerificationReviewRecord {
  id: string;
  tutorUserId: string;
  reviewerUserId: string;
  decision: ReviewDecision;
  reasonCode: string;
  internalNotes: string | null;
  policyVersion: string;
  createdAt: string;
}

export interface PendingTutorItemRecord {
  userId: string;
  displayName: string;
  email?: string | null;
  phoneE164?: string | null;
  headline?: string | null;
  verificationStatus: TutorVerificationStatus;
  publicationStatus: TutorPublicationStatus;
  qualificationsCount: number;
  submittedAt: string | Date;
}

export interface TutorReviewDossierRecord {
  profile: {
    userId: string;
    headline?: string | null;
    bio?: string | null;
    /** English copy; `headline`/`bio` mirror these for legacy clients. */
    headlineEn?: string | null;
    /** Null until the tutor supplies Bangla copy. */
    headlineBn?: string | null;
    bioEn?: string | null;
    /** Null until the tutor supplies Bangla copy. */
    bioBn?: string | null;
    gender?: string | null;
    yearsExperience?: number | null;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
    verificationStatus: TutorVerificationStatus;
    publicationStatus: TutorPublicationStatus;
    profileCompletedAt?: string | null;
    qualifications: TutorQualificationRecord[];
    subjects: Array<{
      id: string;
      subjectId?: string;
      subjectName?: string;
      proficiencyLevel?: string;
    }>;
    serviceAreas: Array<{ districtCode: string; upazilaCode?: string }>;
    availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  };
  user: {
    id: string;
    displayName: string;
    email?: string | null;
    phoneE164?: string | null;
    status: string;
    createdAt: string;
  } | null;
  reviewHistory: TutorVerificationReviewRecord[];
}

/* ------------------------------------------------------------------------
 * Phase 02 request contracts
 * --------------------------------------------------------------------- */

export const AddVerificationDocumentSchema = z.object({
  level: z.enum(TutorVerificationLevelValues),
  documentType: z.enum(VerificationDocumentTypeValues),
  fileAssetId: z.string().uuid(),
  /** ISO date (YYYY-MM-DD); policy-driven validity, never invented by the client. */
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type AddVerificationDocumentInput = z.infer<typeof AddVerificationDocumentSchema>;

export const ReviewVerificationLevelSchema = z.object({
  decision: z.enum(VerificationLevelDecisionValues),
  reasonCode: z.string().min(2).max(100),
  /** Applicant-facing text. Rendered to the tutor; never carry internal notes here. */
  applicantFeedback: z.string().max(1000).optional(),
  /** Reviewer-only notes. Never serialized to applicant or admin dashboards. */
  internalNotes: z.string().max(2000).optional(),
  /** Optimistic-concurrency guard: the level version the reviewer loaded. */
  expectedVersion: z.number().int().min(1).optional(),
  policyVersion: z.string().max(50).optional(),
});
export type ReviewVerificationLevelInput = z.infer<typeof ReviewVerificationLevelSchema>;

export const VerifyVerificationDocumentSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected']),
  reasonCode: z.string().min(2).max(100).optional(),
});
export type VerifyVerificationDocumentInput = z.infer<typeof VerifyVerificationDocumentSchema>;

/** Queue filters accepted by the admin/compliance verification queue. */
export const TutorVerificationQueueSortValues = [
  'oldest_waiting',
  'newest',
  'expiring_soon',
] as const;
export type TutorVerificationQueueSort = (typeof TutorVerificationQueueSortValues)[number];

export const TutorVerificationQueueAssignmentValues = [
  'any',
  'assigned_to_me',
  'unassigned',
] as const;
export type TutorVerificationQueueAssignment =
  (typeof TutorVerificationQueueAssignmentValues)[number];

/** Dossier view shared by the applicant and the reviewer surfaces. */
export interface VerificationLevelRecord {
  level: TutorVerificationLevel;
  status: VerificationLevelStatus;
  assignedReviewerUserId: string | null;
  decisionReasonCode: string | null;
  /** Applicant-facing feedback only. */
  applicantFeedback: string | null;
  expiresAt: string | null;
  decidedAt: string | null;
  lastSubmittedAt: string | null;
  policyVersion: string;
  version: number;
}

export interface VerificationDocumentRecord {
  id: string;
  level: TutorVerificationLevel;
  documentType: VerificationDocumentType;
  fileAssetId: string;
  originalFilename: string | null;
  mediaType: string | null;
  sizeBytes: number | null;
  reviewStatus: VerificationDocumentReviewStatus;
  reasonCode: string | null;
  expiresOn: string | null;
  createdAt: string;
}

/** Outstanding mandatory-evidence report for one level. */
export interface VerificationLevelRequirements {
  level: TutorVerificationLevel;
  requiredDocumentTypes: readonly VerificationDocumentType[];
  anyOfDocumentTypes: readonly VerificationDocumentType[];
  /** Required types with no approved document (blocks level approval). */
  missingRequiredDocumentTypes: readonly VerificationDocumentType[];
  anyOfSatisfied: boolean;
  /** Every mandatory evidence type has an *approved* document. */
  complete: boolean;
  /**
   * Required types with no live upload at all (pending or approved). Submission
   * only needs the evidence to exist — a reviewer still has to approve it before
   * the level can be approved, so a tutor is never blocked waiting for review to
   * start. Blocks level submission only.
   */
  missingUploadDocumentTypes: readonly VerificationDocumentType[];
  /** A live (pending or approved) upload satisfies every `anyOf` requirement. */
  submitReady: boolean;
  /** Tutor-visible next action key, e.g. `upload_documents` | `resubmit` | `await_review`. */
  nextAction: VerificationNextAction;
}

export const VerificationNextActionValues = [
  'upload_documents',
  'fix_rejected_documents',
  'submit_level',
  'await_review',
  'none',
] as const;
export type VerificationNextAction = (typeof VerificationNextActionValues)[number];
