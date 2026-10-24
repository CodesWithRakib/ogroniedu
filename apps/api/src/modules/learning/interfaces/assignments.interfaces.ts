import type { AssignmentStatus } from '../entities/assignment.entity';
import type { SubmissionStatus } from '../entities/assignment-submission.entity';

export interface SubmissionView {
  id: string;
  assignmentId: string;
  studentUserId: string;
  submissionText: string | null;
  assetIds: string[];
  submittedAt: string;
  status: SubmissionStatus;
  workflowState: 'submitted' | 'under_review' | 'reviewed' | 'returned' | 'late';
  attemptCount: number;
  score: number | null;
  maxScore: number | null;
  tutorFeedback: string | null;
  returnReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  canSubmitAgain: boolean;
}

export interface AssignmentView {
  id: string;
  bookingId: string;
  sessionId: string | null;
  tutorUserId: string;
  studentUserId: string;
  subjectId: string | null;
  title: string;
  topic: string | null;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  status: AssignmentStatus;
  publishedAt: string | null;
  resubmissionAllowed: boolean;
  lateSubmissionAllowed: boolean;
  maxAttempts: number;
  createdAt: string;
  submission: SubmissionView | null;
}
