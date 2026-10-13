'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import {
  useGetSessionsQuery,
  useRescheduleSessionMutation,
  useCancelSessionMutation,
} from '@/store/services/sessions-api';
import type { CalendarSessionItem } from '@/components/scheduling/SessionScheduleCalendar';

/** Feature-level sessions hook: calendar items + reschedule/cancel actions with localized errors. */
export function useSessionsCalendar(locale: Locale) {
  const { data, isFetching, isError, error, refetch } = useGetSessionsQuery();
  const [reschedule] = useRescheduleSessionMutation();
  const [cancel] = useCancelSessionMutation();

  const items: CalendarSessionItem[] = React.useMemo(
    () =>
      (data?.data ?? []).map((s) => ({
        id: s.id,
        bookingId: s.bookingId,
        subjectName: s.subjectName ?? (locale === 'bn' ? 'টিউটরিং ক্লাস' : 'Tutoring class'),
        tutorName: s.tutorName ?? '—',
        studentName: s.studentName ?? '—',
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        timezone: s.timezone ?? 'Asia/Dhaka',
        status: s.status,
        meetingUrl: s.meetingUrl ?? null,
        locationInstructions: (s.locationInstructions as string | null) ?? null,
      })),
    [data, locale],
  );

  const queryError = isError ? normalizeApiError(error, locale).message : null;

  async function onReschedule(sessionId: string, newStartsAt: string, reason: string) {
    try {
      await reschedule({ id: sessionId, newStartsAt, reason }).unwrap();
      refetch();
    } catch (err) {
      throw new Error(normalizeApiError(err as never, locale).message);
    }
  }

  async function onCancel(sessionId: string, reason: string) {
    try {
      await cancel({ id: sessionId, reason }).unwrap();
      refetch();
    } catch (err) {
      throw new Error(normalizeApiError(err as never, locale).message);
    }
  }

  return { items, isLoading: isFetching, queryError, onReschedule, onCancel };
}
