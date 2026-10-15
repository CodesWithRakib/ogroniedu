import { z } from 'zod';
import { IsoDateString } from './pagination.js';

/** Learning contracts. Mirrors learning/dto. */

export const AttendanceStatuses = ['present', 'late', 'absent', 'excused'] as const;

export const MarkAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  participantUserId: z.string().uuid(),
  attendanceStatus: z.enum(AttendanceStatuses),
  notes: z.string().max(1000).optional(),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

export const CreateAssignmentSchema = z.object({
  bookingId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  instructions: z.string().max(5000).optional(),
  dueAt: IsoDateString.optional(),
  maxScore: z.number().min(1).max(1000).optional(),
});
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

export const SubmitAssignmentSchema = z.object({
  submissionText: z.string().max(10000).optional(),
  assetIds: z.array(z.string().uuid()).optional(),
});
export type SubmitAssignmentInput = z.infer<typeof SubmitAssignmentSchema>;

export const GradeSubmissionSchema = z.object({
  score: z.number().min(0).max(1000),
  tutorFeedback: z.string().max(5000).optional(),
  revisionReason: z.string().max(500).optional(),
});
export type GradeSubmissionInput = z.infer<typeof GradeSubmissionSchema>;

export const CreateProgressReportSchema = z.object({
  bookingId: z.string().uuid(),
  periodStart: IsoDateString,
  periodEnd: IsoDateString,
  observableProgress: z.string().min(5).max(5000),
  areasForGrowth: z.string().max(5000).optional(),
  tutorRemarks: z.string().max(5000).optional(),
});
export type CreateProgressReportInput = z.infer<typeof CreateProgressReportSchema>;
