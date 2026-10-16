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
    const token = state?.auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token.trim()}`);
    }

    const locale = state?.ui?.activeLocale || state?.auth?.user?.preferredLocale || 'bn';
    headers.set('x-locale', locale);
    headers.set('accept', 'application/json');
    return headers;
  },
});

interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Single-flight refresh.
 *
 * Concurrent requests that all observe a 401 share one refresh call instead of
 * each triggering rotation (which would invalidate the others' new tokens and
 * cause a refresh storm). Refresh credentials travel as the API's `HttpOnly`
 * cookie; the in-memory refresh token is only sent when present.
 */
let refreshInFlight: Promise<RefreshedTokens | null> | null = null;

function refreshCredentials(api: {
  getState: () => unknown;
  dispatch: (action: unknown) => unknown;
}): Promise<RefreshedTokens | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const state = api.getState() as RootState;
        const body = state?.auth?.refreshToken ? { refreshToken: state.auth.refreshToken } : {};
        const refreshResult = await rawBaseQuery(
          { url: '/api/v1/auth/refresh', method: 'POST', body },
          api as never,
          {},
        );

        if (refreshResult.data && typeof refreshResult.data === 'object') {
          const rawData = refreshResult.data as Record<string, unknown>;
          const payload = (
            rawData.data && typeof rawData.data === 'object' ? rawData.data : rawData
          ) as { accessToken?: string; refreshToken?: string };
          if (payload?.accessToken) {
            return { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
          }
        }
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Base query with automatic 401 handling.
 *
 * - Login/register 401s are surfaced to the form (no side effects).
 * - Other 401s trigger one shared refresh attempt, then retry the original
 *   request exactly once. The retry is not re-entered, so there is no loop.
 * - If refresh fails the session is cleared locally.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const requestUrl = typeof args === 'string' ? args : args.url;
    const isAuthRoute =
      requestUrl.includes('/api/v1/auth/login') ||
      requestUrl.includes('/api/v1/auth/register') ||
      requestUrl.includes('/api/v1/auth/refresh') ||
      requestUrl.includes('/api/v1/auth/magic-link');

    if (!isAuthRoute) {
      const state = api.getState() as RootState;
      const refreshed = await refreshCredentials(api);

      if (refreshed && state?.auth?.user) {
        const { setCredentials } = await import('./slices/auth-slice');
        api.dispatch(
          setCredentials({
            user: state.auth.user,
            token: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? null,
          }),
        );
        return rawBaseQuery(args, api, extraOptions);
      }

      const { logout } = await import('./slices/auth-slice');
      api.dispatch(logout());
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
    'Onboarding',
  ],
  endpoints: () => ({}),
});

import type { SuccessEnvelope } from '@/lib/api/contract';

/** @deprecated Use SuccessEnvelope<T> from @/lib/api/contract (canonical envelope). */
export type ApiSuccessEnvelope<T> = SuccessEnvelope<T> & { total?: number };
