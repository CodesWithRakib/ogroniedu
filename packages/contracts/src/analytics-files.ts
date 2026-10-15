import { z } from 'zod';
import { IsoDateString } from './pagination.js';

/** Analytics + files contracts. Mirrors analytics/dto and tutors file DTO. */

export const AnalyticsGranularities = ['day', 'week', 'month'] as const;

export const AnalyticsTimeQuerySchema = z.object({
  startDate: IsoDateString.optional(),
  endDate: IsoDateString.optional(),
  granularity: z.enum(AnalyticsGranularities).optional().default('day'),
  tutorId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
});
export type AnalyticsTimeQuery = z.infer<typeof AnalyticsTimeQuerySchema>;

export const EvidencePurposes = [
  'nid',
  'academic_certificate',
  'degree',
  'other_evidence',
] as const;
export const EvidenceMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const MaxEvidenceFileSizeBytes = 10 * 1024 * 1024;

export const UploadEvidenceSchema = z.object({
  purpose: z.enum(EvidencePurposes),
  originalFilename: z.string().min(1),
  mediaType: z.enum(EvidenceMimeTypes),
  sizeBytes: z.number().int().min(1).max(MaxEvidenceFileSizeBytes),
  contentBase64: z.string().optional(),
});
export type UploadEvidenceInput = z.infer<typeof UploadEvidenceSchema>;
