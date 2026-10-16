import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    if (!headers.has('x-request-id')) {
      try {
        headers.set('x-request-id', crypto.randomUUID());
      } catch {
        headers.set('x-request-id', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      }
    }

    const state = getState() as RootState;
    let token = state?.auth?.token;
    if (!token && typeof window !== 'undefined') {
      try {
        token = localStorage.getItem('ogroniedu.accessToken');
      } catch {
        // ignore
      }
    }
    if (token) {
      headers.set('authorization', `Bearer ${token.trim()}`);
    }

    const locale = state?.ui?.activeLocale || state?.auth?.user?.preferredLocale || 'bn';
    headers.set('x-locale', locale);
    headers.set('accept', 'application/json');
    return headers;
  },
});

/**
 * Base query with automatic 401 handling.
 * On Unauthorized:
 * - If login/register attempt, return error directly without side effects.
 * - If authenticated request, attempt token refresh via /api/v1/auth/refresh.
 * - On successful refresh, update credentials and retry the failed request.
 * - Only logout if refresh fails or no refresh token exists.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const requestUrl = typeof args === 'string' ? args : args.url;
    const isAuthRoute =
      requestUrl.includes('/api/v1/auth/login') ||
      requestUrl.includes('/api/v1/auth/register');

    if (!isAuthRoute) {
      const state = api.getState() as RootState;
      let refreshToken = state?.auth?.refreshToken;
      if (!refreshToken && typeof window !== 'undefined') {
        try {
          refreshToken = localStorage.getItem('ogroniedu.refreshToken');
        } catch {
          // ignore
        }
      }

      if (refreshToken && !requestUrl.includes('/api/v1/auth/refresh')) {
        const refreshResult = await rawBaseQuery(
          {
            url: '/api/v1/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions,
        );

        if (refreshResult.data && typeof refreshResult.data === 'object') {
          const rawData = refreshResult.data as Record<string, unknown>;
          const refreshPayload = (
            rawData.data && typeof rawData.data === 'object' ? rawData.data : rawData
          ) as { accessToken?: string; refreshToken?: string };
          const newAccessToken = refreshPayload?.accessToken;
          const newRefreshToken = refreshPayload?.refreshToken ?? refreshToken;

          if (newAccessToken && state?.auth?.user) {
            try {
              const { setCredentials } = await import('./slices/auth-slice');
              api.dispatch(
                setCredentials({
                  user: state.auth.user,
                  token: newAccessToken,
                  refreshToken: newRefreshToken,
                }),
              );
              // Retry the original failed query with the refreshed token
              result = await rawBaseQuery(args, api, extraOptions);
              return result;
            } catch {
              // Failed to update credentials
            }
          }
        }
      }

      // If refresh was not possible or refresh failed, reset auth session
      try {
        const { logout } = await import('./slices/auth-slice');
        api.dispatch(logout());
      } catch {
        // Slice import is best-effort
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Notification',
    'UnreadCount',
    'NotificationPreferences',
    'AuthUser',
    'User',
    'StudentProfile',
    'GuardianChild',
    'TutorSearch',
    'TutorProfile',
    'TutorVerification',
    'BookingRequest',
    'Session',
    'TutorCalendar',
    'Attendance',
    'Assignment',
    'Submission',
    'ProgressReport',
    'LearningSummary',
    'PaymentOrder',
    'PaymentReceipt',
    'Refund',
    'Reconciliation',
    'LedgerBalance',
    'BookingMessage',
    'SupportTicket',
    'Review',
    'SafetyReport',
    'ReplacementCase',
    'AdminDashboard',
    'AdminUser',
    'AdminBooking',
    'SystemSetting',
    'FeatureFlag',
    'AuditLog',
    'Analytics',
    'Taxonomy',
    'FileAsset',
  ],
  endpoints: () => ({}),
});

import type { SuccessEnvelope } from '@/lib/api/contract';

/** @deprecated Use SuccessEnvelope<T> from @/lib/api/contract (canonical envelope). */
export type ApiSuccessEnvelope<T> = SuccessEnvelope<T> & { total?: number };
