'use client';

import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetUnreadCountQuery } from '@/store/services/notifications-api';

/** Feature-level student hook: request/session/unread aggregates scoped to the signed-in student. */
export function useStudentDashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const unread = useGetUnreadCountQuery();

  // The requests endpoint is already scoped to the authenticated student server-side.
  const myRequests = requests.data?.data ?? [];

  return { user, requests, sessions, unread, myRequests };
}
