import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingMessagesService } from '../src/modules/notifications/booking-messages.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

interface SeedMessage {
  id: string;
  bookingId: string;
  senderUserId: string;
  recipientUserId: string;
  content: string;
  createdAt: Date;
}

describe('BookingMessagesService ABAC & Content Safety Tests (Phase 12)', () => {
  let service: BookingMessagesService;
  let mockMessageRepo: any;
  let mockBookingRepo: any;
  let mockGuardianLinkRepo: any;
  let mockOutboxRepo: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const bookingId = '00000000-0000-4000-8000-000000000001';
  const studentId = '00000000-0000-4000-8000-000000000002';
  const requesterId = '00000000-0000-4000-8000-000000000003';
  const tutorUserId = '00000000-0000-4000-8000-000000000004';
  const attackerUserId = '00000000-0000-4000-8000-000000000099';

  const studentUser: AuthenticatedUser = {
    id: studentId,
    email: 'student@example.com',
    roles: ['student'],
  };

  const tutorUser: AuthenticatedUser = {
    id: tutorUserId,
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const attackerUser: AuthenticatedUser = {
    id: attackerUserId,
    email: 'attacker@example.com',
    roles: ['student'],
  };

  const sampleBooking: any = {
    id: bookingId,
    studentUserId: studentId,
    requesterUserId: requesterId,
    tutorUserId: tutorUserId,
    studentUser: { id: studentId, displayName: 'Rahim' },
    requesterUser: { id: requesterId, displayName: 'Rahim Father' },
    tutor: {
      id: 'tutor-prof-1',
      userId: tutorUserId,
      user: { id: tutorUserId, displayName: 'Sir Karim' },
    },
    status: 'confirmed',
  };

  const BASE_TIME = new Date('2026-01-01T00:00:00.000Z').getTime();

  function seedMessages(count: number): SeedMessage[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg-${String(i + 1).padStart(2, '0')}`,
      bookingId,
      senderUserId: i % 2 === 0 ? studentId : tutorUserId,
      recipientUserId: i % 2 === 0 ? tutorUserId : studentId,
      content: `message-${i + 1}`,
      createdAt: new Date(BASE_TIME + (i + 1) * 1000),
    }));
  }

  /**
   * In-memory emulation of the service's TypeORM query-builder chain:
   * booking filter → optional strictly-older cursor predicate →
   * (created_at DESC, id DESC) → take. Mirrors the SQL semantics so cursor
   * paging behavior is verified end-to-end through the service.
   */
  function installMessageSeed(seed: SeedMessage[]): any {
    let cursorTime: string | undefined;
    let cursorId: string | undefined;
    let takeCount: number | undefined;
    const qb: any = {
      leftJoinAndSelect: vi.fn(() => qb),
      where: vi.fn(() => qb),
      andWhere: vi.fn((_sql: string, params: { cursorTime: string; cursorId: string }) => {
        cursorTime = params.cursorTime;
        cursorId = params.cursorId;
        return qb;
      }),
      orderBy: vi.fn(() => qb),
      addOrderBy: vi.fn(() => qb),
      take: vi.fn((n: number) => {
        takeCount = n;
        return qb;
      }),
      getMany: vi.fn(() => {
        const sorted = [...seed].sort((a, b) => {
          const dt = b.createdAt.getTime() - a.createdAt.getTime();
          if (dt !== 0) return dt;
          if (a.id === b.id) return 0;
          return a.id < b.id ? 1 : -1;
        });
        let rows = sorted;
        if (cursorTime !== undefined && cursorId !== undefined) {
          const ct = Date.parse(cursorTime);
          const cid: string = cursorId;
          rows = rows.filter((m) => {
            const t = m.createdAt.getTime();
            return t < ct || (t === ct && m.id < cid);
          });
        }
        return Promise.resolve(rows.slice(0, takeCount ?? rows.length));
      }),
    };
    mockMessageRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  beforeEach(() => {
    mockMessageRepo = {
      create: vi.fn((data) => ({ id: 'msg-1', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'msg-1', ...entity })),
      createQueryBuilder: vi.fn(),
      findOne: vi.fn(),
    };

    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue(sampleBooking),
    };

    mockGuardianLinkRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: 'out-1', ...entity })),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new BookingMessagesService(
      mockMessageRepo,
      mockBookingRepo,
      new GuardianAccessService(mockGuardianLinkRepo),
      mockOutboxRepo,
      mockAuditService,
      mockNotificationService,
    );
  });

  describe('ABAC Participant Scoping', () => {
    it('should allow student to send message to tutor in confirmed booking', async () => {
      const msg = await service.sendMessage(studentUser, bookingId, {
        content: 'Hello Sir, when should we start the mechanics chapter?',
      });

      expect(msg).toBeDefined();
      expect(msg.senderUserId).toBe(studentId);
      expect(msg.recipientUserId).toBe(tutorUserId);
      expect(msg.isRedacted).toBe(false);
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tutorUserId,
          recipientRole: 'tutor',
        }),
      );
    });

    it('should allow tutor to reply to student', async () => {
      const msg = await service.sendMessage(tutorUser, bookingId, {
        content: 'We will begin with vectors and Newton laws tomorrow at 4 PM.',
      });

      expect(msg).toBeDefined();
      expect(msg.senderUserId).toBe(tutorUserId);
      expect(msg.recipientUserId).toBe(studentId);
    });

    it('NEGATIVE TEST: should reject message sending by unrelated user (403 Forbidden)', async () => {
      await expect(
        service.sendMessage(attackerUser, bookingId, { content: 'Phishing message' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockMessageRepo.save).not.toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should reject reading messages by unrelated user (403 Forbidden)', async () => {
      await expect(service.getMessages(attackerUser, bookingId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Content Safety & Contact Redaction Filter', () => {
    it('SAFETY FILTER: should redact Bangladeshi phone number and log safety audit', async () => {
      const msg = await service.sendMessage(studentUser, bookingId, {
        content: 'Call me on my personal phone 01712345678 for quick updates.',
      });

      expect(msg.isRedacted).toBe(true);
      expect(msg.content).toContain('[REDACTED CONTACT NUMBER]');
      expect(msg.content).not.toContain('01712345678');
      expect(msg.redactionReason).toContain('Direct phone number sharing restricted');

      // Audit log recorded
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'message.safety_redacted',
          resourceType: 'booking_messages',
        }),
      );
    });

    it('SAFETY FILTER: should redact off-platform payment solicitations', async () => {
      const msg = await service.sendMessage(tutorUser, bookingId, {
        content: 'Please send fee to my bkash personal account directly.',
      });

      expect(msg.isRedacted).toBe(true);
      expect(msg.content).toContain('[REDACTED PAYMENT SOLICITATION]');
      expect(msg.content).not.toContain('bkash personal');
    });

    it('SAFETY FILTER: should redact external links', async () => {
      const msg = await service.sendMessage(studentUser, bookingId, {
        content: 'Join via external meeting https://external-zoom-link.com/room',
      });

      expect(msg.isRedacted).toBe(true);
      expect(msg.content).toContain('[REDACTED EXTERNAL LINK]');
    });
  });

  describe('Read State Management', () => {
    it('should mark message as read by recipient', async () => {
      const existingMsg: any = {
        id: 'msg-10',
        recipientUserId: studentId,
        readAt: null,
      };
      mockMessageRepo.findOne.mockResolvedValue(existingMsg);

      const updated = await service.markAsRead(studentUser, 'msg-10');
      expect(updated.readAt).toBeInstanceOf(Date);
      expect(mockMessageRepo.save).toHaveBeenCalledWith(existingMsg);
    });

    it('NEGATIVE TEST: should prevent non-recipient from marking message as read (403 Forbidden)', async () => {
      const existingMsg: any = {
        id: 'msg-10',
        recipientUserId: studentId,
        readAt: null,
      };
      mockMessageRepo.findOne.mockResolvedValue(existingMsg);

      await expect(service.markAsRead(attackerUser, 'msg-10')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cursor Pagination for Chat History (C-3)', () => {
    it('first page returns the latest N messages ASC with nextCursor when older exist', async () => {
      const qb = installMessageSeed(seedMessages(5));

      const res = await service.getMessages(studentUser, bookingId, { pageSize: 2 });

      expect(res.success).toBe(true);
      expect(res.data.map((m) => m.content)).toEqual(['message-4', 'message-5']);
      expect(res.meta.pagination.strategy).toBe('cursor');
      expect(res.meta.pagination.pageSize).toBe(2);
      expect(res.meta.pagination.hasNextPage).toBe(true);
      expect(res.meta.pagination.previousCursor).toBeNull();
      expect(typeof res.meta.pagination.nextCursor).toBe('string');
      // Bound parameters, never interpolated SQL.
      expect(qb.where).toHaveBeenCalledWith(expect.stringContaining(':bookingId'), {
        bookingId,
      });
      expect(qb.take).toHaveBeenCalledWith(3);
    });

    it('second page via cursor returns older messages with no overlap, deterministically', async () => {
      installMessageSeed(seedMessages(5));

      const first = await service.getMessages(studentUser, bookingId, { pageSize: 2 });
      const cursor = first.meta.pagination.nextCursor as string;
      expect(typeof cursor).toBe('string');

      const second = await service.getMessages(studentUser, bookingId, { pageSize: 2, cursor });
      expect(second.data.map((m) => m.content)).toEqual(['message-2', 'message-3']);
      expect(second.meta.pagination.hasNextPage).toBe(true);

      const firstIds = first.data.map((m) => m.id);
      const secondIds = second.data.map((m) => m.id);
      expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);

      // Deterministic: the same cursor yields the same page.
      const repeat = await service.getMessages(studentUser, bookingId, { pageSize: 2, cursor });
      expect(repeat.data.map((m) => m.id)).toEqual(secondIds);

      // Final page exhausts history: no older remain.
      const third = await service.getMessages(studentUser, bookingId, {
        pageSize: 2,
        cursor: second.meta.pagination.nextCursor as string,
      });
      expect(third.data.map((m) => m.content)).toEqual(['message-1']);
      expect(third.meta.pagination.hasNextPage).toBe(false);
      expect(third.meta.pagination.nextCursor).toBeNull();
    });

    it('no cursor returns the latest pageSize messages (default 50) ASC', async () => {
      installMessageSeed(seedMessages(3));

      const res = await service.getMessages(studentUser, bookingId);

      expect(res.data.map((m) => m.content)).toEqual(['message-1', 'message-2', 'message-3']);
      expect(res.meta.pagination.hasNextPage).toBe(false);
      expect(res.meta.pagination.nextCursor).toBeNull();
      expect(res.meta.pagination.pageSize).toBe(50);
    });

    it('INVALID_CURSOR: malformed cursor yields 400 INVALID_CURSOR before querying', async () => {
      installMessageSeed(seedMessages(3));

      const outcome: unknown = await service
        .getMessages(studentUser, bookingId, { cursor: '!!!not-a-cursor!!!' })
        .then(
          () => 'no-throw',
          (err: unknown) => err,
        );

      expect(outcome).toBeInstanceOf(BadRequestException);
      expect((outcome as BadRequestException).getStatus()).toBe(400);
      const response = (outcome as BadRequestException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe('INVALID_CURSOR');
      expect(mockMessageRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('ABAC: tutor resolved via tutorProfile relation fallback (unknown narrowing)', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: bookingId,
        studentUserId: studentId,
        requesterUserId: requesterId,
        tutorUserId: null,
        tutorProfile: { userId: tutorUserId },
      });
      installMessageSeed(seedMessages(2));

      const res = await service.getMessages(tutorUser, bookingId, {});
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
    });

    it('NEGATIVE TEST: unknown booking still yields 404', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);
      await expect(service.getMessages(studentUser, bookingId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
