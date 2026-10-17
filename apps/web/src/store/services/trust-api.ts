import { baseApi } from '../base-api';
import type { SafetyReportRecord, ReplacementCaseRecord } from '@ogroniedu/contracts';

export type { SafetyReportRecord, ReplacementCaseRecord };

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

export interface CreateReplacementRequest {
  bookingId: string;
  reasonCode: string;
  explanation: string;
}

export const trustApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createReview: builder.mutation<unknown, CreateReviewRequest>({
      query: (body) => ({ url: '/api/v1/reviews', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Review', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getTutorReviews: builder.query<unknown, { tutorId: string; includeAll?: boolean }>({
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
    createReplacementCase: builder.mutation<ReplacementCaseRecord, CreateReplacementRequest>({
      query: (body) => ({ url: '/api/v1/tutor-replacements', method: 'POST', body }),
      invalidatesTags: [
        { type: 'ReplacementCase', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
      ],
    }),
    getReplacementCases: builder.query<ReplacementCaseRecord[], void>({
      query: () => '/api/v1/tutor-replacements',
      providesTags: [{ type: 'ReplacementCase', id: 'LIST' }],
    }),
    getReplacementCaseById: builder.query<ReplacementCaseRecord, string>({
      query: (id) => `/api/v1/tutor-replacements/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'ReplacementCase', id }],
    }),
    updateReplacementCase: builder.mutation<
      ReplacementCaseRecord,
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
} = trustApi;
