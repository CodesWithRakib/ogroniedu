import { z } from 'zod';

/**
 * Identity contracts (auth + users). Mirrors auth/dto + users/dto.
 * Backend DTOs remain authoritative for HTTP validation; these schemas are
 * the cross-stack source of truth — see contracts-parity.spec.ts.
 */

export const PlatformRoles = [
  'student',
  'guardian',
  'tutor',
  'support_agent',
  'compliance_reviewer',
  'admin',
  'super_admin',
  'organization_owner',
  'organization_staff',
] as const;

export type PlatformRole = (typeof PlatformRoles)[number];
export type CanonicalRole = PlatformRole;

export const SelfSignupRoles = ['student', 'guardian', 'tutor'] as const;
export const SupportedLocales = ['bn', 'en'] as const;
export const ApprovedConsentPolicy = 'v1.0-bd-minor-consent';
const e164 = /^\+?[1-9]\d{6,14}$/;
const ymd = /^\d{4}-\d{2}-\d{2}$/;

export const RegisterSchema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(e164).optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  role: z.enum(SelfSignupRoles),
  preferredLocale: z.enum(SupportedLocales).optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(3).max(128),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerificationPurposes = ['contact_verification', 'password_recovery'] as const;
const otp = /^(\d{4}|\d{6})$/;

/**
 * Centralized Static Development & Bypass OTP Configuration.
 * Single source of truth for the entire platform.
 * Change this value (or set STATIC_DEV_OTP / NEXT_PUBLIC_STATIC_DEV_OTP env var)
 * to update OTP verification across API, Onboarding, and Web interfaces.
 */
export const DEFAULT_STATIC_OTP = '123456';
const envMap = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
export const STATIC_DEV_OTP =
  envMap?.NEXT_PUBLIC_STATIC_DEV_OTP || envMap?.STATIC_DEV_OTP || DEFAULT_STATIC_OTP;

export const RequestCodeSchema = z.object({
  contact: z.string().min(3).max(128),
  purpose: z.enum(VerificationPurposes),
});
export type RequestCodeInput = z.infer<typeof RequestCodeSchema>;

export const VerifyCodeSchema = z.object({
  contact: z.string(),
  code: z.string().regex(otp),
  purpose: z.enum(VerificationPurposes),
});
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

export const ResetPasswordSchema = z.object({
  contact: z.string(),
  code: z.string().regex(otp),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const DeleteAccountSchema = z.object({
  confirmationText: z.literal('DELETE'),
  reason: z.string().max(500).optional(),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

/** Passwordless single-use login link. */
export const MagicLinkPurpose = ['login'] as const;

export const RequestMagicLinkSchema = z.object({
  email: z.string().email().max(254),
  /** Internal destination preserved after sign-in; external URLs are rejected. */
  redirectPath: z.string().max(256).optional(),
  locale: z.enum(SupportedLocales).optional(),
});
export type RequestMagicLinkInput = z.infer<typeof RequestMagicLinkSchema>;

export const ConsumeMagicLinkSchema = z.object({
  token: z.string().min(16).max(512),
});
export type ConsumeMagicLinkInput = z.infer<typeof ConsumeMagicLinkSchema>;

/**
 * Role-based onboarding tracks. Steps are owned by the backend
 * (`apps/api/src/modules/onboarding/onboarding.config.ts`); this enum is the
 * cross-stack key list used by the web onboarding UI.
 */
export const OnboardingTrackStatus = [
  'not_started',
  'in_progress',
  'pending_review',
  'completed',
] as const;
export type OnboardingTrackStatusValue = (typeof OnboardingTrackStatus)[number];

export const OnboardingStepStatusSchema = z.object({
  key: z.string(),
  titleEn: z.string(),
  titleBn: z.string(),
  required: z.boolean(),
  submittable: z.boolean(),
  approvalGated: z.boolean(),
  status: z.enum(['pending', 'completed', 'pending_review']),
});
export type OnboardingStepStatusValue = z.infer<typeof OnboardingStepStatusSchema>;

export const OnboardingStatusSchema = z.object({
  role: z.string().nullable(),
  roleLabelEn: z.string().nullable(),
  roleLabelBn: z.string().nullable(),
  status: z.enum(OnboardingTrackStatus),
  isComplete: z.boolean(),
  requiresApproval: z.boolean(),
  completedSteps: z.array(z.string()),
  pendingSteps: z.array(z.string()),
  steps: z.array(OnboardingStepStatusSchema),
  nextStep: z.string().nullable(),
  verificationStatus: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type OnboardingStatusValue = z.infer<typeof OnboardingStatusSchema>;

export const CompleteOnboardingStepSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type CompleteOnboardingStepInput = z.infer<typeof CompleteOnboardingStepSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  preferredLocale: z.enum(SupportedLocales).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpsertStudentProfileSchema = z.object({
  dateOfBirth: z.string().regex(ymd).optional(),
  educationLevelId: z.string().uuid().optional(),
  curriculumId: z.string().uuid().optional(),
  institutionName: z.string().max(150).optional(),
  stream: z.string().max(50).optional(),
  districtCode: z.string().max(20).optional(),
  upazilaCode: z.string().max(20).optional(),
  learningGoals: z.string().max(1000).optional(),
  profileVisibility: z.enum(['private', 'limited']).optional(),
});
export type UpsertStudentProfileInput = z.infer<typeof UpsertStudentProfileSchema>;
