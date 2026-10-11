'use client';

import React, { useState, useTransition } from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';
import {
  computeLearningMetrics,
  type AssignmentItem,
  type AttendanceRecordItem,
  type GradeSubmissionInput,
  type LearningManagementViewProps,
  type ProgressReportItem,
} from '../types/learning.types';

export interface LearningManagementState {
  attendanceList: AttendanceRecordItem[];
  assignmentList: AssignmentItem[];
  reportList: ProgressReportItem[];
  metrics: ReturnType<typeof computeLearningMetrics>;

  submitModalAssignment: AssignmentItem | null;
  submissionText: string;
  openSubmitModal: (assignment: AssignmentItem) => void;
  closeSubmitModal: () => void;
  setSubmissionText: (text: string) => void;
  handleStudentSubmit: () => void;

  gradingModalAssignment: AssignmentItem | null;
  gradingScore: number;
  gradingFeedback: string;
  gradingRevisionReason: string;
  gradingError: string;
  setGradingScore: (score: number) => void;
  setGradingFeedback: (feedback: string) => void;
  setGradingRevisionReason: (reason: string) => void;
  openGradingModal: (assignment: AssignmentItem) => void;
  closeGradingModal: () => void;
  handleSubmitGrading: () => void;

  isPending: boolean;
}

/**
 * Owns learning-management local state, derived metrics, and the submit/grade
 * action lifecycle (including the audit requirement that a changed score needs
 * a revision reason). The view stays purely presentational.
 */
export function useLearningManagement({
  locale,
  initialAttendance = [],
  initialAssignments = [],
  initialReports = [],
  onSubmitAssignment,
  onGradeSubmission,
}: Pick<
  LearningManagementViewProps,
  'locale' | 'initialAttendance' | 'initialAssignments' | 'initialReports'
> & {
  onSubmitAssignment?: (assignmentId: string, data: { submissionText: string }) => Promise<void>;
  onGradeSubmission?: (submissionId: string, data: GradeSubmissionInput) => Promise<void>;
}): LearningManagementState {
  const dict = getDictionary(locale);
  const t = dict.learning as Record<string, string>;

  const [attendanceList] = useState<AttendanceRecordItem[]>(initialAttendance);
  const [assignmentList, setAssignmentList] = useState<AssignmentItem[]>(initialAssignments);
  const [reportList, setReportList] = useState<ProgressReportItem[]>(initialReports);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => setAssignmentList(initialAssignments), [initialAssignments]);
  React.useEffect(() => setReportList(initialReports), [initialReports]);

  const [submitModalAssignment, setSubmitModalAssignment] = useState<AssignmentItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [gradingModalAssignment, setGradingModalAssignment] = useState<AssignmentItem | null>(null);
  const [gradingScore, setGradingScore] = useState(0);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [gradingRevisionReason, setGradingRevisionReason] = useState('');
  const [gradingError, setGradingError] = useState('');

  const openSubmitModal = (assignment: AssignmentItem) => {
    setSubmitModalAssignment(assignment);
    setSubmissionText('');
  };

  const openGradingModal = (assignment: AssignmentItem) => {
    setGradingModalAssignment(assignment);
    setGradingScore(assignment.submission?.score ?? 0);
    setGradingFeedback(assignment.submission?.tutorFeedback ?? '');
    setGradingRevisionReason('');
    setGradingError('');
  };

  const handleStudentSubmit = () => {
    if (!submitModalAssignment) return;
    const target = submitModalAssignment;
    startTransition(async () => {
      try {
        if (onSubmitAssignment) {
          await onSubmitAssignment(target.id, { submissionText });
        }
        setAssignmentList((prev) =>
          prev.map((a) =>
            a.id === target.id
              ? {
                  ...a,
                  submission: {
                    id: `sub-local-${Date.now()}`,
                    studentUserId: 'student-id',
                    submissionText,
                    status: 'submitted',
                    maxScore: a.maxScore,
                  },
                }
              : a,
          ),
        );
        setSubmitModalAssignment(null);
        setSubmissionText('');
      } catch (err) {
        setGradingError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  const handleSubmitGrading = () => {
    const target = gradingModalAssignment;
    if (!target?.submission) return;
    const previousScore = target.submission.score;
    const isRevision =
      previousScore !== null && previousScore !== undefined && previousScore !== gradingScore;

    if (isRevision && !gradingRevisionReason.trim()) {
      setGradingError(t.revisionReasonRequired ?? 'A revision reason is required.');
      return;
    }

    startTransition(async () => {
      try {
        if (onGradeSubmission) {
          await onGradeSubmission(target.submission!.id, {
            score: gradingScore,
            tutorFeedback: gradingFeedback,
            revisionReason: isRevision ? gradingRevisionReason : undefined,
          });
        }
        setAssignmentList((prev) =>
          prev.map((a) =>
            a.id === target.id
              ? {
                  ...a,
                  submission: {
                    ...a.submission!,
                    score: gradingScore,
                    tutorFeedback: gradingFeedback,
                    status: 'reviewed',
                    reviewedAt: new Date().toISOString(),
                  },
                }
              : a,
          ),
        );
        setGradingModalAssignment(null);
      } catch (err) {
        setGradingError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return {
    attendanceList,
    assignmentList,
    reportList,
    metrics: computeLearningMetrics(attendanceList, assignmentList),
    submitModalAssignment,
    submissionText,
    openSubmitModal,
    closeSubmitModal: () => setSubmitModalAssignment(null),
    setSubmissionText,
    handleStudentSubmit,
    gradingModalAssignment,
    gradingScore,
    gradingFeedback,
    gradingRevisionReason,
    gradingError,
    setGradingScore,
    setGradingFeedback,
    setGradingRevisionReason,
    openGradingModal,
    closeGradingModal: () => setGradingModalAssignment(null),
    handleSubmitGrading,
    isPending,
  };
}

export type { Locale };
