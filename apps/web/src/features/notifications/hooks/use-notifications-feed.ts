'use client';

import React from 'react';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '@/store/services/notifications-api';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import type { NotificationItemDto } from '@ogroniedu/contracts';
import type { Locale } from '@/lib/i18n';

const FEED_PAGE_SIZE = 20;

/**
 * Notifications feed with real offset paging + client accumulation.
 * Each "load more" fetches the next page (`page`, fixed `limit`) and appends
 * unseen items (deduped by id) instead of re-fetching a growing window.
 * Cursor mode stays server-available; this feed uses offset because the list
 * view needs totals for the unread tab and mark-all-read affordance.
 */
export function useNotificationsFeed(locale: Locale) {
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<NotificationItemDto[]>([]);
  const query = useGetNotificationsQuery({
    page,
    unreadOnly,
    limit: FEED_PAGE_SIZE,
    pageSize: FEED_PAGE_SIZE,
    locale,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAll] = useMarkAllAsReadMutation();

  const pageItems = query.data?.items ?? [];
  React.useEffect(() => {
    if (pageItems.length === 0) return;
    setItems((prev) => {
      const seen = new Set(prev.map((n) => n.id));
      const fresh = pageItems.filter((n) => !seen.has(n.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, [pageItems]);

  // Filter change resets paging and the accumulated window.
  const setFilter = React.useCallback((next: boolean) => {
    setUnreadOnly(next);
    setPage(1);
    setItems([]);
  }, []);

  // Server-computed unread total (all pages); fallback to loaded items.
  const unreadCount = query.data?.unreadCount ?? items.filter((n) => !n.isRead).length;
  const hasNextPage = query.data?.hasNextPage ?? false;

  const wrap = (fn: () => Promise<unknown>) => async (): Promise<void> => {
    try {
      await fn();
      // Mutations change read state of accumulated rows: restart from page 1
      // so the list reflects server truth instead of stale flags.
      setItems([]);
      setPage(1);
      query.refetch();
    } catch (err) {
      throw new Error(normalizeUnknownError(err, locale).message);
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
