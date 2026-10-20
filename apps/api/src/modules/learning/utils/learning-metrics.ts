import type { AttendanceStatus } from '../entities/session-attendance.entity';

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  notRecorded: number;
}

export interface AttendanceSummaryMetrics extends AttendanceCounts {
  /** present + late + absent; the denominator for attendanceRate. */
  recorded: number;
  attended: number;
  /** present + late over recorded, or null when nothing was recorded. */
  attendanceRate: number | null;
  /** recorded sessions divided by eligible sessions, or null when none. */
  coverage: number | null;
}

export const ATTENDANCE_RECORDED_STATUSES: readonly AttendanceStatus[] = [
  'present',
  'late',
  'absent',
];

export function isAttended(status: AttendanceStatus): boolean {
  return status === 'present' || status === 'late';
}

/**
 * Attendance formula (see docs/features/lms/ATTENDANCE_RULES.md):
 * excused and not-recorded sessions are excluded from the denominator; a
 * zero denominator yields null rather than a fabricated 100%.
 */
export function computeAttendanceMetrics(
  statuses: readonly AttendanceStatus[],
  eligibleSessions: number,
): AttendanceSummaryMetrics {
  const counts: AttendanceCounts = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    notRecorded: 0,
  };
  for (const status of statuses) {
    if (status === 'present') counts.present += 1;
    else if (status === 'late') counts.late += 1;
    else if (status === 'absent') counts.absent += 1;
    else if (status === 'excused') counts.excused += 1;
  }

  const recorded = counts.present + counts.late + counts.absent;
  const attended = counts.present + counts.late;
  const rate = recorded > 0 ? Number(((attended / recorded) * 100).toFixed(2)) : null;
  const safeEligible = Math.max(0, eligibleSessions);
  const coverage =
    safeEligible > 0 ? Number(((recorded / safeEligible) * 100).toFixed(2)) : null;

  return {
    ...counts,
    notRecorded: Math.max(0, safeEligible - recorded),
    recorded,
    attended,
    attendanceRate: rate,
    coverage,
  };
}

/** Mean percentage across reviewed, scored submissions. Null when none. */
export function computeAverageScorePercent(
  scores: ReadonlyArray<{ score: number | null; maxScore: number | null }>,
): number | null {
  const valid = scores.filter(
    (row) =>
      row.score !== null &&
      row.maxScore !== null &&
      Number(row.maxScore) > 0 &&
      Number(row.score) >= 0,
  );
  if (valid.length === 0) return null;
  const total = valid.reduce(
    (sum, row) => sum + (Number(row.score) / Number(row.maxScore)) * 100,
    0,
  );
  return Number((total / valid.length).toFixed(2));
}

/** submitted ÷ published; null when no assignments were published. */
export function computeCompletionRate(submitted: number, published: number): number | null {
  if (published <= 0) return null;
  return Number(((submitted / published) * 100).toFixed(2));
}
