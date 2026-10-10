import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationGateway } from '../src/modules/notifications/notification.gateway';
import { NotificationService } from '../src/modules/notifications/notification.service';

describe('NotificationGateway & Real-Time Socket Tests', () => {
  let gateway: NotificationGateway;
  let service: NotificationService;
  let mockServer: any;

  const testUserId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    service = new NotificationService(null as any, null as any, null as any);
    gateway = new NotificationGateway(service);
    gateway.server = mockServer;
  });

  describe('Socket Handshake Authentication', () => {
    it('NEGATIVE TEST: should reject and disconnect socket missing authentication credentials', async () => {
      const mockClient: any = {
        id: 'socket-unauth-1',
        handshake: {
          auth: {},
          headers: {},
          query: {},
        },
        emit: vi.fn(),
        disconnect: vi.fn(),
        join: vi.fn(),
      };

      await gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Authentication required',
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should authenticate socket with valid token, join user room, and emit unread_count', async () => {
      const mockClient: any = {
        id: 'socket-auth-1',
        handshake: {
          auth: {
            token: `mock:${testUserId}:guardian`,
          },
          headers: {},
          query: {},
        },
        data: {},
        emit: vi.fn(),
        disconnect: vi.fn(),
        join: vi.fn().mockResolvedValue(undefined),
      };

      await gateway.handleConnection(mockClient);

      expect(mockClient.data.userId).toBe(testUserId);
      expect(mockClient.join).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('unread_count', { unreadCount: 0 });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Real-Time Event Delivery to Rooms', () => {
    it('should emit notification and updated unread count to specific user room', () => {
      const mockNotificationItem: any = {
        id: 'notif-123',
        userId: testUserId,
        eventType: 'session.reminder',
        title: 'Session Reminder',
        body: 'Class starts in 30 minutes',
        category: 'booking',
        priority: 'normal',
        isRead: false,
      };

      gateway.sendToUser(testUserId, mockNotificationItem, 1);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', mockNotificationItem);
      expect(mockServer.emit).toHaveBeenCalledWith('unread_count', { unreadCount: 1 });
    });
  });

  describe('Client-Initiated Socket Actions', () => {
    it('should handle mark_as_read message and broadcast notification_read event', async () => {
      // 1. First dispatch a real notification to populate store
      const notif = await service.dispatch({
        userId: testUserId,
        eventType: 'tutor.verified',
        recipientRole: 'tutor',
        payload: {},
      });

      const mockClient: any = {
        id: 'client-1',
        data: { userId: testUserId },
      };

      await gateway.handleMarkAsRead(mockClient, { id: notif.id });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification_read',
        expect.objectContaining({ id: notif.id, unreadCount: 0 }),
      );
    });

    it('should handle mark_all_as_read and broadcast zero unread count', async () => {
      const mockClient: any = {
        id: 'client-1',
        data: { userId: testUserId },
      };

      await gateway.handleMarkAllAsRead(mockClient);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notifications_all_read', {
        unreadCount: 0,
      });
    });
  });
});
