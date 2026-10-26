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
  meta: {
    pagination: {
      strategy: 'offset';
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
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
  punctualityRating?: number | null;
  teachingClarityRating?: number | null;
  subjectMasteryRating?: number | null;
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
  moderationStatus?: string;
}

export interface CreateReplacementRequest {
  bookingId: string;
  reasonCode: string;
  explanation: string;
}

export interface BookingDisputeView {
  id: string;
  bookingId: string;
  disputedBy: string;
  reasonCode: string;
  description: string;
  evidenceAssetIds: string[];
  disputedAmountMinor: string | null;
  status: string;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolutionType: string | null;
  refundId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  policyVersion: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    status: string;
    pricePerSessionMinor: string;
    studentUserId: string;
    requesterUserId: string;
    tutorUserId: string;
    subject?: { name?: string; nameBn?: string; nameEn?: string };
    educationLevel?: { nameBn?: string; nameEn?: string };
    studentUser?: { displayName?: string };
    requesterUser?: { displayName?: string };
    tutorProfile?: { user?: { displayName?: string } };
  };
  disputant?: { id: string; displayName: string };
  resolver?: { id: string; displayName: string };
}

export interface CreateDisputeRequest {
  bookingId: string;
  reasonCode: string;
  description: string;
  disputedAmountMinor?: string | number;
  evidenceAssetIds?: string[];
}

export interface ResolveDisputeRequest {
  resolutionType: 'refund' | 'tutor_upheld' | 'partial_refund' | 'replacement' | 'dismissed';
  resolutionNotes: string;
  refundAmountMinor?: string | number;
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
      invalidatesTags: (_result, _error, body) => [
        { type: 'Review', id: 'LIST' },
        { type: 'Review', id: 'ADMIN_LIST' },
        { type: 'Review', id: `booking-${body.bookingId}` },
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
    getBookingReview: builder.query<
      { success: boolean; data: TutorReviewItem | null } | TutorReviewItem | null,
      { bookingId: string }
    >({
      query: ({ bookingId }) => `/api/v1/reviews/bookings/${bookingId}`,
      providesTags: (_r, _e, arg) => [{ type: 'Review', id: `booking-${arg.bookingId}` }],
    }),
    getAdminReviews: builder.query<
      { success: boolean; data: TutorReviewItem[] } | TutorReviewItem[],
      { status?: string } | void
    >({
      query: (arg) => `/api/v1/reviews/admin/all${arg && arg.status ? `?status=${arg.status}` : ''}`,
      providesTags: [{ type: 'Review', id: 'ADMIN_LIST' }],
    }),
    replyToReview: builder.mutation<unknown, { id: string; reply: string; bookingId?: string }>({
      query: ({ id, reply }) => ({
        url: `/api/v1/reviews/${id}/reply`,
        method: 'POST',
        body: { reply },
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Review', id: 'LIST' },
        { type: 'Review', id: 'ADMIN_LIST' },
        ...(arg.bookingId ? [{ type: 'Review' as const, id: `booking-${arg.bookingId}` }] : []),
      ],
    }),
    moderateReview: builder.mutation<
      unknown,
      { id: string; status: 'pending' | 'published' | 'flagged' | 'hidden'; reason?: string; bookingId?: string }
    >({
      query: ({ id, status, reason }) => ({
        url: `/api/v1/reviews/${id}/moderate`,
        method: 'PATCH',
        body: reason ? { status, reason } : { status },
      }),
      invalidatesTags: (_res, _err, arg) => [
        { type: 'Review', id: 'LIST' },
        { type: 'Review', id: 'ADMIN_LIST' },
        ...(arg.bookingId ? [{ type: 'Review' as const, id: `booking-${arg.bookingId}` }] : []),
      ],
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
    getDisputes: builder.query<
      {
        success: boolean;
        data: BookingDisputeView[];
        total: number;
        page: number;
        pageSize: number;
      },
      { status?: string; bookingId?: string; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({ url: '/api/v1/disputes', params: params ?? undefined }),
      providesTags: [{ type: 'BookingDispute' as any, id: 'LIST' }],
    }),
    getDisputeById: builder.query<{ success: boolean; data: BookingDisputeView }, string>({
      query: (id) => `/api/v1/disputes/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'BookingDispute' as any, id }],
    }),
    createDispute: builder.mutation<
      { success: boolean; data: BookingDisputeView },
      CreateDisputeRequest
    >({
      query: (body) => ({ url: '/api/v1/disputes', method: 'POST', body }),
      invalidatesTags: [
        { type: 'BookingDispute' as any, id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    resolveDispute: builder.mutation<
      { success: boolean; data: BookingDisputeView },
      { id: string; body: ResolveDisputeRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/v1/disputes/${id}/resolve`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [
        { type: 'BookingDispute' as any, id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    applyProtectiveSafetyHold: builder.mutation<
      { success: boolean; data: SafetyReportRecord },
      { reportId: string; reason: string }
    >({
      query: ({ reportId, reason }) => ({
        url: `/api/v1/safety-reports/${reportId}/protective-hold`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [
        { type: 'SafetyReport' as any, id: 'LIST' },
        { type: 'Tutor', id: 'LIST' },
      ],
    }),
    releaseProtectiveSafetyHold: builder.mutation<
      { success: boolean; data: SafetyReportRecord },
      string
    >({
      query: (reportId) => ({
        url: `/api/v1/safety-reports/${reportId}/protective-hold/release`,
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: 'SafetyReport' as any, id: 'LIST' },
        { type: 'Tutor', id: 'LIST' },
      ],
    }),
    assignCase: builder.mutation<
      SafetyReportRecord,
      { reportId: string; assignedTo: string; reason?: string }
    >({
      query: ({ reportId, assignedTo, reason }) => ({
        url: `/api/v1/safety-reports/${reportId}/assign`,
        method: 'POST',
        body: { assignedTo, reason },
      }),
      invalidatesTags: [
        { type: 'SafetyReport' as any, id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    addCaseMessage: builder.mutation<
      unknown,
      { reportId: string; message: string; isInternalNote?: boolean; attachmentAssetIds?: string[] }
    >({
      query: ({ reportId, ...body }) => ({
        url: `/api/v1/safety-reports/${reportId}/messages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'SafetyReport' as any, id: arg.reportId },
        { type: 'SafetyReport' as any, id: 'LIST' },
      ],
    }),
    updateCaseStatus: builder.mutation<
      SafetyReportRecord,
      { reportId: string; status: string; reason?: string }
    >({
      query: ({ reportId, status, reason }) => ({
        url: `/api/v1/safety-reports/${reportId}/status`,
        method: 'PATCH',
        body: { status, reason },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'SafetyReport' as any, id: arg.reportId },
        { type: 'SafetyReport' as any, id: 'LIST' },
      ],
    }),
    applyCaseSafetyAction: builder.mutation<
      unknown,
      {
        reportId: string;
        actionType: string;
        targetUserId: string;
        reason: string;
        expiresAt?: string;
      }
    >({
      query: ({ reportId, ...body }) => ({
        url: `/api/v1/safety-reports/${reportId}/actions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'SafetyReport' as any, id: 'LIST' },
        { type: 'Tutor', id: 'LIST' },
      ],
    }),
    resolveSafetyCase: builder.mutation<
      SafetyReportRecord,
      { reportId: string; resolutionNotes: string; status?: string; outcomeType?: string }
    >({
      query: ({ reportId, ...body }) => ({
        url: `/api/v1/safety-reports/${reportId}/resolve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'SafetyReport' as any, id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    reopenSafetyCase: builder.mutation<SafetyReportRecord, { reportId: string; reason: string }>({
      query: ({ reportId, reason }) => ({
        url: `/api/v1/safety-reports/${reportId}/reopen`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [{ type: 'SafetyReport' as any, id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateReviewMutation,
  useGetTutorReviewsQuery,
  useGetBookingReviewQuery,
  useGetAdminReviewsQuery,
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
  useGetDisputesQuery,
  useGetDisputeByIdQuery,
  useCreateDisputeMutation,
  useResolveDisputeMutation,
  useApplyProtectiveSafetyHoldMutation,
  useReleaseProtectiveSafetyHoldMutation,
  useAssignCaseMutation,
  useAddCaseMessageMutation,
  useUpdateCaseStatusMutation,
  useApplyCaseSafetyActionMutation,
  useResolveSafetyCaseMutation,
  useReopenSafetyCaseMutation,
} = trustApi;
