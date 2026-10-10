import { z } from 'zod';
import {
  NotificationCategories,
  NotificationCategory,
  NotificationDeliveryChannels,
  NotificationDeliveryChannel,
  NotificationEventType,
  NotificationEventTypes,
  NotificationPriorities,
  NotificationPriority,
  NotificationRole,
  NotificationRoles,
} from './notification-types';

export const DispatchNotificationSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum(NotificationEventTypes),
  recipientRole: z.enum(NotificationRoles),
  payload: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  idempotencyKey: z.string().optional(),
});
export type DispatchNotificationDto = z.infer<typeof DispatchNotificationSchema>;

export const GetNotificationsQuerySchema = z.object({
  unreadOnly: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
  limit: z
    .preprocess((val) => Number(val), z.number().int().min(1).max(100))
    .optional()
    .default(20),
  page: z
    .preprocess((val) => Number(val), z.number().int().min(1))
    .optional()
    .default(1),
  locale: z.enum(['bn', 'en']).optional().default('bn'),
});
export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;

export interface NotificationItemDto {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  titleKey: string;
  bodyKey: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  navigationTarget: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponseDto {
  items: NotificationItemDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface UnreadCountResponseDto {
  unreadCount: number;
}

export interface MarkAsReadResponseDto {
  id: string;
  readAt: string;
  unreadCount: number;
}

export interface MarkAllAsReadResponseDto {
  markedCount: number;
  unreadCount: number;
}

// WebSocket Event Interfaces
export interface ServerToClientEvents {
  notification: (notification: NotificationItemDto) => void;
  unread_count: (data: UnreadCountResponseDto) => void;
  notification_read: (data: { id: string; readAt: string; unreadCount: number }) => void;
  notifications_all_read: (data: { unreadCount: 0 }) => void;
  auth_error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  mark_as_read: (data: { id: string }) => void;
  mark_all_as_read: () => void;
  get_unread_count: () => void;
}
