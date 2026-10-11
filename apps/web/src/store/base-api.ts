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
      headers.set('authorization', `Bearer ${token}`);
    }

    const locale = state?.ui?.activeLocale || state?.auth?.user?.preferredLocale || 'bn';
    headers.set('x-locale', locale);
    headers.set('accept', 'application/json');
    return headers;
  },
});

/**
 * Base query with automatic 401 handling.
 * On Unauthorized, reset auth so guards redirect to login instead of
 * silently operating with a stale token.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    try {
      const { logout } = await import('./slices/auth-slice');
      api.dispatch(logout());
    } catch {
      // Slice import is best-effort; 401 still surfaces to the caller.
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

export type ApiSuccessEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  total?: number;
};
