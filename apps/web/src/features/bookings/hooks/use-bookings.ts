'use client';

import React from 'react';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';

/** Feature-level bookings hook: raw items + query states for list views. */
export function useBookings() {
  const query = useGetBookingRequestsQuery();
  const items = React.useMemo(() => {
    if (!query.data) return [];
    const raw = (query.data as { data?: unknown }).data;
    return Array.isArray(raw) ? (raw as unknown[]) : [];
  }, [query.data]);
  return { items, ...query };
}
