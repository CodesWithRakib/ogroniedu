import { z } from 'zod';

/** Support contracts. Mirrors support/dto + support/enums. */

export const SupportTicketStatuses = ['submitted', 'in_review', 'resolved', 'spam'] as const;
export const SupportTicketCategories = [
  'general',
  'tutorHelp',
  'tutorVerification',
  'paymentSupport',
  'safetyIncident',
] as const;

export const CreateSupportTicketSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().min(5).max(160),
  phone: z.string().min(6).max(20).optional(),
  category: z.enum(SupportTicketCategories).optional().default('general'),
  message: z.string().min(10).max(2000),
});
export type CreateSupportTicketInput = z.infer<typeof CreateSupportTicketSchema>;

export const UpdateSupportTicketSchema = z.object({
  status: z.enum(SupportTicketStatuses),
  resolutionNotes: z.string().max(1000).optional(),
});
export type UpdateSupportTicketInput = z.infer<typeof UpdateSupportTicketSchema>;
