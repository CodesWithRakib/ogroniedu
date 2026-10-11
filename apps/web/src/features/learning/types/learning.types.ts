export type AttendanceItemStatus = 'present' | 'late' | 'absent' | 'excused';
export type SubmissionItemStatus = 'submitted' | 'late' | 'reviewed' | 'returned';
export type LearningRole = 'student' | 'tutor' | 'guardian' | 'admin';

export interface AttendanceRecordItem {
  id: string;
  sessionId: string;
  participantUserId: string;
  attendanceStatus: AttendanceItemStatus;
  recordedAt: string;
  notes?: string | null;
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

export interface AssignmentItem {
  id: string;
  bookingId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  maxScore: number;
  status: 'draft' | 'published' | 'archived';
  submission?: SubmissionItem | null;
}

export interface ProgressReportItem {
  id: string;
  bookingId: string;
  periodStart: string;
  periodEnd: string;
  attendanceRate: number;
  assignmentsCompleted: number;
  averageScore?: number | null;
  observableProgress: string;
  areasForGrowth?: string | null;
  tutorRemarks?: string | null;
  generatedAt: string;
}

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
  locale: import('@/lib/i18n').Locale;
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
