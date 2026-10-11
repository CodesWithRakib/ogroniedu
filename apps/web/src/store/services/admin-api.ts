import { baseApi, type ApiSuccessEnvelope } from '../base-api';

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

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.append(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<ApiSuccessEnvelope<AdminDashboardMetrics>, void>({
      query: () => '/api/v1/admin/dashboard',
      providesTags: [{ type: 'AdminDashboard', id: 'SUMMARY' }],
    }),
    listAdminUsers: builder.query<ApiSuccessEnvelope<unknown[]> & { total: number }, ListUsersParams | void>({
      query: (params) => `/api/v1/admin/users${toQuery((params ?? {}) as Record<string, string | number | undefined>)}`,
      providesTags: [{ type: 'AdminUser', id: 'LIST' }],
    }),
    getUserDossier: builder.query<ApiSuccessEnvelope<unknown>, string>({
      query: (id) => `/api/v1/admin/users/${id}/dossier`,
      providesTags: (_r, _e, id) => [{ type: 'AdminUser', id }],
    }),
    suspendUser: builder.mutation<unknown, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/api/v1/admin/users/${id}/suspend`, method: 'POST', body }),
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
      { status?: string; studentId?: string; tutorId?: string; limit?: number; offset?: number } | void
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
    updateSystemSetting: builder.mutation<unknown, { key: string; value: Record<string, unknown> }>({
      query: ({ key, value }) => ({
        url: `/api/v1/admin/settings/${key}`,
        method: 'PUT',
        body: { value },
      }),
      invalidatesTags: [{ type: 'SystemSetting', id: 'LIST' }],
    }),
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
} = adminApi;
