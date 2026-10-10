import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsController } from '../src/modules/bookings/bookings.controller';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('BookingsController Unit Tests', () => {
  let controller: BookingsController;
  let mockService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    roles: ['guardian'],
    email: 'guardian@example.com',
  };

  beforeEach(() => {
    mockService = {
      createRequest: vi.fn().mockResolvedValue({
        id: 'booking-uuid-1',
        status: 'requested',
        pricePerSessionMinor: '50000',
      }),
      getRequests: vi.fn().mockResolvedValue([
        {
          id: 'booking-uuid-1',
          status: 'requested',
        },
      ]),
      getRequestById: vi.fn().mockResolvedValue({
        id: 'booking-uuid-1',
        status: 'requested',
      }),
      withdrawRequest: vi.fn().mockResolvedValue({
        id: 'booking-uuid-1',
        status: 'cancelled',
      }),
      respondToRequest: vi.fn().mockResolvedValue({
        id: 'booking-uuid-1',
        status: 'accepted',
      }),
    };

    controller = new BookingsController(mockService as unknown as BookingsService);
  });

  it('should create booking request and return 201 wrapped response', async () => {
    const dto = {
      tutorId: 'tutor-uuid-1',
      studentId: 'student-uuid-1',
      subjectId: 'subj-1',
      educationLevelId: 'lvl-1',
      mode: 'online' as const,
      messageNotes: 'Hello tutor',
    };

    const res = await controller.createRequest(mockUser, dto);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('booking-uuid-1');
    expect(mockService.createRequest).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should get requests for user', async () => {
    const res = await controller.getRequests(mockUser);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockService.getRequests).toHaveBeenCalledWith(mockUser);
  });

  it('should get single request by id', async () => {
    const res = await controller.getRequestById(mockUser, 'booking-uuid-1');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('booking-uuid-1');
    expect(mockService.getRequestById).toHaveBeenCalledWith('booking-uuid-1', mockUser);
  });

  it('should withdraw request with optional reason', async () => {
    const res = await controller.withdrawRequest(mockUser, 'booking-uuid-1', {
      reason: 'No longer needed',
    });
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('cancelled');
    expect(mockService.withdrawRequest).toHaveBeenCalledWith('booking-uuid-1', mockUser, {
      reason: 'No longer needed',
    });
  });

  it('should respond to request (accept/decline)', async () => {
    const res = await controller.respondToRequest(mockUser, 'booking-uuid-1', {
      action: 'accept',
    });
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('accepted');
    expect(mockService.respondToRequest).toHaveBeenCalledWith('booking-uuid-1', mockUser, {
      action: 'accept',
    });
  });
});
