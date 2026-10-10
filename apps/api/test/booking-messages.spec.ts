import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingMessagesService } from '../src/modules/notifications/booking-messages.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

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

  beforeEach(() => {
    mockMessageRepo = {
      create: vi.fn((data) => ({ id: 'msg-1', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'msg-1', ...entity })),
      find: vi.fn().mockResolvedValue([]),
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
      mockGuardianLinkRepo,
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
});
