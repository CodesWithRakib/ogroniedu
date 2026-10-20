import { z } from 'zod';
import { IsoDateString, OffsetQuerySchema } from './pagination.js';

/** Learning contracts. Mirrors learning/dto. */

export const AttendanceStatuses = ['present', 'late', 'absent', 'excused'] as const;

export const MarkAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  participantUserId: z.string().uuid(),
  attendanceStatus: z.enum(AttendanceStatuses),
  notes: z.string().max(1000).optional(),
  correctionReason: z.string().max(500).optional(),
});
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

export const CreateAssignmentSchema = z.object({
  bookingId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  topic: z.string().max(200).optional(),
  instructions: z.string().max(5000).optional(),
  dueAt: IsoDateString.optional(),
  maxScore: z.number().min(1).max(1000).optional(),
  publishNow: z.boolean().optional(),
  resubmissionAllowed: z.boolean().optional(),
  lateSubmissionAllowed: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
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

export const ReturnSubmissionSchema = z.object({
  returnReason: z.string().min(3).max(2000),
  tutorFeedback: z.string().max(5000).optional(),
});
export type ReturnSubmissionInput = z.infer<typeof ReturnSubmissionSchema>;

export const CreateProgressReportSchema = z.object({
  bookingId: z.string().uuid(),
  periodStart: IsoDateString,
  periodEnd: IsoDateString,
  observableProgress: z.string().min(5).max(5000),
  areasForGrowth: z.string().max(5000).optional(),
  tutorRemarks: z.string().max(5000).optional(),
});
export type CreateProgressReportInput = z.infer<typeof CreateProgressReportSchema>;

// -----------------------------------------------------------------------------
// Lesson content
// -----------------------------------------------------------------------------

export const LessonPlanStepSchema = z.object({
  title: z.string().min(2).max(200),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(1000).optional(),
});

export const CreateLessonPlanSchema = z.object({
  bookingId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  objectives: z.array(z.string().max(300)).max(20).optional(),
  steps: z.array(LessonPlanStepSchema).max(20).optional(),
  publishNow: z.boolean().optional(),
});
export type CreateLessonPlanInput = z.infer<typeof CreateLessonPlanSchema>;

export const UploadLearningMaterialSchema = z.object({
  bookingId: z.string().uuid(),
  lessonPlanId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  originalFilename: z.string().max(255),
  mediaType: z.string(),
  sizeBytes: z.number().int().min(1),
  contentBase64: z.string().min(1),
  publishNow: z.boolean().optional(),
});
export type UploadLearningMaterialInput = z.infer<typeof UploadLearningMaterialSchema>;

export const CreateLinkMaterialSchema = z.object({
  bookingId: z.string().uuid(),
  lessonPlanId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  externalUrl: z.string().url().startsWith('https://'),
  publishNow: z.boolean().optional(),
});
export type CreateLinkMaterialInput = z.infer<typeof CreateLinkMaterialSchema>;

// -----------------------------------------------------------------------------
// Goals and reports
// -----------------------------------------------------------------------------

export const LearningGoalStatuses = [
  'open',
  'in_progress',
  'achieved',
  'not_achieved',
  'cancelled',
] as const;

export const CreateLearningGoalSchema = z.object({
  bookingId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  targetDate: IsoDateString.optional(),
});
export type CreateLearningGoalInput = z.infer<typeof CreateLearningGoalSchema>;

export const UpdateLearningGoalSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  targetDate: IsoDateString.nullable().optional(),
  status: z.enum(LearningGoalStatuses).optional(),
  evidence: z.string().max(5000).optional(),
});
export type UpdateLearningGoalInput = z.infer<typeof UpdateLearningGoalSchema>;

/** Shared list query for LMS collections (offset pagination). */
export const LearningListQuerySchema = OffsetQuerySchema.extend({
  bookingId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});
export type LearningListQueryInput = z.infer<typeof LearningListQuerySchema>;
