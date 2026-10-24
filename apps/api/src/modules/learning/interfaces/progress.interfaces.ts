import type { computeAttendanceMetrics } from '../utils/learning-metrics';

export interface StudentProgressView {
  studentUserId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessions: {
    completed: number;
    upcoming: number;
    cancelled: number;
  };
  attendance: ReturnType<typeof computeAttendanceMetrics> & { sessionsInPeriod: number };
  assignments: {
    published: number;
    submitted: number;
    reviewed: number;
    completionRate: number | null;
    averageScore: number | null;
  };
  attendanceTrend: Array<{ month: string; attendanceRate: number | null; recorded: number }>;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    targetDate: string | null;
  }>;
  recentFeedback: Array<{
    submissionId: string;
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number | null;
    feedback: string;
    reviewedAt: string;
  }>;
  latestReport: {
    id: string;
    periodStart: string;
    periodEnd: string;
    generatedAt: string;
  } | null;
}
