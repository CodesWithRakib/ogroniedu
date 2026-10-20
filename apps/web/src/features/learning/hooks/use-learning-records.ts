'use client';

import React from 'react';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { parseItem, parseOffsetCollection } from '@/lib/api/parse';
import type { Locale } from '@/lib/i18n';
import { useGetBookingRequestsQuery, type BookingRequestItem } from '@/store/services/bookings-api';
import {
  AttendanceStatus,
  useCreateAssignmentMutation,
  useGenerateProgressReportMutation,
  useGetBookingLearningRecordsQuery,
  useGradeSubmissionMutation,
  useMarkAttendanceMutation,
  useSubmitAssignmentMutation,
  type AssignmentRecord,
  type AttendanceRecord,
  type ProgressReportRecord,
} from '@/store/services/learning-api';
import type {
  AssignmentItem,
  AttendanceRecordItem,
  GenerateReportInput,
  GradeSubmissionInput,
  ProgressReportItem,
} from '../types/learning.types';
import {
  learningFieldErrors,
  mapAssignmentRecords,
  mapAttendanceRecords,
  mapProgressReports,
} from '../utils/learning-mappers';

export interface BookingOption {
  id: string;
  label: string;
  subjectName: string;
  tutorName: string;
  studentName: string;
  studentUserId: string;
  status: string;
}

interface BookingLearningPayload {
  attendance: AttendanceRecord[];
  assignments: AssignmentRecord[];
  reports?: ProgressReportRecord[];
  progressReports?: ProgressReportRecord[];
}

const EMPTY_PAYLOAD: BookingLearningPayload = { attendance: [], assignments: [], reports: [] };

export interface LearningRecordsState {
  bookingIds: string[];
  bookingOptions: BookingOption[];
  activeBookingId: string;
  setActiveBookingId: (id: string) => void;
  attendance: AttendanceRecordItem[];
  assignments: AssignmentItem[];
  reports: ProgressReportItem[];
  isLoading: boolean;
  /** Localized query-level error message, or null when queries are healthy. */
  queryError: string | null;
  /** Canonical validation field errors from the most recent failed mutation. */
  fieldErrors: Record<string, string>;
  creating: boolean;
  generating: boolean;
  refetch: () => void;
  createAssignment: (input: {
    title: string;
    instructions?: string;
    dueAt?: string;
    maxScore: number;
    publishNow: boolean;
  }) => Promise<void>;
  activeBookingStudentId: string | null;
  submitAssignment: (assignmentId: string, data: { submissionText: string }) => Promise<void>;
  gradeSubmission: (submissionId: string, data: GradeSubmissionInput) => Promise<void>;
  generateReport: (data: GenerateReportInput) => Promise<void>;
  markAttendance: (
    sessionId: string,
    participantUserId: string,
    attendanceStatus: AttendanceStatus,
    notes?: string,
  ) => Promise<void>;
}

/**
 * Learning data boundary: owns booking selection, record queries and all
 * learning mutations. Page/view components consume this instead of wiring
 * RTK hooks inline. Envelopes are unwrapped with the canonical parse helpers
 * and every failure surfaces a localized message plus field-level errors.
 */
export function useLearningRecords(locale: Locale, studentId?: string): LearningRecordsState {
  const requests = useGetBookingRequestsQuery();
  const rawItems = React.useMemo<BookingRequestItem[]>(() => {
    const items = requests.data
      ? parseOffsetCollection<BookingRequestItem>(requests.data).items
      : [];
    // A guardian's child scope narrows the booking picker; the per-booking
    // learning query is keyed by booking id, so switching children fetches
    // that child's records rather than reusing the previous cache entry.
    return studentId ? items.filter((item) => item.studentUser?.id === studentId) : items;
  }, [requests.data, studentId]);

  const bookingOptions = React.useMemo<BookingOption[]>(() => {
    return rawItems.map((r) => {
      const tutorName =
        r.tutorProfile?.user?.displayName ||
        r.tutorProfile?.user?.fullName ||
        (locale === 'bn' ? 'শিক্ষক' : 'Tutor');
      const studentName =
        r.studentUser?.displayName ||
        r.studentUser?.fullName ||
        (locale === 'bn' ? 'শিক্ষার্থী' : 'Student');
      const subjectName =
        locale === 'bn' && r.subject?.nameBn
          ? r.subject.nameBn
          : r.subject?.name || (locale === 'bn' ? 'সাধারণ বিষয়' : 'General');
      const label = `${subjectName} — ${tutorName} (#${r.id.slice(0, 6)})`;
      return {
        id: r.id,
        label,
        subjectName,
        tutorName,
        studentName,
        studentUserId: r.studentUser?.id ?? '',
        status: r.status,
      };
    });
  }, [rawItems, locale]);

  const bookingIds = React.useMemo<string[]>(() => rawItems.map((r) => r.id), [rawItems]);

  const [activeBookingId, setActiveBookingId] = React.useState<string>('');
  React.useEffect(() => {
    if (!bookingIds.includes(activeBookingId)) {
      setActiveBookingId(bookingIds[0] ?? '');
    }
  }, [bookingIds, activeBookingId]);

  const records = useGetBookingLearningRecordsQuery(activeBookingId, {
    skip: !activeBookingId,
  });

  const payload = React.useMemo<BookingLearningPayload>(() => {
    if (!records.data) return EMPTY_PAYLOAD;
    try {
      return parseItem<BookingLearningPayload>(records.data);
    } catch {
      return EMPTY_PAYLOAD;
    }
  }, [records.data]);

  const attendance = React.useMemo(
    () => mapAttendanceRecords(payload.attendance),
    [payload.attendance],
  );
  const assignments = React.useMemo(
    () => mapAssignmentRecords(payload.assignments),
    [payload.assignments],
  );
  const reports = React.useMemo(
    () => mapProgressReports(payload.reports ?? payload.progressReports ?? []),
    [payload.reports, payload.progressReports],
  );

  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation();
  const [submitAssignment] = useSubmitAssignmentMutation();
  const [gradeSubmission] = useGradeSubmissionMutation();
  const [generateReport, { isLoading: generating }] = useGenerateProgressReportMutation();
  const [markAttendanceMutation] = useMarkAttendanceMutation();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const fail = (err: unknown): never => {
    setFieldErrors(learningFieldErrors(err));
    throw new Error(normalizeUnknownError(err, locale).message);
  };

  const runMutation = async (fn: () => Promise<unknown>): Promise<void> => {
    setFieldErrors({});
    try {
      await fn();
      records.refetch();
    } catch (err) {
      fail(err);
    }
  };

  return {
    bookingIds,
    bookingOptions,
    activeBookingId,
    setActiveBookingId,
    attendance,
    assignments,
    reports,
    isLoading: records.isLoading || requests.isLoading,
    queryError: records.isError ? normalizeApiError(records.error, locale).message : null,
    fieldErrors,
    creating,
    generating,
    refetch: () => {
      records.refetch();
    },
    activeBookingStudentId:
      bookingOptions.find((option) => option.id === activeBookingId)?.studentUserId ?? null,
    createAssignment: async (input) => {
      if (!activeBookingId) return;
      await runMutation(() =>
        createAssignment({
          bookingId: activeBookingId,
          title: input.title,
          instructions: input.instructions,
          dueAt: input.dueAt,
          maxScore: input.maxScore,
          publishNow: input.publishNow,
        }).unwrap(),
      );
    },
    submitAssignment: (assignmentId, data) =>
      runMutation(() => submitAssignment({ assignmentId, ...data }).unwrap()),
    gradeSubmission: (submissionId, data) =>
      runMutation(() => gradeSubmission({ submissionId, ...data }).unwrap()),
    generateReport: (data) => runMutation(() => generateReport(data).unwrap()),
    markAttendance: (sessionId, participantUserId, attendanceStatus, notes) =>
      runMutation(() =>
        markAttendanceMutation({
          sessionId,
          participantUserId,
          attendanceStatus,
          notes,
        }).unwrap(),
      ),
  };
}
