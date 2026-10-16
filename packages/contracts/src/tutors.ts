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
] as const;
export type TutorVerificationStatus = (typeof TutorVerificationStatusValues)[number];

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
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
    gender?: string | null;
    yearsExperience?: number | null;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
    verificationStatus: TutorVerificationStatus;
    publicationStatus: TutorPublicationStatus;
    profileCompletedAt?: string | null;
    qualifications: TutorQualificationRecord[];
    subjects: Array<{ id: string; subjectId?: string; subjectName?: string; proficiencyLevel?: string }>;
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
