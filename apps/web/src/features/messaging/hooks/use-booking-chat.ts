'use client';

import React from 'react';
import {
  useGetBookingMessagesQuery,
  useSendBookingMessageMutation,
  useMarkAllBookingMessagesAsReadMutation,
  type BookingMessage,
} from '@/store/services/booking-messages-api';
import { parseCursorCollection } from '@/lib/api/parse';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const HISTORY_PAGE_SIZE = 30;

/**
 * WhatsApp/Messenger-style chat hook:
 *
 * 1. ONE initial API fetch on mount → populates first page of history
 * 2. ALL subsequent updates via Socket.IO (zero polling):
 *    - `new_chat_message` → live message append with dedup
 *    - `user_typing`      → typing indicator with auto-clear
 *    - `messages_read`    → read receipt update
 * 3. Cursor-backward pagination for older messages (loaded on-demand only)
 * 4. Optimistic send: message appears instantly, socket echo is deduped
 * 5. Socket reconnect: refetches current page to fill gaps
 */
export function useBookingChat(bookingId: string, locale: Locale) {
  const { socket, isConnected } = useNotifications();
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [older, setOlder] = React.useState<BookingMessage[]>([]);
  const [olderCursor, setOlderCursor] = React.useState<string | null>(null);
  const [liveAppends, setLiveAppends] = React.useState<BookingMessage[]>([]);
  const [readReceipts, setReadReceipts] = React.useState<
    Map<string, { readAt: string; readers: Map<string, { userId: string; name: string; seenAt: string }> }>
  >(new Map());
  const [typingUser, setTypingUser] = React.useState<string | null>(null);
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevConnectedRef = React.useRef(false);

  // ──────────────────────────────────────────────────────
  // 1. INITIAL API FETCH ONLY (no polling, no refetchOnFocus)
  // ──────────────────────────────────────────────────────
  const query = useGetBookingMessagesQuery(
    { bookingId, pageSize: HISTORY_PAGE_SIZE },
    {
      // No polling — socket handles real-time updates
      pollingInterval: 0,
      refetchOnFocus: false,
      refetchOnMountOrArgChange: true,
    },
  );
  const [sendMutation, sendState] = useSendBookingMessageMutation();
  const [markAllRead] = useMarkAllBookingMessagesAsReadMutation();

  // ──────────────────────────────────────────────────────
  // 2. RESET STATE on booking change
  // ──────────────────────────────────────────────────────
  React.useEffect(() => {
    setOlder([]);
    setLiveAppends([]);
    setReadReceipts(new Map());
    setCursor(null);
    setOlderCursor(null);
    setTypingUser(null);
  }, [bookingId]);

  // ──────────────────────────────────────────────────────
  // 3. SOCKET.IO REAL-TIME — the ONLY source of live updates
  // ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket || !bookingId) return;

    // Join the booking-specific chat room
    socket.emit('join_booking_chat', { bookingId });

    // ── New message handler (dedup by ID) ──
    const handleNewMessage = (msg: BookingMessage) => {
      if (msg.bookingId === bookingId) {
        setLiveAppends((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If the viewer is actively on this chat screen and receives a message from peer,
        // mark it as read immediately via API so the peer receives real-time blue checkmarks!
        markAllRead(bookingId).catch(() => {});
      }
    };

    // ── Typing indicator with auto-clear ──
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

    // ── Read receipt handler — track multiple viewers per message ──
    const handleMessagesRead = (data: {
      bookingId: string;
      readerUserId: string;
      readerName?: string;
      messageId: string;
      readAt: string;
    }) => {
      if (data.bookingId === bookingId) {
        setReadReceipts((prev) => {
          const next = new Map(prev);
          const current = next.get(data.messageId) || {
            readAt: data.readAt,
            readers: new Map(),
          };
          const readersCopy = new Map(current.readers);
          readersCopy.set(data.readerUserId, {
            userId: data.readerUserId,
            name: data.readerName || 'Participant',
            seenAt: data.readAt,
          });
          next.set(data.messageId, {
            readAt: current.readAt || data.readAt,
            readers: readersCopy,
          });
          return next;
        });

        setLiveAppends((prev) =>
          prev.map((m) => {
            if (m.id === data.messageId || (!m.readAt && data.readAt)) {
              const currentSeenBy = m.seenBy || [];
              const exists = currentSeenBy.some((r) => r.userId === data.readerUserId);
              const updatedSeenBy = exists
                ? currentSeenBy
                : [
                    ...currentSeenBy,
                    {
                      userId: data.readerUserId,
                      name: data.readerName || 'Participant',
                      seenAt: data.readAt,
                    },
                  ];

              return {
                ...m,
                readAt: m.readAt || data.readAt,
                readByName: data.readerName || m.readByName,
                readByUserId: data.readerUserId || m.readByUserId,
                seenBy: updatedSeenBy,
              };
            }
            return m;
          }),
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

  // ──────────────────────────────────────────────────────
  // 4. RECONNECT RECOVERY — refetch to fill gaps
  //    (like WhatsApp: when phone comes back online, sync)
  // ──────────────────────────────────────────────────────
  React.useEffect(() => {
    // Only trigger on reconnect (was disconnected → now connected)
    if (isConnected && !prevConnectedRef.current && bookingId) {
      query.refetch();
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, bookingId, query]);

  // ──────────────────────────────────────────────────────
  // 5. PARSE API RESPONSE
  // ──────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────
  // 6. OLDER PAGES — cursor pagination (on-demand only)
  // ──────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────
  // 7. UNIFIED MESSAGE STREAM with dedup
  //    older + API latest + socket live appends + real-time read receipts
  // ──────────────────────────────────────────────────────
  const allMessages = React.useMemo(() => {
    const base = [...older, ...latest];
    const existingIds = new Set(base.map((m) => m.id));
    const fresh = liveAppends.filter((m) => !existingIds.has(m.id));
    const combined = [...base, ...fresh];

    if (readReceipts.size === 0) return combined;

    return combined.map((m) => {
      const receipt = readReceipts.get(m.id);
      if (!receipt) return m;

      const currentSeenBy = m.seenBy || [];
      const mergedReadersMap = new Map<string, { userId: string; name: string; seenAt: string }>();
      for (const r of currentSeenBy) {
        mergedReadersMap.set(r.userId, r);
      }
      for (const [uid, r] of receipt.readers) {
        mergedReadersMap.set(uid, r);
      }

      const readersList = Array.from(mergedReadersMap.values());
      const firstReader = readersList[0];

      return {
        ...m,
        readAt: m.readAt || receipt.readAt,
        readByName: m.readByName || firstReader?.name,
        readByUserId: m.readByUserId || firstReader?.userId,
        seenBy: readersList,
      };
    });
  }, [older, latest, liveAppends, readReceipts]);

  // ──────────────────────────────────────────────────────
  // 8. OPTIMISTIC SEND — instant local + socket echo dedup
  // ──────────────────────────────────────────────────────
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
          // Add to live appends (will be deduped against socket echo)
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

  // ──────────────────────────────────────────────────────
  // 9. TYPING EMISSION (debounced by caller)
  // ──────────────────────────────────────────────────────
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
