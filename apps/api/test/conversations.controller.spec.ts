import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationsController } from '../src/modules/notifications/conversations.controller';
import { BookingMessagesService } from '../src/modules/notifications/booking-messages.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('ConversationsController Unit Tests (Phase 08)', () => {
  let controller: ConversationsController;
  let mockService: {
    getConversationsInbox: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    markAllInBookingAsRead: ReturnType<typeof vi.fn>;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    roles: ['student'],
    email: 'student@example.com',
  };

  const bookingId = 'book-uuid-123';

  beforeEach(() => {
    mockService = {
      getConversationsInbox: vi.fn().mockResolvedValue([
        {
          bookingId,
          subjectName: 'Higher Mathematics',
          status: 'confirmed',
          partnerUser: {
            id: 'tutor-uuid-1',
            displayName: 'Sir Rahman',
            role: 'tutor',
          },
          lastMessage: {
            id: 'msg-1',
            content: 'Please review integration formulas',
            isRedacted: false,
            createdAt: '2026-10-20T12:00:00Z',
            isMine: false,
          },
          unreadCount: 1,
          updatedAt: '2026-10-20T12:00:00Z',
        },
      ]),
      sendMessage: vi.fn().mockResolvedValue({
        id: 'msg-2',
        bookingId,
        content: 'I have completed the practice problems',
        isRedacted: false,
      }),
      markAllInBookingAsRead: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    };

    controller = new ConversationsController(mockService as unknown as BookingMessagesService);
  });

  it('should call getConversationsInbox and return wrapped envelope', async () => {
    const res = await controller.getInbox(mockUser);
    expect(mockService.getConversationsInbox).toHaveBeenCalledWith(mockUser);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].subjectName).toBe('Higher Mathematics');
    expect(res.data[0].unreadCount).toBe(1);
  });

  it('should call sendMessage on conversation thread', async () => {
    const res = await controller.sendMessage(mockUser, bookingId, {
      content: 'I have completed the practice problems',
    });
    expect(mockService.sendMessage).toHaveBeenCalledWith(
      mockUser,
      bookingId,
      { content: 'I have completed the practice problems' },
      undefined,
    );
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('msg-2');
  });

  it('should call markAllInBookingAsRead on conversation thread', async () => {
    const res = await controller.markAllAsRead(mockUser, bookingId);
    expect(mockService.markAllInBookingAsRead).toHaveBeenCalledWith(mockUser, bookingId);
    expect(res.success).toBe(true);
    expect(res.data.updatedCount).toBe(1);
  });
});
