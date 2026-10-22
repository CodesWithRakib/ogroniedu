import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationGateway } from '../src/modules/notifications/notification.gateway';
import { NotificationService } from '../src/modules/notifications/notification.service';
import {
  inspectAndRedactContent,
  normalizeBengaliDigits,
} from '../src/modules/notifications/utils/content-safety.util';

describe('Phase 9: Communication & Real-Time Notifications Verification', () => {
  const studentUserId = '11111111-1111-4111-8111-111111111111';
  const tutorUserId = '22222222-2222-4222-8222-222222222222';
  const strangerUserId = '99999999-9999-4999-8999-999999999999';
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  describe('1. Socket.IO Gateway & Real-Time Notifications (NotificationGateway)', () => {
    let gateway: NotificationGateway;
    let mockNotificationService: any;
    let mockBookingRepo: any;
    let mockGuardianAccess: any;
    let mockServer: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockServer = {
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      mockNotificationService = {
        getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 3 }),
        markAsRead: vi.fn().mockResolvedValue({ readAt: new Date().toISOString(), unreadCount: 2 }),
        markAllAsRead: vi.fn().mockResolvedValue({ unreadCount: 0, count: 3 }),
      };

      mockBookingRepo = {
        findOne: vi.fn(),
      };

      mockGuardianAccess = {
        findActiveGuardianIds: vi.fn().mockResolvedValue([]),
      };

      gateway = new NotificationGateway(
        mockNotificationService,
        undefined,
        mockBookingRepo,
        mockGuardianAccess,
      );
      gateway.server = mockServer;
    });

    it('NEGATIVE TEST: Handshake rejects unauthenticated socket connection', async () => {
      const mockClient: any = {
        id: 'socket-unauth',
        handshake: { auth: {}, headers: {}, query: {} },
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

    it('POSITIVE TEST: Handshake authenticates client, joins user room, and sends unread_count', async () => {
      const mockClient: any = {
        id: 'socket-auth',
        handshake: {
          auth: { token: `mock:${studentUserId}:student` },
          headers: {},
          query: {},
        },
        data: {},
        emit: vi.fn(),
        disconnect: vi.fn(),
        join: vi.fn().mockResolvedValue(undefined),
      };

      await gateway.handleConnection(mockClient);

      expect(mockClient.data.userId).toBe(studentUserId);
      expect(mockClient.join).toHaveBeenCalledWith(`user:${studentUserId}`);
      expect(mockClient.emit).toHaveBeenCalledWith('unread_count', { unreadCount: 3 });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('SUCCESS: sendToUser dispatches notification and unread_count to recipient user room', () => {
      const notification: any = {
        id: 'notif-99',
        userId: studentUserId,
        eventType: 'session.reminder',
        title: 'ক্লাস অনুস্মারক',
        body: 'আপনার পদার্থবিজ্ঞান ক্লাস ২০ মিনিট পর শুরু হবে।',
        category: 'booking',
        isRead: false,
      };

      gateway.sendToUser(studentUserId, notification, 4);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${studentUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
      expect(mockServer.emit).toHaveBeenCalledWith('unread_count', { unreadCount: 4 });
    });

    it('ABAC CHAT: Non-participant user is forbidden from joining booking chat room', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: bookingId,
        studentUserId,
        requesterUserId: studentUserId,
        tutorUserId,
      });

      const client: any = {
        id: 'socket-stranger',
        data: { userId: strangerUserId },
        join: vi.fn(),
      };

      const result = await gateway.handleJoinBookingChat(client, { bookingId });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
      expect(client.join).not.toHaveBeenCalled();
    });

    it('ABAC CHAT: Authorized student successfully joins booking_chat room', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: bookingId,
        studentUserId,
        requesterUserId: studentUserId,
        tutorUserId,
      });

      const client: any = {
        id: 'socket-student',
        data: { userId: studentUserId },
        join: vi.fn().mockResolvedValue(undefined),
      };

      const result = await gateway.handleJoinBookingChat(client, { bookingId });

      expect(result.success).toBe(true);
      expect(client.join).toHaveBeenCalledWith(`booking_chat:${bookingId}`);
    });

    it('REAL-TIME TYPING: Gateway relays chat_typing events to room participants', () => {
      const client: any = {
        data: { userId: tutorUserId },
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
      };

      gateway.handleChatTyping(client, {
        bookingId,
        isTyping: true,
        userName: 'Tutor Rashed',
      });

      expect(client.to).toHaveBeenCalledWith(`booking_chat:${bookingId}`);
      expect(client.emit).toHaveBeenCalledWith('user_typing', {
        bookingId,
        userId: tutorUserId,
        userName: 'Tutor Rashed',
        isTyping: true,
      });
    });

    it('READ RECEIPTS: Gateway broadcasts read receipts to active chat room', () => {
      const now = new Date('2026-10-22T10:30:00Z');
      gateway.broadcastReadReceipt(bookingId, studentUserId, 'msg-101', now);

      expect(mockServer.to).toHaveBeenCalledWith(`booking_chat:${bookingId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('messages_read', {
        bookingId,
        readerUserId: studentUserId,
        messageId: 'msg-101',
        readAt: now.toISOString(),
      });
    });
  });

  describe('2. Chat Content Safety & Anti-Circumvention (inspectAndRedactContent)', () => {
    it('PHONE REDACTION: Detects and redacts standard Bangladeshi phone numbers', () => {
      const text = 'আমার সাথে যোগাযোগ করুন 01712345678 এই নম্বরে।';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('PHONE_NUMBER');
      expect(result.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
      expect(result.sanitizedContent).not.toContain('01712345678');
    });

    it('PHONE REDACTION: Detects and redacts Bengali numerals phone numbers', () => {
      const text = 'কল করুন ০১৭১২৩৪৫৬৭৮';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('PHONE_NUMBER');
      expect(result.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
    });

    it('PHONE REDACTION: Detects interspersed spaced and formatted phone numbers', () => {
      const text = 'Phone: +880 1812 - 345 678 call me';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('PHONE_NUMBER');
      expect(result.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');
    });

    it('PAYMENT REDACTION: Redacts off-platform bKash/Nagad solicitations & cash handovers', () => {
      const text = 'টিউশন ফি বিকাশ পার্সোনাল নম্বরে সেন্ড মানি করুন।';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(result.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');
    });

    it('PAYMENT REDACTION: Redacts cash in hand solicitations', () => {
      const text = 'অনলাইনে পেমেন্ট লাগবে না, হাতে হাতে টাকা দিয়ে দিবেন।';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(result.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');
    });

    it('SOCIAL BYPASS REDACTION: Redacts external social media links (WhatsApp, Telegram)', () => {
      const text = 'Join our WhatsApp group wa.me/8801700000000 or chat.whatsapp.com/invitation';
      const result = inspectAndRedactContent(text);

      expect(result.isRedacted).toBe(true);
      expect(result.violationCodes).toContain('EXTERNAL_LINK');
      expect(result.sanitizedContent).toContain('[REDACTED EXTERNAL LINK]');
    });

    it('PRESERVATION: Safely preserves valid academic conversation without false positives', () => {
      const safeMessage =
        'আগামীকাল বিকাল ৪টায় আমাদের পদার্থবিজ্ঞান ক্লাস শুরু হবে। অধ্যায় ৫ এর গতিসূত্র প্রস্তুত রাখবে।';
      const result = inspectAndRedactContent(safeMessage);

      expect(result.isRedacted).toBe(false);
      expect(result.violationCodes).toHaveLength(0);
      expect(result.sanitizedContent).toBe(safeMessage);
      expect(result.redactionReason).toBeNull();
    });
  });

  describe('3. Bengali Digits Normalization (normalizeBengaliDigits)', () => {
    it('correctly maps all Bengali numerals ০-৯ to ASCII 0-9', () => {
      expect(normalizeBengaliDigits('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
      expect(normalizeBengaliDigits('ক্লাস ১০ রোল ১৫')).toBe('ক্লাস 10 রোল 15');
    });
  });
});
