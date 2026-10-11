'use client';

import React from 'react';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '@/store/services/notifications-api';
import { normalizeApiError } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';

const FEED_PAGE_SIZE = 20;

/**
 * Notifications feed: filter tabs + "load more" accumulation over the
 * legacy offset mode (items/total/hasNextPage preserved by the API).
 * Cursor mode is available server-side; this feed stays on offset because the
 * list view needs totals for the unread tab and mark-all-read affordance.
 */
export function useNotificationsFeed(locale: Locale) {
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const query = useGetNotificationsQuery({
    page: 1,
    unreadOnly,
    limit: FEED_PAGE_SIZE * page,
    pageSize: FEED_PAGE_SIZE,
    locale,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAll] = useMarkAllAsReadMutation();

  // Filter change resets paging.
  const setFilter = React.useCallback((next: boolean) => {
    setUnreadOnly(next);
    setPage(1);
  }, []);

  const items = query.data?.items ?? [];
  const hasNextPage = query.data?.hasNextPage ?? false;
  const unreadCount = items.filter((n) => !n.isRead).length;

  const wrap = (fn: () => Promise<unknown>) => async (): Promise<void> => {
    try {
      await fn();
      query.refetch();
    } catch (err) {
      throw new Error(normalizeApiError(err as never, locale).message);
    }
  };

  return {
    items,
    unreadCount,
    unreadOnly,
    setFilter,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetching && !query.isLoading,
    errorMessage: query.isError ? normalizeApiError(query.error, locale).message : null,
    refetch: query.refetch,
    hasNextPage,
    loadMore: () => setPage((p) => p + 1),
    markOneRead: (id: string) => wrap(() => markAsRead({ id }).unwrap())(),
    markAllRead: () => wrap(() => markAll().unwrap())(),
  };
}
