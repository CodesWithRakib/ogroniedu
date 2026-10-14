'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import {
  useGetSessionsQuery,
  useRescheduleSessionMutation,
  useCancelSessionMutation,
} from '@/store/services/sessions-api';
import { mapSessionItems, toCancelAssessment } from '../utils/session-mappers';
import type { CalendarSessionItem, CancelAssessmentView } from '../types/session.types';

/** Feature-level sessions hook: calendar items + reschedule/cancel actions with localized errors. */
export function useSessionsCalendar(locale: Locale) {
  const { data, isFetching, isError, error, refetch } = useGetSessionsQuery();
  const [reschedule] = useRescheduleSessionMutation();
  const [cancel] = useCancelSessionMutation();

  const items: CalendarSessionItem[] = React.useMemo(
    () => mapSessionItems(data?.data ?? [], locale),
    [data, locale],
  );

  const queryError = isError ? normalizeApiError(error, locale).message : null;

  async function onReschedule(sessionId: string, newStartsAt: string, reason: string) {
    try {
      await reschedule({ id: sessionId, newStartsAt, reason }).unwrap();
      refetch();
    } catch (err) {
      throw new Error(normalizeUnknownError(err, locale).message);
    }
  }

  /**
   * Returns the server-computed cancellation assessment (refund matrix) so the
   * UI displays real policy values. Null when the backend omits it.
   */
  async function onCancel(sessionId: string, reason: string): Promise<CancelAssessmentView | null> {
    try {
      const res = await cancel({ id: sessionId, reason }).unwrap();
      refetch();
      const data = res?.data as { policyAssessment?: unknown } | undefined;
      const legacy = res as unknown as { assessment?: unknown };
      return toCancelAssessment(data?.policyAssessment ?? legacy.assessment ?? null);
    } catch (err) {
      throw new Error(normalizeUnknownError(err, locale).message);
    }
  }

  return { items, isLoading: isFetching, queryError, onReschedule, onCancel };
}
