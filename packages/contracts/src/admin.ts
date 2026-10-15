import { z } from 'zod';
import { PlatformRoles } from './identity.js';

/** Admin operations contracts. Mirrors admin/dto. */

export const SuspendUserSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;

export const AdminCancelBookingSchema = z.object({
  reason: z.string().min(5).max(500),
  refundStudent: z.boolean().optional().default(true),
});
export type AdminCancelBookingInput = z.infer<typeof AdminCancelBookingSchema>;

export const UpdateUserRolesSchema = z.object({
  roles: z.array(z.enum(PlatformRoles)).min(1),
});
export type UpdateUserRolesInput = z.infer<typeof UpdateUserRolesSchema>;

export const SupportCaseTypes = ['replacement', 'safety', 'dispute'] as const;

export const AssignSupportCaseSchema = z.object({
  assignedToUserId: z.string().uuid(),
  caseType: z.enum(SupportCaseTypes),
  caseId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});
export type AssignSupportCaseInput = z.infer<typeof AssignSupportCaseSchema>;

export const StartImpersonationSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().min(5).max(500),
  durationMinutes: z.number().int().min(1).max(15).optional().default(15),
});
export type StartImpersonationInput = z.infer<typeof StartImpersonationSchema>;

export const QueryAuditLogsSchema = z.object({
  actorUserId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  limit: z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(1).max(200),
    )
    .optional()
    .default(50),
  offset: z
    .preprocess(
      (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
      z.number().int().min(0),
    )
    .optional()
    .default(0),
});
export type QueryAuditLogs = z.infer<typeof QueryAuditLogsSchema>;
