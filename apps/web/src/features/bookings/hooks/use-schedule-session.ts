'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useScheduleSessionMutation } from '@/store/services/sessions-api';
import { schedulableBookings } from '../utils/session-mappers';

/** One-off scheduling: eligible-booking options + create action with localized errors. */
export function useScheduleSession(locale: Locale) {
  const bookingsQuery = useGetBookingRequestsQuery();
  const [schedule, { isLoading: isScheduling }] = useScheduleSessionMutation();

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
      throw new Error(normalizeApiError(err as never, locale).message);
    }
  }

  return {
    options,
    optionsLoading: bookingsQuery.isLoading,
    scheduleOneOff,
    isScheduling,
  };
}
