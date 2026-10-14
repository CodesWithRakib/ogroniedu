'use client';

import React from 'react';
import {
  useGetBookingMessagesQuery,
  useSendBookingMessageMutation,
  type BookingMessage,
} from '@/store/services/booking-messages-api';
import { parseCursorCollection } from '@/lib/api/parse';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';

const HISTORY_PAGE_SIZE = 30;

/**
 * Cursor-backed chat history: latest page first, "load older" appends
 * previous pages via opaque nextCursor. Send invalidates the thread.
 */
export function useBookingChat(bookingId: string, locale: Locale) {
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [older, setOlder] = React.useState<BookingMessage[]>([]);
  const [olderCursor, setOlderCursor] = React.useState<string | null>(null);
  const query = useGetBookingMessagesQuery({ bookingId, pageSize: HISTORY_PAGE_SIZE });
  const [sendMutation, sendState] = useSendBookingMessageMutation();

  // New thread → drop accumulated older pages.
  React.useEffect(() => {
    setOlder([]);
    setCursor(null);
    setOlderCursor(null);
  }, [bookingId]);

  const latest = React.useMemo(() => {
    if (!query.data) return [];
    try {
      return parseCursorCollection<BookingMessage>(query.data).items;
    } catch {
      return [];
    }
  }, [query.data]);

  const nextCursor = React.useMemo(() => {
    if (!query.data) return null;
    try {
      return parseCursorCollection<BookingMessage>(query.data).nextCursor;
    } catch {
      return null;
    }
  }, [query.data]);

  // Older pages are fetched on demand; each fetch appends one page in front.
  const olderQuery = useGetBookingMessagesQuery(
    { bookingId, cursor: olderCursor ?? '', pageSize: HISTORY_PAGE_SIZE },
    { skip: olderCursor === null },
  );

  React.useEffect(() => {
    if (olderQuery.data && olderCursor !== null) {
      try {
        const page = parseCursorCollection<BookingMessage>(olderQuery.data);
        setOlder((prev) => [...page.items, ...prev]);
        setCursor(page.nextCursor);
      } catch {
        // Malformed page: keep existing history, surface via query error state.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olderQuery.data]);

  const loadOlder = React.useCallback(() => {
    const target = older.length === 0 ? nextCursor : cursor;
    if (target) setOlderCursor(target);
  }, [older.length, nextCursor, cursor]);

  const canLoadOlder = (older.length === 0 ? nextCursor : cursor) !== null;

  const send = React.useCallback(
    async (content: string): Promise<void> => {
      try {
        await sendMutation({ bookingId, content }).unwrap();
      } catch (err) {
        throw new Error(normalizeUnknownError(err, locale).message);
      }
    },
    [sendMutation, bookingId, locale],
  );

  return {
    messages: [...older, ...latest],
    isLoading: query.isLoading,
    isFetchingOlder: olderQuery.isFetching,
    errorMessage: query.isError ? normalizeApiError(query.error, locale).message : null,
    refetch: query.refetch,
    canLoadOlder,
    loadOlder,
    send,
    isSending: sendState.isLoading,
  };
}
