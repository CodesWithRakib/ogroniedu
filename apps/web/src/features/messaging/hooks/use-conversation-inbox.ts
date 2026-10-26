'use client';

import React from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useGetConversationsInboxQuery,
  useMarkAllBookingMessagesAsReadMutation,
  type BookingMessage,
} from '@/store/services/booking-messages-api';
import type { ConversationInboxItem } from '@ogroniedu/contracts';

/**
 * WhatsApp/Messenger-style inbox hook:
 *
 * ┌───────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE (like WhatsApp Web / Facebook Messenger)   │
 * │                                                          │
 * │  1. ONE initial REST fetch → loads conversation list     │
 * │  2. Socket `new_chat_message` → updates inbox in-memory: │
 * │     • Moves conversation to top                          │
 * │     • Updates last message preview                       │
 * │     • Increments unread badge (if not active chat)       │
 * │  3. Socket `messages_read` → clears unread badge         │
 * │  4. Socket reconnect → re-fetches to fill gaps           │
 * │  5. ZERO polling — socket is the only live data source   │
 * └───────────────────────────────────────────────────────────┘
 */
export function useConversationInbox(currentUserId: string, activeBookingId?: string | null) {
  const { socket, isConnected } = useNotifications();
  const [markAllRead] = useMarkAllBookingMessagesAsReadMutation();
  const prevConnectedRef = React.useRef(false);
  const activeBookingIdRef = React.useRef(activeBookingId);
  // Synchronously update ref during render to guarantee zero lag
  activeBookingIdRef.current = activeBookingId;

  // Clear unread count immediately in local state when a conversation becomes active
  React.useEffect(() => {
    if (activeBookingId) {
      setConversations((prev) =>
        prev.map((c) => (c.bookingId === activeBookingId ? { ...c, unreadCount: 0 } : c)),
      );
    }
  }, [activeBookingId]);

  // ──────────────────────────────────────────────────────
  // 1. SINGLE INITIAL FETCH — no polling, no refetchOnFocus
  // ──────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useGetConversationsInboxQuery(undefined, {
    pollingInterval: 0,
    refetchOnFocus: false,
    refetchOnMountOrArgChange: true,
  });

  // In-memory conversation state (starts from API data, updated in real time by socket)
  const [conversations, setConversations] = React.useState<ConversationInboxItem[]>(() =>
    data?.data ? data.data : [],
  );
  const [socketInitialized, setSocketInitialized] = React.useState(false);

  // Seed / sync from API response when initial data arrives or refetches
  React.useEffect(() => {
    if (data?.data) {
      setConversations(data.data);
    }
  }, [data]);

  // ──────────────────────────────────────────────────────
  // 2. SOCKET.IO — real-time inbox updates (no polling)
  // ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!socket || !currentUserId) return;

    /**
     * When a new chat message arrives (from any booking):
     * - Find the matching conversation in our list
     * - Update its lastMessage, unreadCount, and move it to top
     * - If the conversation doesn't exist yet, trigger a single refetch
     *   (this handles the rare case of a brand-new booking message)
     */
    const handleNewMessage = (msg: BookingMessage) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.bookingId === msg.bookingId);

        if (idx === -1) {
          // New conversation we don't have — trigger refetch to get it
          // (rare: only on first message of a new booking)
          refetch();
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[idx] };

        // Update last message preview
        conv.lastMessage = {
          id: msg.id,
          content: msg.content || msg.body || '',
          isRedacted: msg.isRedacted ?? false,
          createdAt: msg.createdAt,
          isMine: msg.senderUserId === currentUserId,
          readAt: msg.readAt ?? null,
        };

        // Update timestamp
        conv.updatedAt = msg.createdAt;

        // Increment unread if message is NOT from current user AND not currently open
        const isCurrentActive = activeBookingIdRef.current === msg.bookingId;
        if (msg.senderUserId !== currentUserId) {
          if (isCurrentActive) {
            conv.unreadCount = 0;
            // Instantly notify server we read it because we are already on this chat screen
            markAllRead(msg.bookingId).catch(() => {});
          } else {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
        }

        // Remove from old position
        updated.splice(idx, 1);
        // Insert at top (most recent first — like WhatsApp)
        updated.unshift(conv);

        return updated;
      });
    };

    /**
     * When messages are marked as read in a booking:
     * - Clear the unread count for that conversation
     */
    const handleMessagesRead = (data: {
      bookingId: string;
      readerUserId: string;
      messageId: string;
      readAt: string;
    }) => {
      // If WE are the reader OR the message is in our currently active conversation, reset unread count
      if (data.readerUserId === currentUserId || activeBookingIdRef.current === data.bookingId) {
        setConversations((prev) =>
          prev.map((c) => (c.bookingId === data.bookingId ? { ...c, unreadCount: 0 } : c)),
        );
      }
      // Partner read our message — update read receipt on last message
      if (data.readerUserId !== currentUserId) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.bookingId === data.bookingId && c.lastMessage?.id === data.messageId) {
              return {
                ...c,
                lastMessage: { ...c.lastMessage, readAt: data.readAt },
              };
            }
            return c;
          }),
        );
      }
    };

    socket.on('new_chat_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    setSocketInitialized(true);

    return () => {
      socket.off('new_chat_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, currentUserId, refetch]);

  // ──────────────────────────────────────────────────────
  // 3. RECONNECT RECOVERY — refetch gaps on reconnect
  //    (like WhatsApp: sync missed messages)
  // ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      refetch();
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, refetch]);

  // ──────────────────────────────────────────────────────
  // 4. MARK AS READ — optimistic + socket broadcast
  // ──────────────────────────────────────────────────────
  const markConversationAsRead = React.useCallback(
    (bookingId: string) => {
      // Optimistic: clear unread count immediately
      setConversations((prev) =>
        prev.map((c) => (c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c)),
      );
      // API call (non-blocking, errors are silent)
      markAllRead(bookingId).catch(() => {});
    },
    [markAllRead],
  );

  // ──────────────────────────────────────────────────────
  // 5. COMPUTED VALUES
  // ──────────────────────────────────────────────────────
  const totalUnread = React.useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  return {
    conversations,
    isLoading,
    isError,
    refetch,
    totalUnread,
    markConversationAsRead,
    isConnected,
    socketInitialized,
  };
}
