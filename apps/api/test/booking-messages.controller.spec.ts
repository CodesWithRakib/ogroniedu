import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingMessagesController } from '../src/modules/notifications/booking-messages.controller';
import { BookingMessagesService } from '../src/modules/notifications/booking-messages.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('BookingMessagesController Unit Tests', () => {
  let controller: BookingMessagesController;
  let mockService: any;

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
      getMessages: vi.fn().mockResolvedValue([
        { id: 'msg-1', content: 'Hello!' },
      ]),
      markAsRead: vi.fn().mockResolvedValue({
        id: 'msg-1',
        readAt: new Date(),
      }),
    };

    controller = new BookingMessagesController(mockService);
  });

  it('should call sendMessage on service and return message entity', async () => {
    const res = await controller.sendMessage(mockUser, bookingId, { content: 'Hello!' }, 'req-1');

    expect(mockService.sendMessage).toHaveBeenCalledWith(mockUser, bookingId, { content: 'Hello!' }, 'req-1');
    expect(res.id).toBe('msg-1');
  });

  it('should call getMessages on service', async () => {
    const res = await controller.getMessages(mockUser, bookingId);

    expect(mockService.getMessages).toHaveBeenCalledWith(mockUser, bookingId);
    expect(res).toHaveLength(1);
  });

  it('should call markAsRead on service', async () => {
    const res = await controller.markAsRead(mockUser, 'msg-1');

    expect(mockService.markAsRead).toHaveBeenCalledWith(mockUser, 'msg-1');
    expect(res.readAt).toBeDefined();
  });
});
