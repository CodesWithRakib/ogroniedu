import { z } from 'zod';
import { ApprovedConsentPolicy } from './identity.js';

/** Guardian contracts. Mirrors guardians/dto. */

export const RelationshipTypes = ['father', 'mother', 'legal_guardian'] as const;
const e164 = /^\+?[1-9]\d{6,14}$/;
const ymd = /^\d{4}-\d{2}-\d{2}$/;

const consentFields = {
  relationshipType: z.enum(RelationshipTypes),
  consentPolicyVersion: z.literal(ApprovedConsentPolicy),
  consentAgreed: z.literal(true),
};

export const LinkChildRequestSchema = z.object({
  studentIdentifier: z.string().min(1),
  ...consentFields,
});
export type LinkChildRequestInput = z.infer<typeof LinkChildRequestSchema>;

export const RegisterChildSchema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(e164).optional(),
  dateOfBirth: z.string().regex(ymd).optional(),
  educationLevelId: z.string().uuid().optional(),
  curriculumId: z.string().uuid().optional(),
  institutionName: z.string().max(150).optional(),
  ...consentFields,
});
export type RegisterChildInput = z.infer<typeof RegisterChildSchema>;

export const VerifyLinkSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});
export type VerifyLinkInput = z.infer<typeof VerifyLinkSchema>;

export const RevokeLinkSchema = z.object({
  reason: z.string().max(300).optional(),
});
export type RevokeLinkInput = z.infer<typeof RevokeLinkSchema>;
