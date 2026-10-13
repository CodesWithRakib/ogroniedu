import type { Locale } from '@/lib/i18n';
import type {
  AssignmentRecord,
  AttendanceRecord,
  AttendanceStatus,
  ProgressReportRecord,
} from '@/store/services/learning-api';

/**
 * Learning feature view-model types.
 *
 * Raw record shapes live in `@/store/services/learning-api` (single source of
 * truth). This module only narrows loose API fields for rendering and adds
 * display-only enrichment — it never re-declares the wire shape.
 */
export type AttendanceItemStatus = AttendanceStatus;
export type SubmissionItemStatus = 'submitted' | 'late' | 'reviewed' | 'returned';
export type LearningRole = 'student' | 'tutor' | 'guardian' | 'admin';

/** Attendance row plus display-only enrichment resolved from the session. */
export interface AttendanceRecordItem extends AttendanceRecord {
  subjectName?: string;
  sessionDate?: string;
}

export interface SubmissionItem {
  id: string;
  studentUserId: string;
  submissionText?: string | null;
  status: SubmissionItemStatus;
  score?: number | null;
  maxScore?: number | null;
  tutorFeedback?: string | null;
  reviewedAt?: string | null;
}

/** Assignment with the API's loose `status`/`submission.status` narrowed for UI. */
export interface AssignmentItem extends Omit<AssignmentRecord, 'status' | 'submission'> {
  status: 'draft' | 'published' | 'archived';
  submission?: SubmissionItem | null;
}

export type ProgressReportItem = ProgressReportRecord;

export interface MarkAttendanceInput {
  sessionId: string;
  participantUserId: string;
  attendanceStatus: AttendanceItemStatus;
  notes?: string;
}

export interface GradeSubmissionInput {
  score: number;
  tutorFeedback?: string;
  revisionReason?: string;
}

export interface GenerateReportInput {
  bookingId: string;
  periodStart: string;
  periodEnd: string;
  observableProgress: string;
  areasForGrowth?: string;
  tutorRemarks?: string;
}

export interface LearningManagementViewProps {
  locale: Locale;
  userRole?: LearningRole;
  initialAttendance?: AttendanceRecordItem[];
  initialAssignments?: AssignmentItem[];
  initialReports?: ProgressReportItem[];
  onMarkAttendance?: (data: MarkAttendanceInput) => Promise<void>;
  onSubmitAssignment?: (assignmentId: string, data: { submissionText: string }) => Promise<void>;
  onGradeSubmission?: (submissionId: string, data: GradeSubmissionInput) => Promise<void>;
  onGenerateReport?: (data: GenerateReportInput) => Promise<void>;
}

export interface LearningMetrics {
  attendanceRate: number;
  totalAttended: number;
  attendanceCount: number;
  completedAssignmentsCount: number;
  assignmentCount: number;
  averageScorePct: number | null;
  scoredSubmissionsCount: number;
}

/** Derive verifiable learning metrics from real records (never fabricate values). */
export function computeLearningMetrics(
  attendance: AttendanceRecordItem[],
  assignments: AssignmentItem[],
): LearningMetrics {
  const totalAttended = attendance.filter(
    (a) => a.attendanceStatus === 'present' || a.attendanceStatus === 'late',
  ).length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((totalAttended / attendance.length) * 100) : 100;

  const completedAssignmentsCount = assignments.filter(
    (a) => a.submission && a.submission.status !== 'returned',
  ).length;

  const scoredSubmissions = assignments
    .map((a) => a.submission)
    .filter((s): s is SubmissionItem =>
      Boolean(s && s.score !== null && s.score !== undefined && s.maxScore),
    );

  const averageScorePct =
    scoredSubmissions.length > 0
      ? Math.round(
          scoredSubmissions.reduce(
            (acc, s) => acc + (Number(s.score) / Number(s.maxScore)) * 100,
            0,
          ) / scoredSubmissions.length,
        )
      : null;

  return {
    attendanceRate,
    totalAttended,
    attendanceCount: attendance.length,
    completedAssignmentsCount,
    assignmentCount: assignments.length,
    averageScorePct,
    scoredSubmissionsCount: scoredSubmissions.length,
  };
}
