import type { AttendanceSummaryMetrics } from '../utils/learning-metrics';

export interface AttendanceSummary {
  studentId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessionsInPeriod: number;
  metrics: AttendanceSummaryMetrics;
}
