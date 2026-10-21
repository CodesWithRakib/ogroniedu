import type { NotificationItemDto } from '@ogroniedu/contracts';

export const NOTIFICATION_BROADCASTER = 'NOTIFICATION_BROADCASTER';

export interface INotificationBroadcaster {
  sendToUser(userId: string, notification: NotificationItemDto, unreadCount: number): void;
  broadcastUnreadCount?(userId: string, unreadCount: number): void;
}
