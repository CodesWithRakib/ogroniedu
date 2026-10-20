'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeUnknownError } from '@/lib/api-error';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import {
  useScheduleSessionMutation,
  useScheduleRecurringSessionsMutation,
} from '@/store/services/sessions-api';
import { schedulableBookings } from '../utils/session-mappers';
import type {
  ScheduleRecurringInput,
  ScheduleSessionInput,
} from '../types/session.types';

/** Scheduling: eligible-booking options + one-off/recurring create actions. */
export function useScheduleSession(locale: Locale, studentId?: string) {
  const bookingsQuery = useGetBookingRequestsQuery(studentId ? { studentId } : undefined);
  const [schedule, { isLoading: isSchedulingOneOff }] = useScheduleSessionMutation();
  const [scheduleRecurring, { isLoading: isSchedulingRecurring }] =
    useScheduleRecurringSessionsMutation();

  const options = React.useMemo(
    () =>
      schedulableBookings(
        (bookingsQuery.data?.data ?? []).map((b) => ({ id: b.id, status: b.status })),
      ),
    [bookingsQuery.data],
  );

  async function scheduleOneOff(input: {
    bookingId: string;
    startsAt: string;
    meetingUrl?: string;
  }): Promise<void> {
    try {
      await schedule({
        bookingId: input.bookingId,
        startsAt: input.startsAt,
        meetingUrl: input.meetingUrl || undefined,
      }).unwrap();
    } catch (err) {
      throw new Error(normalizeUnknownError(err, locale).message);
    }
  }

  async function scheduleSeries(input: ScheduleRecurringInput): Promise<void> {
    try {
      await scheduleRecurring({
        ...input,
        idempotencyKey: `series:${input.bookingId}:${input.startDate}:${input.scheduleSlots
          .map((slot) => `${slot.weekday}-${slot.startLocal}`)
          .join(',')}:${input.count}`,
      }).unwrap();
    } catch (err) {
      throw new Error(normalizeUnknownError(err, locale).message);
    }
  }

  async function scheduleSession(input: ScheduleSessionInput): Promise<void> {
    if (input.mode === 'recurring') {
      await scheduleSeries(input);
      return;
    }
    await scheduleOneOff(input);
  }

  return {
    options,
    optionsLoading: bookingsQuery.isLoading,
    scheduleOneOff,
    scheduleSeries,
    scheduleSession,
    isScheduling: isSchedulingOneOff || isSchedulingRecurring,
  };
}
