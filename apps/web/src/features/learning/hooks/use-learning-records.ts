'use client';

import React from 'react';
import { normalizeApiError } from '@/lib/api-error';
import { parseItem, parseOffsetCollection } from '@/lib/api/parse';
import type { Locale } from '@/lib/i18n';
import {
  useGetBookingRequestsQuery,
  type BookingRequestItem,
} from '@/store/services/bookings-api';
import {
  useCreateAssignmentMutation,
  useGenerateProgressReportMutation,
  useGetBookingLearningRecordsQuery,
  useGradeSubmissionMutation,
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

interface BookingLearningPayload {
  attendance: AttendanceRecord[];
  assignments: AssignmentRecord[];
  reports: ProgressReportRecord[];
}

const EMPTY_PAYLOAD: BookingLearningPayload = { attendance: [], assignments: [], reports: [] };

export interface LearningRecordsState {
  bookingIds: string[];
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
  createAssignment: (input: { title: string; maxScore: number }) => Promise<void>;
  submitAssignment: (assignmentId: string, data: { submissionText: string }) => Promise<void>;
  gradeSubmission: (submissionId: string, data: GradeSubmissionInput) => Promise<void>;
  generateReport: (data: GenerateReportInput) => Promise<void>;
}

/**
 * Learning data boundary: owns booking selection, record queries and all
 * learning mutations. Page/view components consume this instead of wiring
 * RTK hooks inline. Envelopes are unwrapped with the canonical parse helpers
 * and every failure surfaces a localized message plus field-level errors.
 */
export function useLearningRecords(locale: Locale): LearningRecordsState {
  const requests = useGetBookingRequestsQuery();
  const bookingIds = React.useMemo<string[]>(
    () =>
      requests.data
        ? parseOffsetCollection<BookingRequestItem>(requests.data).items.map((r) => r.id)
        : [],
    [requests.data],
  );

  const [activeBookingId, setActiveBookingId] = React.useState<string>('');
  React.useEffect(() => {
    if (!activeBookingId && bookingIds[0]) setActiveBookingId(bookingIds[0]);
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
  const reports = React.useMemo(() => mapProgressReports(payload.reports), [payload.reports]);

  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation();
  const [submitAssignment] = useSubmitAssignmentMutation();
  const [gradeSubmission] = useGradeSubmissionMutation();
  const [generateReport, { isLoading: generating }] = useGenerateProgressReportMutation();
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const fail = (err: unknown): never => {
    setFieldErrors(learningFieldErrors(err));
    throw new Error(normalizeApiError(err as never, locale).message);
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
    createAssignment: async (input) => {
      if (!activeBookingId) return;
      await runMutation(() =>
        createAssignment({
          bookingId: activeBookingId,
          title: input.title,
          maxScore: input.maxScore,
        }).unwrap(),
      );
    },
    submitAssignment: (assignmentId, data) =>
      runMutation(() => submitAssignment({ assignmentId, ...data }).unwrap()),
    gradeSubmission: (submissionId, data) =>
      runMutation(() => gradeSubmission({ submissionId, ...data }).unwrap()),
    generateReport: (data) => runMutation(() => generateReport(data).unwrap()),
  };
}
