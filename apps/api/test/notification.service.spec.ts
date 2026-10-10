import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../src/modules/notifications/notification.service';
import { NotificationGateway } from '../src/modules/notifications/notification.gateway';
import { NOTIFICATION_REGISTRY, interpolateTemplate } from '@ogroniedu/contracts';

describe('NotificationService & Registry Unit Tests', () => {
  let service: NotificationService;
  let mockGateway: Partial<NotificationGateway>;

  beforeEach(() => {
    mockGateway = {
      sendToUser: vi.fn(),
      broadcastUnreadCount: vi.fn(),
    };

    service = new NotificationService(null as any, null as any, mockGateway as any);
  });

  describe('Notification Registry Validation', () => {
    it('should have all required fields defined for every notification type', () => {
      for (const [key, def] of Object.entries(NOTIFICATION_REGISTRY)) {
        expect(def.type).toBe(key);
        expect(def.category).toBeDefined();
        expect(def.priority).toBeDefined();
        expect(def.allowedRoles.length).toBeGreaterThan(0);
        expect(def.templateEn.title).toBeDefined();
        expect(def.templateBn.title).toBeDefined();
        expect(def.titleKey).toBeDefined();
        expect(def.bodyKey).toBeDefined();
        expect(def.persist).toBe(true);
      }
    });

    it('should correctly interpolate templates with dynamic variables', () => {
      const template = 'Hello {{name}}, booking {{bookingId}} is confirmed for BDT {{amount}}.';
      const result = interpolateTemplate(template, {
        name: 'Rahim',
        bookingId: 'BK-1234',
        amount: 1500,
      });
      expect(result).toBe('Hello Rahim, booking BK-1234 is confirmed for BDT 1500.');
    });
  });

  describe('Recipient Authorization & Dispatching', () => {
    const studentId = '11111111-1111-1111-1111-111111111111';
    const tutorId = '22222222-2222-2222-2222-222222222222';

    it('should successfully dispatch booking.requested notification to eligible tutor', async () => {
      const result = await service.dispatch({
        userId: tutorId,
        eventType: 'booking.requested',
        recipientRole: 'tutor',
        payload: {
          bookingId: 'b-001',
          subjectName: 'Physics (HSC)',
          requesterName: 'Tanvir Hossain',
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(tutorId);
      expect(result.eventType).toBe('booking.requested');
      expect(result.title).toContain('নতুন বুকিং অনুরোধ');
      expect(result.body).toContain('Tanvir Hossain');
      expect(result.isRead).toBe(false);

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        tutorId,
        expect.objectContaining({ eventType: 'booking.requested' }),
        1,
      );
    });

    it('NEGATIVE TEST: should reject dispatch if recipient role is not eligible', async () => {
      // 'booking.requested' is strictly intended for tutors, NOT students
      await expect(
        service.dispatch({
          userId: studentId,
          eventType: 'booking.requested',
          recipientRole: 'student', // Ineligible role
          payload: {
            bookingId: 'b-002',
            subjectName: 'Chemistry',
            requesterName: 'Someone',
          },
        }),
      ).rejects.toThrow(/not eligible to receive notification type/);
    });

    it('should correctly calculate unread count and mark notifications as read', async () => {
      // Dispatch two notifications to tutor
      const item1 = await service.dispatch({
        userId: tutorId,
        eventType: 'booking.requested',
        recipientRole: 'tutor',
        payload: { bookingId: 'b-1', subjectName: 'Math', requesterName: 'User 1' },
      });

      await service.dispatch({
        userId: tutorId,
        eventType: 'tutor.verified',
        recipientRole: 'tutor',
        payload: {},
      });

      const countBefore = await service.getUnreadCount(tutorId);
      expect(countBefore.unreadCount).toBe(2);

      // Mark first notification as read
      const markResult = await service.markAsRead(tutorId, item1.id);
      expect(markResult.id).toBe(item1.id);
      expect(markResult.unreadCount).toBe(1);

      const countAfter = await service.getUnreadCount(tutorId);
      expect(countAfter.unreadCount).toBe(1);

      // Mark all as read
      const markAllResult = await service.markAllAsRead(tutorId);
      expect(markAllResult.unreadCount).toBe(0);

      const finalCount = await service.getUnreadCount(tutorId);
      expect(finalCount.unreadCount).toBe(0);
    });

    it('NEGATIVE TEST: should throw 404 when marking a non-existent notification as read', async () => {
      await expect(
        service.markAsRead(tutorId, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(/not found/);
    });
  });
});
