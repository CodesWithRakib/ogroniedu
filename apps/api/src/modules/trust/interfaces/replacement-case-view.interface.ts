import type {
  RefundEligibility,
  ReplacementReasonCode,
  ReplacementStatus,
} from '../entities/tutor-replacement-case.entity';

export interface ReplacementBookingSummary {
  id: string;
  status: string;
  subjectId: string;
  educationLevelId: string;
  tutorUserId: string;
  studentUserId: string;
  requesterUserId: string;
  mode: string;
  createdAt: string;
}

export interface ReplacementTutorSummary {
  id: string;
  displayName: string;
}

export interface ReplacementCaseView {
  id: string;
  bookingId: string;
  requestedBy: string;
  reasonCode: ReplacementReasonCode;
  explanation: string;
  status: ReplacementStatus;
  replacementTutorUserId: string | null;
  assignedTo: string | null;
  /** Applicant-facing note only. */
  userVisibleNote: string | null;
  refundEligibility: RefundEligibility;
  refundDecidedAt: string | null;
  deadlineAt: string | null;
  extendedAt: string | null;
  extensionReason: string | null;
  isOverdue: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  booking?: ReplacementBookingSummary;
  replacementTutor?: ReplacementTutorSummary;
  /** Admin-only. Omitted entirely for participants. */
  outcomeNotes?: string | null;
}

export interface ReplacementCaseEventView {
  id: string;
  eventType: string;
  actorRole: string;
  fromStatus: ReplacementStatus | null;
  toStatus: ReplacementStatus | null;
  userVisibleNote: string | null;
  /** Admin-only. Omitted entirely for participants. */
  internalNote?: string | null;
  createdAt: string;
}

export interface ReplacementCaseDetailView {
  case: ReplacementCaseView;
  history: ReplacementCaseEventView[];
}

export interface EligibleBookingView {
  bookingId: string;
  status: string;
  subjectId: string;
  educationLevelId: string;
  tutorUserId: string;
  mode: string;
  createdAt: string;
  activeCaseId: string | null;
  firstCompletedSessionAt: string | null;
  trialWindowOpen: boolean;
  hasTutorNoShow: boolean;
  tutorCancellationCount: number;
  eligibleReasonCodes: ReplacementReasonCode[];
}
