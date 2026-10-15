import { fieldErrorsOf } from '@/lib/api/parse';
import type {
  AssignmentRecord,
  AttendanceRecord,
  ProgressReportRecord,
} from '@/store/services/learning-api';
import type {
  AssignmentItem,
  AttendanceItemStatus,
  AttendanceRecordItem,
  ProgressReportItem,
  SubmissionItemStatus,
} from '../types/learning.types';

const SUBMISSION_STATUSES: readonly SubmissionItemStatus[] = [
  'submitted',
  'late',
  'reviewed',
  'returned',
];
const ATTENDANCE_STATUSES: readonly AttendanceItemStatus[] = [
  'present',
  'late',
  'absent',
  'excused',
];
const ASSIGNMENT_STATUSES: readonly AssignmentItem['status'][] = ['draft', 'published', 'archived'];

function isKnown<T extends string>(value: unknown, known: readonly T[]): value is T {
  return typeof value === 'string' && (known as readonly string[]).includes(value);
}

function toSubmissionStatus(value: unknown): SubmissionItemStatus {
  return isKnown(value, SUBMISSION_STATUSES) ? value : 'submitted';
}

function toAttendanceStatus(value: unknown): AttendanceItemStatus {
  return isKnown(value, ATTENDANCE_STATUSES) ? value : 'present';
}

function toAssignmentStatus(value: unknown): AssignmentItem['status'] {
  return isKnown(value, ASSIGNMENT_STATUSES) ? value : 'draft';
}

/**
 * Map raw learning API rows to render-ready view models. Loose `status`
 * strings are narrowed with safe defaults; unknown values never leak into UI.
 */
export function mapAttendanceRecords(rows: AttendanceRecord[]): AttendanceRecordItem[] {
  return rows.map((row) => ({
    ...row,
    attendanceStatus: toAttendanceStatus(row.attendanceStatus),
  }));
}

export function mapAssignmentRecords(rows: AssignmentRecord[]): AssignmentItem[] {
  return rows.map((row) => ({
    ...row,
    status: toAssignmentStatus(row.status),
    submission: row.submission
      ? { ...row.submission, status: toSubmissionStatus(row.submission.status) }
      : null,
  }));
}

export function mapProgressReports(rows: ProgressReportRecord[]): ProgressReportItem[] {
  return rows.map((row) => ({ ...row }));
}

/**
 * Extract canonical `details[]` field errors from a failed RTK mutation.
 * Accepts the raw rejection (reads `.data` when present) or a bare payload.
 */
export function learningFieldErrors(error: unknown): Record<string, string> {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    return fieldErrorsOf(error.data);
  }
  return fieldErrorsOf(error);
}
