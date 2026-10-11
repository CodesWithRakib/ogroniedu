import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { NotificationService } from '../src/modules/notifications/notification.service';
import { NotificationGateway } from '../src/modules/notifications/notification.gateway';
import { NOTIFICATION_REGISTRY, interpolateTemplate } from '@ogroniedu/contracts';
import { encodeCursor } from '../src/common/pagination/pagination';

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

  describe('Cursor Pagination for Notifications Feed (C-3)', () => {
    const cursorUserId = '33333333-3333-4333-a333-333333333333';
    const BASE = new Date('2026-02-01T00:00:00.000Z').getTime();

    interface MemoryRow {
      id: string;
      userId: string;
      createdAt: Date;
      readAt: Date | null;
    }

    function memoryRows(): MemoryRow[] {
      return (service as unknown as { memoryNotifications: MemoryRow[] }).memoryNotifications;
    }

    /** Dispatch `count` notifications, then stagger timestamps oldest→newest. Returns ids oldest→newest. */
    async function seedNotifications(count: number): Promise<string[]> {
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const item = await service.dispatch({
          userId: cursorUserId,
          eventType: 'tutor.verified',
          recipientRole: 'tutor',
          payload: {},
        });
        ids.push(item.id);
      }
      memoryRows()
        .filter((n) => n.userId === cursorUserId)
        .forEach((n, i) => {
          n.createdAt = new Date(BASE + (i + 1) * 1000);
        });
      return ids;
    }

    /** Opaque edge cursor for the nth-oldest seeded notification (0-based). */
    function edgeCursor(indexFromOldest: number): string {
      const owned = memoryRows()
        .filter((n) => n.userId === cursorUserId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const edge = owned[indexFromOldest];
      if (!edge) throw new Error('seed edge out of range');
      return encodeCursor({ t: edge.createdAt.toISOString(), id: edge.id });
    }

    it('legacy mode (no cursor) keeps offset fields and adds the canonical envelope', async () => {
      await seedNotifications(3);

      const res = await service.getNotifications(cursorUserId, {
        unreadOnly: false,
        limit: 20,
        page: 1,
        locale: 'bn',
      });

      expect(res.items).toHaveLength(3);
      expect(res.total).toBe(3);
      expect(res.unreadCount).toBe(3);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalPages).toBe(1);
      expect(res.hasNextPage).toBe(false);
      expect(res.success).toBe(true);
      expect(res.data).toEqual(res.items);
      expect(res.meta.pagination).toEqual({
        strategy: 'offset',
        page: 1,
        pageSize: 20,
        totalItems: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('cursor mode omits totalPages but keeps an accurate total', async () => {
      const ids = await seedNotifications(5);

      const res = await service.getNotifications(cursorUserId, {
        unreadOnly: false,
        limit: 20,
        page: 1,
        locale: 'bn',
        cursor: edgeCursor(4),
        pageSize: 2,
      });

      // Strictly older than the newest (s5): latest two are s4, s3, newest-first.
      expect(res.items.map((i) => i.id)).toEqual([ids[3], ids[2]]);
      expect(res.total).toBe(5);
      expect(res.unreadCount).toBe(5);
      expect('totalPages' in res).toBe(false);
      expect(res.page).toBeUndefined();
      expect(res.limit).toBeUndefined();
      expect(res.totalPages).toBeUndefined();
      expect(res.hasNextPage).toBe(true);
      expect(res.success).toBe(true);
      expect(res.data).toEqual(res.items);
      expect(res.meta.pagination.strategy).toBe('cursor');
      if (res.meta.pagination.strategy === 'cursor') {
        expect(res.meta.pagination.pageSize).toBe(2);
        expect(res.meta.pagination.previousCursor).toBeNull();
        expect(typeof res.meta.pagination.nextCursor).toBe('string');
      }
    });

    it('cursor paging returns older messages with no overlap, deterministically', async () => {
      const ids = await seedNotifications(5);

      const first = await service.getNotifications(cursorUserId, {
        unreadOnly: false,
        limit: 20,
        page: 1,
        locale: 'bn',
        cursor: edgeCursor(4),
        pageSize: 2,
      });
      expect(first.items.map((i) => i.id)).toEqual([ids[3], ids[2]]);

      const cursor = (first.meta.pagination as { nextCursor: string }).nextCursor;
      const second = await service.getNotifications(cursorUserId, {
        unreadOnly: false,
        limit: 20,
        page: 1,
        locale: 'bn',
        cursor,
        pageSize: 2,
      });
      expect(second.items.map((i) => i.id)).toEqual([ids[1], ids[0]]);
      expect(second.total).toBe(5);
      expect('totalPages' in second).toBe(false);

      const firstIds = first.items.map((i) => i.id);
      expect(second.items.some((i) => firstIds.includes(i.id))).toBe(false);

      // Deterministic: the same cursor yields the same page.
      const repeat = await service.getNotifications(cursorUserId, {
        unreadOnly: false,
        limit: 20,
        page: 1,
        locale: 'bn',
        cursor,
        pageSize: 2,
      });
      expect(repeat.items.map((i) => i.id)).toEqual([ids[1], ids[0]]);

      // Exhausted history: no older remain.
      expect(second.meta.pagination.hasNextPage).toBe(false);
      expect((second.meta.pagination as { nextCursor: string | null }).nextCursor).toBeNull();
    });

    it('INVALID_CURSOR: malformed cursor yields 400 INVALID_CURSOR', async () => {
      await seedNotifications(2);

      const outcome: unknown = await service
        .getNotifications(cursorUserId, {
          unreadOnly: false,
          limit: 20,
          page: 1,
          locale: 'bn',
          cursor: '!!!not-a-cursor!!!',
          pageSize: 2,
        })
        .then(
          () => 'no-throw',
          (err: unknown) => err,
        );

      expect(outcome).toBeInstanceOf(BadRequestException);
      expect((outcome as BadRequestException).getStatus()).toBe(400);
      const response = (outcome as BadRequestException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe('INVALID_CURSOR');
    });

    it('unreadOnly filter applies before cursor pagination with an accurate total', async () => {
      const ids = await seedNotifications(4);
      const owned = memoryRows().filter((n) => n.userId === cursorUserId);
      const newest = owned[owned.length - 1];
      if (!newest) throw new Error('seed missing');
      newest.readAt = new Date();

      const res = await service.getNotifications(cursorUserId, {
        unreadOnly: true,
        limit: 20,
        page: 1,
        locale: 'bn',
        cursor: edgeCursor(3),
        pageSize: 10,
      });

      expect(res.total).toBe(3);
      expect(res.unreadCount).toBe(3);
      expect(res.items.map((i) => i.id)).toEqual([ids[2], ids[1], ids[0]]);
      expect('totalPages' in res).toBe(false);
    });
  });
});
