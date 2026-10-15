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
const otp = /^\d{6}$/;

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
