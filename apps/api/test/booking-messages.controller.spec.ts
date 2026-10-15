import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingMessagesController } from '../src/modules/notifications/booking-messages.controller';
import { BookingMessagesService } from '../src/modules/notifications/booking-messages.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('BookingMessagesController Unit Tests', () => {
  let controller: BookingMessagesController;
  let mockService: {
    sendMessage: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    roles: ['student'],
    email: 'student@example.com',
  };

  const bookingId = 'book-uuid-123';

  beforeEach(() => {
    mockService = {
      sendMessage: vi.fn().mockResolvedValue({
        id: 'msg-1',
        bookingId,
        content: 'Hello!',
        isRedacted: false,
      }),
      getMessages: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'msg-1', content: 'Hello!' }],
        meta: {
          pagination: {
            strategy: 'cursor',
            nextCursor: null,
            previousCursor: null,
            hasNextPage: false,
            pageSize: 50,
          },
        },
      }),
      markAsRead: vi.fn().mockResolvedValue({
        id: 'msg-1',
        readAt: new Date(),
      }),
    };

    controller = new BookingMessagesController(mockService as unknown as BookingMessagesService);
  });

  it('should call sendMessage on service and return enveloped message entity', async () => {
    const res = await controller.sendMessage(mockUser, bookingId, { content: 'Hello!' }, 'req-1');

    expect(mockService.sendMessage).toHaveBeenCalledWith(
      mockUser,
      bookingId,
      { content: 'Hello!' },
      'req-1',
    );
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('msg-1');
  });

  it('should call getMessages on service with the cursor query', async () => {
    const query = { pageSize: 10 };
    const res = await controller.getMessages(mockUser, bookingId, query);

    expect(mockService.getMessages).toHaveBeenCalledWith(mockUser, bookingId, query);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.meta.pagination.strategy).toBe('cursor');
  });

  it('should call markAsRead on service and return enveloped message', async () => {
    const res = await controller.markAsRead(mockUser, 'msg-1');

    expect(mockService.markAsRead).toHaveBeenCalledWith(mockUser, 'msg-1');
    expect(res.success).toBe(true);
    expect(res.data.readAt).toBeDefined();
  });
});
