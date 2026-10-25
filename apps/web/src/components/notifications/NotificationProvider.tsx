'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppSelector } from '@/store';
import type { NotificationItemDto, UnreadCountResponseDto } from '@ogroniedu/contracts';
import {
  playNotificationSound,
  forcePlayNotificationSound,
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume as saveSoundVolume,
  unlockAudioContext,
  type NotificationSoundType,
} from '@/lib/audio/notification-sound';

export interface NotificationToastItem extends NotificationItemDto {
  toastId: string;
}

export interface NotificationContextType {
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
  // Audio notification controls
  soundEnabled: boolean;
  toggleSound: () => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  testSound: (type?: NotificationSoundType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  locale?: 'bn' | 'en';
  apiUrl?: string;
  /** @deprecated Auth is now read from the Redux session. Kept for backward compatibility. */
  userId?: string;
  /** @deprecated Auth is now read from the Redux session. Kept for backward compatibility. */
  userRole?: string;
}

const seenToastIds = new Set<string>();

export function NotificationProvider({
  children,
  locale = 'bn',
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
}: NotificationProviderProps) {
  const token = useAppSelector((s) => s.auth.token);
  const sessionUser = useAppSelector((s) => s.auth.user);
  const activeLocale = useAppSelector((s) => s.ui.activeLocale) || locale;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItemDto[]>([]);
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(0.9);
  const socketRef = useRef<Socket | null>(null);

  // Sync sound settings with localStorage
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
    setSoundVolumeState(getSoundVolume());
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabledState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      if (next) forcePlayNotificationSound('chime');
      return next;
    });
  }, []);

  const updateSoundVolume = useCallback((vol: number) => {
    setSoundVolumeState(vol);
    saveSoundVolume(vol);
  }, []);

  const testSound = useCallback((type?: NotificationSoundType) => {
    unlockAudioContext();
    forcePlayNotificationSound(type ?? 'chime');
  }, []);

  const pushToast = useCallback((item: NotificationItemDto) => {
    const dedupeKey = item.id || `${item.title}-${item.createdAt}`;
    if (seenToastIds.has(dedupeKey)) return;
    seenToastIds.add(dedupeKey);
    const toastItem: NotificationToastItem = {
      ...item,
      toastId: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setToasts((prev) => [toastItem, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastItem.toastId));
    }, 6000);
  }, []);

  // Authenticated Socket.IO connection (Bearer session, reconnects on token change)
  useEffect(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocket(null);
    setIsConnected(false);
    if (!token) return;

    const socketInstance: Socket = io(`${apiUrl}/notifications`, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('get_unread_count');
    });
    socketInstance.on('disconnect', () => setIsConnected(false));
    socketInstance.on('connect_error', () => {
      setIsConnected(false);
    });
    socketInstance.on('auth_error', (err) => {
      console.warn('Socket auth warning:', err);
      setIsConnected(false);
    });

    socketInstance.on('notification', (item: NotificationItemDto) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === item.id)) return prev;
        return [item, ...prev];
      });

      // Play synthesized audio tone based on category and urgency
      if (item.priority === 'urgent' || item.category === 'trust') {
        playNotificationSound('urgent');
      } else if (item.category === 'payment' || item.eventType === 'tutor.verified') {
        playNotificationSound('success');
      } else {
        playNotificationSound('chime');
      }

      pushToast(item);
    });
    socketInstance.on('unread_count', (data: UnreadCountResponseDto) => {
      setUnreadCount(data.unreadCount);
    });
    socketInstance.on('notification_read', (data: { id: string; unreadCount: number }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === data.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount(data.unreadCount);
    });
    socketInstance.on('notifications_all_read', () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [token, apiUrl, pushToast]);

  // Persisted history is the source of truth on (re)connect — recovers missed events.
  const refreshNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/v1/notifications?locale=${activeLocale}`, {
        headers: {
          authorization: `Bearer ${token}`,
          'x-locale': activeLocale,
          accept: 'application/json',
        },
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json?.data ?? json;
        const items: NotificationItemDto[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(json?.items)
              ? json.items
              : [];
        setNotifications(items);
        const count =
          typeof payload?.unreadCount === 'number'
            ? payload.unreadCount
            : typeof json?.unreadCount === 'number'
              ? json.unreadCount
              : items.filter((n) => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch {
      // Offline: keep last known state; socket reconnect will resync.
    }
  }, [apiUrl, token, activeLocale]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Resync after socket reconnects so missed events are recovered from history.
  useEffect(() => {
    if (isConnected) refreshNotifications();
  }, [isConnected, refreshNotifications]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      if (socketRef.current?.connected) socketRef.current.emit('mark_as_read', { id });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (!token) return;
      try {
        await fetch(`${apiUrl}/api/v1/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      } catch {
        // Optimistic state already applied; history resync will correct.
      }
    },
    [apiUrl, token],
  );

  const markAllAsRead = useCallback(async () => {
    if (socketRef.current?.connected) socketRef.current.emit('mark_all_as_read');
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);
    if (!token) return;
    try {
      await fetch(`${apiUrl}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch {
      // Optimistic state already applied.
    }
  }, [apiUrl, token]);

  void sessionUser;

  return (
    <NotificationContext.Provider
      value={{
        socket,
        isConnected: Boolean(token) && isConnected,
        unreadCount,
        notifications,
        toasts,
        dismissToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        isCenterOpen,
        setIsCenterOpen,
        soundEnabled,
        toggleSound,
        soundVolume,
        setSoundVolume: updateSoundVolume,
        testSound,
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
