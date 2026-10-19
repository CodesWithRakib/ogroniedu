import { baseApi } from '../base-api';
import type { SafetyReportRecord } from '@ogroniedu/contracts';
import type { TutorSearchItem } from './tutors-api';

export type { SafetyReportRecord };

export type ReplacementStatus =
  | 'requested'
  | 'under_review'
  | 'matching'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'closed'
  | 'refund_eligible'
  | 'cancelled';

export type RefundEligibility = 'not_determined' | 'eligible' | 'not_eligible';

export interface ReplacementCaseView {
  id: string;
  bookingId: string;
  requestedBy: string;
  reasonCode: string;
  explanation: string;
  status: ReplacementStatus;
  replacementTutorUserId: string | null;
  replacementTutor?: { id: string; displayName: string };
  assignedTo: string | null;
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
  booking?: {
    id: string;
    status: string;
    subjectId: string;
    educationLevelId: string;
    tutorUserId: string;
    studentUserId: string;
    requesterUserId: string;
    mode: string;
    createdAt: string;
  };
  /** Admin responses only. */
  outcomeNotes?: string | null;
}

export interface ReplacementCaseEventView {
  id: string;
  eventType: string;
  actorRole: string;
  fromStatus: ReplacementStatus | null;
  toStatus: ReplacementStatus | null;
  userVisibleNote: string | null;
  /** Admin responses only. */
  internalNote?: string | null;
  createdAt: string;
}

export interface ReplacementCaseDetailView {
  case: ReplacementCaseView;
  history: ReplacementCaseEventView[];
}

export interface ReplacementCaseListResponse {
  data: ReplacementCaseView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EligibleBookingItem {
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
  eligibleReasonCodes: string[];
}

export interface ReplacementCaseQuery {
  status?: ReplacementStatus;
  overdue?: boolean;
  assignedToMe?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  punctualityRating?: number;
  teachingClarityRating?: number;
  subjectMasteryRating?: number;
  comment: string;
}

export interface CreateSafetyReportRequest {
  reportedUserId?: string;
  bookingId?: string;
  category: string;
  severity?: string;
  description: string;
  evidenceAssetIds?: string[];
}

export interface TutorReviewItem {
  id: string;
  rating: number;
  comment: string;
  commentEn?: string | null;
  commentBn?: string | null;
  createdAt: string;
  isVerifiedBooking: boolean;
  reviewerDisplayName: string | null;
  reviewerDisplayNameEn?: string | null;
  reviewerDisplayNameBn?: string | null;
  tutorResponse: string | null;
  tutorResponseEn?: string | null;
  tutorResponseBn?: string | null;
  tutorRespondedAt: string | null;
}

export interface CreateReplacementRequest {
  bookingId: string;
  reasonCode: string;
  explanation: string;
}

export const trustApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleBookings: builder.query<{ success: boolean; data: EligibleBookingItem[] }, void>({
      query: () => '/api/v1/tutor-replacements/eligible-bookings',
      providesTags: [{ type: 'ReplacementCase', id: 'ELIGIBLE' }],
    }),
    getReplacementCandidates: builder.query<
      { success: boolean; data: TutorSearchItem[]; total: number },
      string
    >({
      query: (caseId) => `/api/v1/tutor-replacements/${caseId}/candidates`,
      providesTags: (_r, _e, caseId) => [{ type: 'ReplacementCase', id: `candidates-${caseId}` }],
    }),
    acceptReplacementOffer: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      string
    >({
      query: (caseId) => ({
        url: `/api/v1/tutor-replacements/${caseId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'ReplacementCase', id: 'ELIGIBLE' },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    declineReplacementOffer: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      string
    >({
      query: (caseId) => ({
        url: `/api/v1/tutor-replacements/${caseId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    cancelReplacementCase: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      string
    >({
      query: (caseId) => ({
        url: `/api/v1/tutor-replacements/${caseId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'ReplacementCase', id: 'ELIGIBLE' },
      ],
    }),
    extendReplacementDeadline: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      { caseId: string; hours: number; reason: string }
    >({
      query: ({ caseId, hours, reason }) => ({
        url: `/api/v1/tutor-replacements/${caseId}/deadline`,
        method: 'PATCH',
        body: { hours, reason },
      }),
      invalidatesTags: [{ type: 'ReplacementCase', id: 'LIST' }],
    }),
    runReplacementOverdueSweep: builder.mutation<
      { success: boolean; data: { processed: number } },
      void
    >({
      query: () => ({ url: '/api/v1/tutor-replacements/ops/sweep-overdue', method: 'POST' }),
      invalidatesTags: [{ type: 'ReplacementCase', id: 'LIST' }],
    }),
    createReview: builder.mutation<unknown, CreateReviewRequest>({
      query: (body) => ({ url: '/api/v1/reviews', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Review', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getTutorReviews: builder.query<
      { success: boolean; data: TutorReviewItem[] },
      { tutorId: string; includeAll?: boolean }
    >({
      query: ({ tutorId, includeAll }) =>
        `/api/v1/reviews/tutors/${tutorId}${includeAll ? '?all=true' : ''}`,
      providesTags: (_r, _e, arg) => [{ type: 'Review', id: arg.tutorId }],
    }),
    replyToReview: builder.mutation<unknown, { id: string; reply: string }>({
      query: ({ id, reply }) => ({
        url: `/api/v1/reviews/${id}/reply`,
        method: 'POST',
        body: { reply },
      }),
      invalidatesTags: [{ type: 'Review', id: 'LIST' }],
    }),
    moderateReview: builder.mutation<
      unknown,
      { id: string; status: 'pending' | 'published' | 'flagged' | 'hidden'; reason?: string }
    >({
      query: ({ id, status, reason }) => ({
        url: `/api/v1/reviews/${id}/moderate`,
        method: 'PATCH',
        body: reason ? { status, reason } : { status },
      }),
      invalidatesTags: [{ type: 'Review', id: 'LIST' }],
    }),
    createSafetyReport: builder.mutation<SafetyReportRecord, CreateSafetyReportRequest>({
      query: (body) => ({ url: '/api/v1/safety-reports', method: 'POST', body }),
      invalidatesTags: [
        { type: 'SafetyReport', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getSafetyReports: builder.query<SafetyReportRecord[], void>({
      query: () => '/api/v1/safety-reports',
      providesTags: [{ type: 'SafetyReport', id: 'LIST' }],
    }),
    getSafetyReportById: builder.query<SafetyReportRecord, string>({
      query: (id) => `/api/v1/safety-reports/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'SafetyReport', id }],
    }),
    updateSafetyReport: builder.mutation<
      SafetyReportRecord,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/api/v1/safety-reports/${id}`, method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'SafetyReport', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    createReplacementCase: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      CreateReplacementRequest
    >({
      query: (body) => ({ url: '/api/v1/tutor-replacements', method: 'POST', body }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'ReplacementCase', id: 'ELIGIBLE' },
        { type: 'Notification', id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
      ],
    }),
    getReplacementCases: builder.query<
      { success: boolean } & ReplacementCaseListResponse,
      ReplacementCaseQuery | void
    >({
      query: (params) => ({ url: '/api/v1/tutor-replacements', params: params ?? undefined }),
      providesTags: [{ type: 'ReplacementCase', id: 'LIST' }],
    }),
    getReplacementCaseById: builder.query<
      { success: boolean; data: ReplacementCaseDetailView },
      string
    >({
      query: (id) => `/api/v1/tutor-replacements/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'ReplacementCase', id }],
    }),
    updateReplacementCase: builder.mutation<
      { success: boolean; data: ReplacementCaseView },
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/api/v1/tutor-replacements/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateReviewMutation,
  useGetTutorReviewsQuery,
  useReplyToReviewMutation,
  useModerateReviewMutation,
  useCreateSafetyReportMutation,
  useGetSafetyReportsQuery,
  useGetSafetyReportByIdQuery,
  useUpdateSafetyReportMutation,
  useCreateReplacementCaseMutation,
  useGetReplacementCasesQuery,
  useGetReplacementCaseByIdQuery,
  useUpdateReplacementCaseMutation,
  useGetEligibleBookingsQuery,
  useGetReplacementCandidatesQuery,
  useAcceptReplacementOfferMutation,
  useDeclineReplacementOfferMutation,
  useCancelReplacementCaseMutation,
  useExtendReplacementDeadlineMutation,
  useRunReplacementOverdueSweepMutation,
} = trustApi;
