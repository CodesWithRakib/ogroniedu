'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import {
  useGetBookingRequestsQuery,
  useWithdrawBookingRequestMutation,
  useRespondBookingRequestMutation,
} from '@/store/services/bookings-api';

/** Feature-level booking-requests hook: list state plus withdraw/respond actions. */
export function useBookingRequests(locale: Locale) {
  const user = useAppSelector((s) => s.auth.user);
  const isTutor = user?.roles?.includes('tutor');
  const { data, isLoading, isError, error, refetch } = useGetBookingRequestsQuery();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawBookingRequestMutation();
  const [respond, { isLoading: responding }] = useRespondBookingRequestMutation();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const items = data?.data ?? [];

  async function handleWithdraw(id: string) {
    setActionError(null);
    try {
      await withdraw({ id }).unwrap();
      refetch();
    } catch (err) {
      setActionError(normalizeApiError(err as never, locale).message);
    }
  }

  async function handleRespond(id: string, action: 'accept' | 'decline') {
    setActionError(null);
    try {
      await respond({ id, action }).unwrap();
      refetch();
    } catch (err) {
      setActionError(normalizeApiError(err as never, locale).message);
    }
  }

  const queryError = isError ? normalizeApiError(error, locale).message : null;

  return {
    items,
    isTutor,
    isLoading,
    withdrawing,
    responding,
    actionError,
    queryError,
    handleWithdraw,
    handleRespond,
  };
}
