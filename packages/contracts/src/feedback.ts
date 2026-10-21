import { z } from 'zod';

export const FeedbackCategories = [
  'bug',
  'usability',
  'feature_request',
  'performance',
  'accessibility',
  'other',
] as const;
export type FeedbackCategory = (typeof FeedbackCategories)[number];

export const FeedbackSeverities = [
  'p0_critical',
  'p1_high',
  'p2_medium',
  'p3_low',
] as const;
export type FeedbackSeverity = (typeof FeedbackSeverities)[number];

export const FeedbackStatuses = [
  'submitted',
  'triaged',
  'in_progress',
  'resolved',
  'declined',
] as const;
export type FeedbackStatus = (typeof FeedbackStatuses)[number];

export const CreateFeedbackSchema = z.object({
  category: z.enum(FeedbackCategories),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  route: z.string().max(255).optional(),
  reproductionSteps: z.string().max(5000).optional(),
  diagnosticMetadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;

export const TriageFeedbackSchema = z.object({
  severity: z.enum(FeedbackSeverities).optional(),
  status: z.enum(FeedbackStatuses).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  triageNotes: z.string().max(5000).optional(),
});
export type TriageFeedbackInput = z.infer<typeof TriageFeedbackSchema>;

export const QueryFeedbackSchema = z.object({
  category: z.enum(FeedbackCategories).optional(),
  severity: z.enum(FeedbackSeverities).optional(),
  status: z.enum(FeedbackStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type QueryFeedbackInput = z.infer<typeof QueryFeedbackSchema>;
