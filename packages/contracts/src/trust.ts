import { z } from 'zod';

/** Trust & safety contracts. Mirrors trust/dto (create shapes). */

export const SafetyCategories = [
  'harassment',
  'child_safety',
  'inappropriate_content',
  'off_platform_payment',
  'academic_dishonesty',
  'fraud_billing',
  'other',
] as const;
export const SafetySeverities = ['low', 'medium', 'high', 'critical'] as const;
export const ReplacementReasonCodes = [
  'trial_dissatisfaction',
  'frequent_tutor_cancellation',
  'tutor_no_show',
  'teaching_mismatch',
  'unprofessional_conduct',
  'other',
] as const;

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  punctualityRating: z.number().int().min(1).max(5).optional(),
  teachingClarityRating: z.number().int().min(1).max(5).optional(),
  subjectMasteryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(2000),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const CreateSafetyReportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  category: z.enum(SafetyCategories),
  severity: z.enum(SafetySeverities).optional(),
  description: z.string().min(10).max(5000),
  evidenceAssetIds: z.array(z.string().uuid()).optional(),
});
export type CreateSafetyReportInput = z.infer<typeof CreateSafetyReportSchema>;

export const CreateReplacementCaseSchema = z.object({
  bookingId: z.string().uuid(),
  reasonCode: z.enum(ReplacementReasonCodes),
  explanation: z.string().min(1).max(3000),
});
export type CreateReplacementCaseInput = z.infer<typeof CreateReplacementCaseSchema>;

export const ReviewModerationStatuses = ['pending', 'published', 'flagged', 'hidden'] as const;

export const ModerateReviewSchema = z.object({
  status: z.enum(ReviewModerationStatuses),
  reason: z.string().min(1).optional(),
});
export type ModerateReviewInput = z.infer<typeof ModerateReviewSchema>;

export const TutorReplySchema = z.object({
  reply: z.string().min(1).max(1000),
});
export type TutorReplyInput = z.infer<typeof TutorReplySchema>;

export const SafetyStatuses = [
  'submitted',
  'under_investigation',
  'escalated',
  'action_taken',
  'dismissed',
] as const;
export const EscalationLevels = ['standard', 'urgent_child_safety', 'legal_review'] as const;

export const UpdateSafetyReportSchema = z.object({
  status: z.enum(SafetyStatuses).optional(),
  escalationLevel: z.enum(EscalationLevels).optional(),
  resolutionNotes: z.string().min(1).optional(),
});
export type UpdateSafetyReportInput = z.infer<typeof UpdateSafetyReportSchema>;

export const ReplacementStatuses = [
  'requested',
  'under_review',
  'matching',
  'offered',
  'accepted',
  'rejected',
  'closed',
] as const;

export const UpdateReplacementCaseSchema = z.object({
  status: z.enum(ReplacementStatuses).optional(),
  replacementTutorUserId: z.string().uuid().optional(),
  outcomeNotes: z.string().min(1).optional(),
});
export type UpdateReplacementCaseInput = z.infer<typeof UpdateReplacementCaseSchema>;

export interface SafetyReportRecord {
  id: string;
  reporterUserId: string;
  reportedUserId: string | null;
  bookingId: string | null;
  category: (typeof SafetyCategories)[number];
  severity: (typeof SafetySeverities)[number];
  description: string;
  evidenceAssetIds: string[];
  status: (typeof SafetyStatuses)[number];
  escalationLevel: (typeof EscalationLevels)[number];
  policyVersion: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    displayName: string;
  };
  reportedUser?: {
    id: string;
    displayName: string;
  };
}

export interface ReplacementCaseRecord {
  id: string;
  bookingId: string;
  requestedBy: string;
  reasonCode: (typeof ReplacementReasonCodes)[number];
  explanation: string;
  status: (typeof ReplacementStatuses)[number];
  replacementTutorUserId?: string | null;
  outcomeNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    studentUserId: string;
    requesterUserId?: string;
    tutorUserId: string;
    status: string;
    subject?: { name: string; code: string };
  };
  replacementTutor?: {
    id: string;
    displayName: string;
  };
}
