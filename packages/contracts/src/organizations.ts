import { z } from 'zod';

export const OrganizationTypes = [
  'coaching_center',
  'tutoring_agency',
  'academic_institution',
] as const;
export type OrganizationType = (typeof OrganizationTypes)[number];

export const OrganizationStatuses = [
  'pending_approval',
  'active',
  'suspended',
  'archived',
] as const;
export type OrganizationStatus = (typeof OrganizationStatuses)[number];

export const OrganizationMemberRoles = ['owner', 'admin', 'staff', 'tutor'] as const;
export type OrganizationMemberRole = (typeof OrganizationMemberRoles)[number];

export const OrganizationMemberStatuses = ['active', 'suspended', 'left'] as const;
export type OrganizationMemberStatus = (typeof OrganizationMemberStatuses)[number];

export const OrganizationInvitationStatuses = [
  'pending',
  'accepted',
  'rejected',
  'revoked',
  'expired',
] as const;
export type OrganizationInvitationStatus = (typeof OrganizationInvitationStatuses)[number];

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const e164 = /^\+?[1-9]\d{6,14}$/;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, 'Slug must be lower-case alphanumeric with hyphens'),
  type: z.enum(OrganizationTypes).default('coaching_center'),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(e164).optional(),
  tradeLicenseNumber: z.string().min(2).max(100).optional(),
  address: z.string().max(255).optional(),
  division: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  settings: z.record(z.string(), z.unknown()).default({}).optional(),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(OrganizationTypes).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().regex(e164).optional(),
  tradeLicenseNumber: z.string().min(2).max(100).optional(),
  address: z.string().max(255).optional(),
  division: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const UpdateOrganizationStatusSchema = z.object({
  status: z.enum(OrganizationStatuses),
  reason: z.string().min(3).max(500).optional(),
});
export type UpdateOrganizationStatusInput = z.infer<typeof UpdateOrganizationStatusSchema>;

export const InviteOrganizationMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'staff', 'tutor']),
});
export type InviteOrganizationMemberInput = z.infer<typeof InviteOrganizationMemberSchema>;

export const AcceptOrganizationInvitationSchema = z.object({
  token: z.string().min(10),
});
export type AcceptOrganizationInvitationInput = z.infer<typeof AcceptOrganizationInvitationSchema>;

export const TransferOrganizationOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid(),
  reason: z.string().min(3).max(500).optional(),
});
export type TransferOrganizationOwnershipInput = z.infer<
  typeof TransferOrganizationOwnershipSchema
>;

export const QueryOrganizationsSchema = z.object({
  search: z.string().optional(),
  type: z.enum(OrganizationTypes).optional(),
  status: z.enum(OrganizationStatuses).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type QueryOrganizationsInput = z.infer<typeof QueryOrganizationsSchema>;

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: OrganizationStatus;
  ownerUserId: string;
  tradeLicenseNumber?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface OrganizationMemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  joinedAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    email?: string | null;
    phoneE164?: string | null;
  };
}

export interface OrganizationInvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'staff' | 'tutor';
  status: OrganizationInvitationStatus;
  invitedByUserId: string;
  expiresAt: string;
  createdAt: string;
}
