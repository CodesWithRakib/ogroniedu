import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      // 1. Correlate with unique Request ID
      if (!headers.has('x-request-id')) {
        headers.set('x-request-id', crypto.randomUUID());
      }

      // 2. Attach Authorization Bearer token from Redux Auth state or localStorage
      const state = getState() as RootState;
      const token = state?.auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      // 3. Attach locale header
      const locale = state?.ui?.activeLocale || 'bn';
      headers.set('x-locale', locale);

      headers.set('accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Notification', 'UnreadCount', 'User', 'Session'],
  endpoints: () => ({}),
});
