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
import { useNotifications } from '@/components/notifications/NotificationProvider';

const HISTORY_PAGE_SIZE = 30;

/**
 * Real-time + Cursor-backed chat history:
 * - Listens on authenticated Socket.IO room (booking_chat:${bookingId})
 * - Immediate live message append & typing indicators
 * - Cursor history: latest page first, "load older" appends previous pages
 */
export function useBookingChat(bookingId: string, locale: Locale) {
  const { socket } = useNotifications();
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [older, setOlder] = React.useState<BookingMessage[]>([]);
  const [olderCursor, setOlderCursor] = React.useState<string | null>(null);
  const [liveAppends, setLiveAppends] = React.useState<BookingMessage[]>([]);
  const [typingUser, setTypingUser] = React.useState<string | null>(null);
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const query = useGetBookingMessagesQuery({ bookingId, pageSize: HISTORY_PAGE_SIZE });
  const [sendMutation, sendState] = useSendBookingMessageMutation();

  // New thread → drop accumulated older pages and live appends
  React.useEffect(() => {
    setOlder([]);
    setLiveAppends([]);
    setCursor(null);
    setOlderCursor(null);
    setTypingUser(null);
  }, [bookingId]);

  // Real-Time Socket.IO Room Joining & Event Handling
  React.useEffect(() => {
    if (!socket || !bookingId) return;

    // Join room
    socket.emit('join_booking_chat', { bookingId });

    // Handle new incoming messages
    const handleNewMessage = (msg: BookingMessage) => {
      if (msg.bookingId === bookingId) {
        setLiveAppends((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };

    // Handle typing indicators
    const handleUserTyping = (data: {
      bookingId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      if (data.bookingId === bookingId) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (data.isTyping) {
          setTypingUser(data.userName);
          typingTimerRef.current = setTimeout(() => setTypingUser(null), 4000);
        } else {
          setTypingUser(null);
        }
      }
    };

    // Handle live read receipts
    const handleMessagesRead = (data: {
      bookingId: string;
      readerUserId: string;
      messageId: string;
      readAt: string;
    }) => {
      if (data.bookingId === bookingId) {
        setLiveAppends((prev) =>
          prev.map((m) =>
            m.id === data.messageId || !m.readAt ? { ...m, readAt: data.readAt } : m,
          ),
        );
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.emit('leave_booking_chat', { bookingId });
      socket.off('new_chat_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [socket, bookingId]);

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

  // Older pages are fetched on demand
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
        // Malformed page: keep existing history
      }
    }
  }, [olderQuery.data, olderCursor]);

  const loadOlder = React.useCallback(() => {
    const target = older.length === 0 ? nextCursor : cursor;
    if (target) setOlderCursor(target);
  }, [older.length, nextCursor, cursor]);

  const canLoadOlder = (older.length === 0 ? nextCursor : cursor) !== null;

  // Unified message stream: older + latest fetched + real-time live appends
  const allMessages = React.useMemo(() => {
    const base = [...older, ...latest];
    const existingIds = new Set(base.map((m) => m.id));
    const fresh = liveAppends.filter((m) => !existingIds.has(m.id));
    return [...base, ...fresh];
  }, [older, latest, liveAppends]);

  const send = React.useCallback(
    async (
      content: string,
      attachmentAssetIds?: string[],
      metadata?: Record<string, unknown>,
    ): Promise<void> => {
      try {
        const res = await sendMutation({
          bookingId,
          content,
          attachmentAssetIds,
          metadata,
        }).unwrap();
        if (res?.data) {
          setLiveAppends((prev) =>
            prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data],
          );
        }
      } catch (err) {
        throw new Error(normalizeUnknownError(err, locale).message);
      }
    },
    [sendMutation, bookingId, locale],
  );

  const emitTyping = React.useCallback(
    (isTyping: boolean, userName?: string) => {
      if (socket?.connected) {
        socket.emit('chat_typing', { bookingId, isTyping, userName });
      }
    },
    [socket, bookingId],
  );

  return {
    messages: allMessages,
    isLoading: query.isLoading,
    isFetchingOlder: olderQuery.isFetching,
    errorMessage: query.isError ? normalizeApiError(query.error, locale).message : null,
    refetch: query.refetch,
    canLoadOlder,
    loadOlder,
    send,
    emitTyping,
    typingUser,
    isSending: sendState.isLoading,
  };
}
