'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NotificationItemDto, UnreadCountResponseDto } from '@ogroniedu/contracts';

interface NotificationToastItem extends NotificationItemDto {
  toastId: string;
}

interface NotificationContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadCount: number;
  notifications: NotificationItemDto[];
  toasts: NotificationToastItem[];
  dismissToast: (toastId: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isCenterOpen: boolean;
  setIsCenterOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string;
  userRole?: string;
  locale?: 'bn' | 'en';
  apiUrl?: string;
}

export function NotificationProvider({
  children,
  userId,
  userRole = 'guardian',
  locale = 'bn',
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
}: NotificationProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItemDto[]>([]);
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId) return;

    const socketInstance: Socket = io(`${apiUrl}/notifications`, {
      auth: {
        token: `mock:${userId}:${userRole}`,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('get_unread_count');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time notification received
    socketInstance.on('notification', (item: NotificationItemDto) => {
      setNotifications((prev) => [item, ...prev]);

      // Trigger pop-up toast
      const toastItem: NotificationToastItem = {
        ...item,
        toastId: `toast-${Date.now()}-${Math.random()}`,
      };
      setToasts((prev) => [toastItem, ...prev]);

      // Auto-dismiss toast after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastItem.toastId));
      }, 6000);
    });

    // Unread count update
    socketInstance.on('unread_count', (data: UnreadCountResponseDto) => {
      setUnreadCount(data.unreadCount);
    });

    // Notification marked as read from another tab
    socketInstance.on('notification_read', (data: { id: string; unreadCount: number }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === data.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount(data.unreadCount);
    });

    // All marked as read from another tab
    socketInstance.on('notifications_all_read', () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId, userRole, apiUrl]);

  // Fetch initial notifications from REST endpoint
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/notifications?locale=${locale}`, {
        headers: {
          'x-user-id': userId,
          'x-user-roles': userRole,
          'x-user-locale': locale,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Offline or network error handled gracefully
    }
  }, [apiUrl, userId, userRole, locale]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      if (socket && isConnected) {
        socket.emit('mark_as_read', { id });
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`${apiUrl}/api/v1/notifications/${id}/read`, {
          method: 'PATCH',
          headers: {
            'x-user-id': userId,
            'x-user-roles': userRole,
          },
        });
      } catch {
        // Handled silently
      }
    },
    [socket, isConnected, apiUrl, userId, userRole],
  );

  const markAllAsRead = useCallback(async () => {
    if (socket && isConnected) {
      socket.emit('mark_all_as_read');
    }

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);

    try {
      await fetch(`${apiUrl}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'x-user-roles': userRole,
        },
      });
    } catch {
      // Handled silently
    }
  }, [socket, isConnected, apiUrl, userId, userRole]);

  return (
    <NotificationContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        notifications,
        toasts,
        dismissToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        isCenterOpen,
        setIsCenterOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
