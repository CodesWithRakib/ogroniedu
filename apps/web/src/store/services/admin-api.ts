import { baseApi, type ApiSuccessEnvelope } from '../base-api';
import { toQueryString } from '@/lib/api/query';
import type { OffsetCollectionEnvelope } from '@/lib/api/contract';

export interface AdminDashboardMetrics {
  pendingTutorVerifications: number;
  activeReplacementCases: number;
  openSafetyReports: number;
  activeBookingsCount: number;
  totalRegisteredUsers: number;
}

export interface ListUsersParams {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListSupportTicketsParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SupportTicketRow {
  id: string;
  name: string;
  email: string;
  phoneE164: string | null;
  category: string;
  message: string;
  status: 'submitted' | 'in_review' | 'resolved' | 'spam';
  reporterUserId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingTutorRow {
  userId: string;
  displayName: string;
  email?: string | null;
  phoneE164?: string | null;
  headline?: string | null;
  verificationStatus: string;
  publicationStatus: string;
  qualificationsCount: number;
  submittedAt: string;
}

export type TutorReviewDecision =
  'approved' | 'rejected' | 'needs_information' | 'suspended' | 'reinstated';

export interface ReviewTutorRequest {
  tutorId: string;
  decision: TutorReviewDecision;
  reasonCode: string;
  internalNotes?: string;
}

/** Shared serializer (replaces the former per-file toQuery duplicate). */
function toQuery(params: Record<string, string | number | undefined>): string {
  return toQueryString(params);
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<ApiSuccessEnvelope<AdminDashboardMetrics>, void>({
      query: () => '/api/v1/admin/dashboard',
      providesTags: [{ type: 'AdminDashboard', id: 'SUMMARY' }],
    }),
    listAdminUsers: builder.query<
      ApiSuccessEnvelope<unknown[]> & { total: number },
      ListUsersParams | void
    >({
      query: (params) =>
        `/api/v1/admin/users${toQuery((params ?? {}) as Record<string, string | number | undefined>)}`,
      providesTags: [{ type: 'AdminUser', id: 'LIST' }],
    }),
    getUserDossier: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (id) => `/api/v1/admin/users/${id}/dossier`,
      providesTags: (_r, _e, id) => [{ type: 'AdminUser', id }],
    }),
    suspendUser: builder.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({
        url: `/api/v1/admin/users/${id}/suspend`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'AdminUser', id },
        { type: 'AdminUser', id: 'LIST' },
      ],
    }),
    reactivateUser: builder.mutation<unknown, string>({
      query: (id) => ({ url: `/api/v1/admin/users/${id}/reactivate`, method: 'POST', body: {} }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'AdminUser', id },
        { type: 'AdminUser', id: 'LIST' },
      ],
    }),
    updateUserRoles: builder.mutation<unknown, { id: string; roles: string[] }>({
      query: ({ id, ...body }) => ({ url: `/api/v1/admin/users/${id}/roles`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'AdminUser', id },
        { type: 'AdminUser', id: 'LIST' },
      ],
    }),
    listAdminBookings: builder.query<
      ApiSuccessEnvelope<unknown[]> & { total: number },
      {
        status?: string;
        studentId?: string;
        tutorId?: string;
        limit?: number;
        offset?: number;
      } | void
    >({
      query: (params) =>
        `/api/v1/admin/bookings${toQuery((params ?? {}) as Record<string, string | number | undefined>)}`,
      providesTags: [{ type: 'AdminBooking', id: 'LIST' }],
    }),
    adminCancelBooking: builder.mutation<
      unknown,
      { id: string; reason: string; refundStudent: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/admin/bookings/${id}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'AdminBooking', id: 'LIST' },
        { type: 'BookingRequest', id: 'LIST' },
      ],
    }),
    getAdminReconciliation: builder.query<ApiSuccessEnvelope<unknown>, void>({
      query: () => '/api/v1/admin/reconciliation',
      providesTags: [{ type: 'Reconciliation', id: 'ADMIN' }],
    }),
    getSystemSettings: builder.query<ApiSuccessEnvelope<unknown[]>, void>({
      query: () => '/api/v1/admin/settings',
      providesTags: [{ type: 'SystemSetting', id: 'LIST' }],
    }),
    updateSystemSetting: builder.mutation<unknown, { key: string; value: Record<string, unknown> }>(
      {
        query: ({ key, value }) => ({
          url: `/api/v1/admin/settings/${key}`,
          method: 'PUT',
          body: { value },
        }),
        invalidatesTags: [{ type: 'SystemSetting', id: 'LIST' }],
      },
    ),
    getFeatureFlags: builder.query<ApiSuccessEnvelope<unknown[]>, void>({
      query: () => '/api/v1/admin/feature-flags',
      providesTags: [{ type: 'FeatureFlag', id: 'LIST' }],
    }),
    updateFeatureFlag: builder.mutation<
      unknown,
      { key: string; enabled: boolean; rules?: Record<string, unknown> }
    >({
      query: ({ key, ...body }) => ({
        url: `/api/v1/admin/feature-flags/${key}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'FeatureFlag', id: 'LIST' }],
    }),
    startImpersonation: builder.mutation<
      unknown,
      { targetUserId: string; reason: string; durationMinutes: number }
    >({
      query: (body) => ({ url: '/api/v1/admin/impersonation/start', method: 'POST', body }),
    }),
    queryAuditLogs: builder.query<
      ApiSuccessEnvelope<unknown[]> & { total: number },
      Record<string, string | number | undefined> | void
    >({
      query: (params) =>
        `/api/v1/admin/audit-logs${toQuery((params ?? {}) as Record<string, string | number | undefined>)}`,
      providesTags: [{ type: 'AuditLog', id: 'LIST' }],
    }),
    listSupportTickets: builder.query<
      OffsetCollectionEnvelope<SupportTicketRow>,
      ListSupportTicketsParams | void
    >({
      query: (params) =>
        `/api/v1/admin/support-tickets${toQuery((params ?? {}) as Record<string, string | number | undefined>)}`,
      providesTags: [{ type: 'SupportTicket', id: 'LIST' }],
    }),
    updateSupportTicket: builder.mutation<
      ApiSuccessEnvelope<SupportTicketRow>,
      { id: string; status: SupportTicketRow['status']; resolutionNotes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/v1/admin/support-tickets/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'SupportTicket', id },
        { type: 'SupportTicket', id: 'LIST' },
      ],
    }),
    getPendingTutors: builder.query<ApiSuccessEnvelope<PendingTutorRow[]>, void>({
      query: () => '/api/v1/admin/tutors/pending',
      providesTags: [{ type: 'TutorVerification', id: 'LIST' }],
    }),
    getTutorReviewDossier: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (tutorId) => `/api/v1/admin/tutors/${tutorId}/review-dossier`,
      providesTags: (_r, _e, tutorId) => [{ type: 'TutorVerification', id: tutorId }],
    }),
    reviewTutor: builder.mutation<unknown, ReviewTutorRequest>({
      query: ({ tutorId, ...body }) => ({
        url: `/api/v1/admin/tutors/${tutorId}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { tutorId }) => [
        { type: 'TutorVerification', id: 'LIST' },
        { type: 'TutorVerification', id: tutorId },
        { type: 'AdminDashboard', id: 'SUMMARY' },
      ],
    }),
    verifyTutorQualification: builder.mutation<
      ApiSuccessEnvelope<unknown>,
      { tutorId: string; qualificationId: string; reviewStatus: 'approved' | 'rejected' }
    >({
      query: ({ tutorId, qualificationId, reviewStatus }) => ({
        url: `/api/v1/admin/tutors/${tutorId}/qualifications/${qualificationId}/verify`,
        method: 'PATCH',
        body: { reviewStatus },
      }),
      invalidatesTags: (_r, _e, { tutorId }) => [
        { type: 'TutorVerification', id: tutorId },
        { type: 'TutorVerification', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminDashboardQuery,
  useListAdminUsersQuery,
  useLazyListAdminUsersQuery,
  useGetUserDossierQuery,
  useSuspendUserMutation,
  useReactivateUserMutation,
  useUpdateUserRolesMutation,
  useListAdminBookingsQuery,
  useAdminCancelBookingMutation,
  useGetAdminReconciliationQuery,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
  useGetFeatureFlagsQuery,
  useUpdateFeatureFlagMutation,
  useStartImpersonationMutation,
  useQueryAuditLogsQuery,
  useListSupportTicketsQuery,
  useUpdateSupportTicketMutation,
  useGetPendingTutorsQuery,
  useLazyGetTutorReviewDossierQuery,
  useReviewTutorMutation,
  useVerifyTutorQualificationMutation,
} = adminApi;
