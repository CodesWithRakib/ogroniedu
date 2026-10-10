import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationService } from '../src/modules/notifications/notification.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('Notification Authorization & Cross-User Security Tests', () => {
  let service: NotificationService;
  let authGuard: AuthGuard;

  const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    service = new NotificationService(
      null as any,
      null as any,
      {
        sendToUser: () => {},
        broadcastUnreadCount: () => {},
      } as any,
    );
    authGuard = new AuthGuard();
  });

  describe('AuthGuard Negative Tests', () => {
    it('should throw UnauthorizedException when no auth header or x-user-id is supplied', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => authGuard.canActivate(mockContext)).toThrow(UnauthorizedException);
    });

    it('should accept valid simulated mock bearer token', () => {
      const mockReq: any = {
        headers: {
          authorization: `Bearer mock:${userA}:guardian`,
        },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      } as unknown as ExecutionContext;

      const result = authGuard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(userA);
      expect(mockReq.user.roles).toContain('guardian');
    });
  });

  describe('Cross-User Data Isolation Negative Tests', () => {
    it('NEGATIVE TEST: User B cannot mark User A notification as read', async () => {
      // 1. Dispatch notification to User A
      const notifA = await service.dispatch({
        userId: userA,
        eventType: 'payment.succeeded',
        recipientRole: 'guardian',
        payload: { bookingId: 'bk-100', amount: 2000, paymentId: 'pay-01' },
      });

      expect(notifA.userId).toBe(userA);

      // 2. User B attempts to mark User A's notification as read
      await expect(service.markAsRead(userB, notifA.id)).rejects.toThrow(/not found/);

      // 3. Verify notification is still unread for User A
      const unreadCountA = await service.getUnreadCount(userA);
      expect(unreadCountA.unreadCount).toBe(1);

      // 4. Verify User B unread count is 0
      const unreadCountB = await service.getUnreadCount(userB);
      expect(unreadCountB.unreadCount).toBe(0);
    });

    it('NEGATIVE TEST: User B cannot see User A notifications in list query', async () => {
      // Dispatch 3 notifications to User A
      await service.dispatch({
        userId: userA,
        eventType: 'system.announcement',
        recipientRole: 'guardian',
        payload: { messageBn: 'টেস্ট নোটিশ ১', messageEn: 'Test Notice 1' },
      });
      await service.dispatch({
        userId: userA,
        eventType: 'system.announcement',
        recipientRole: 'guardian',
        payload: { messageBn: 'টেস্ট নোটিশ ২', messageEn: 'Test Notice 2' },
      });

      // Query notifications as User B
      const listB = await service.getNotifications(userB, {
        unreadOnly: false,
        limit: 10,
        page: 1,
        locale: 'bn',
      });

      expect(listB.items.length).toBe(0);
      expect(listB.total).toBe(0);

      // Query notifications as User A
      const listA = await service.getNotifications(userA, {
        unreadOnly: false,
        limit: 10,
        page: 1,
        locale: 'bn',
      });

      // User A sees their own notifications
      expect(listA.total).toBeGreaterThanOrEqual(2);
      expect(listA.items.every((item) => item.userId === userA)).toBe(true);
    });
  });
});
