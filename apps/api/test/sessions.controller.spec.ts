import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionsController } from '../src/modules/bookings/sessions.controller';
import { SchedulingService } from '../src/modules/bookings/scheduling.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('SessionsController Unit Tests', () => {
  let controller: SessionsController;
  let mockService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    roles: ['guardian'],
    email: 'guardian@example.com',
  };

  beforeEach(() => {
    mockService = {
      scheduleSession: vi.fn().mockResolvedValue({
        id: 'session-1',
        status: 'scheduled',
      }),
      scheduleRecurringSessions: vi.fn().mockResolvedValue([
        { id: 'session-1', status: 'scheduled' },
        { id: 'session-2', status: 'scheduled' },
      ]),
      getSessions: vi.fn().mockResolvedValue([{ id: 'session-1', status: 'scheduled' }]),
      getSessionById: vi.fn().mockResolvedValue({
        id: 'session-1',
        status: 'scheduled',
      }),
      rescheduleSession: vi.fn().mockResolvedValue({
        id: 'session-1',
        status: 'scheduled',
      }),
      cancelSession: vi.fn().mockResolvedValue({
        session: { id: 'session-1', status: 'cancelled' },
        policyAssessment: { refundPercentage: 100 },
      }),
      getTutorCalendar: vi
        .fn()
        .mockResolvedValue([
          { startsAt: '2026-10-15T10:00:00Z', endsAt: '2026-10-15T11:00:00Z', type: 'busy' },
        ]),
    };

    controller = new SessionsController(mockService as unknown as SchedulingService);
  });

  it('should schedule single session and return 201 wrapped response', async () => {
    const dto = {
      bookingId: 'booking-1',
      startsAt: '2026-10-15T10:00:00Z',
    };
    const res = await controller.scheduleSession(mockUser, dto);
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('session-1');
    expect(mockService.scheduleSession).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should schedule recurring sessions', async () => {
    const dto = {
      bookingId: 'booking-1',
      startDate: '2026-11-01',
      scheduleSlots: [{ weekday: 0, startLocal: '15:00' }],
    };
    const res = await controller.scheduleRecurringSessions(mockUser, dto);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(mockService.scheduleRecurringSessions).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should get sessions for user', async () => {
    const query = { status: 'scheduled' as const };
    const res = await controller.getSessions(mockUser, query);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockService.getSessions).toHaveBeenCalledWith(mockUser, query);
  });

  it('should get session by id', async () => {
    const res = await controller.getSessionById(mockUser, 'session-1');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('session-1');
    expect(mockService.getSessionById).toHaveBeenCalledWith('session-1', mockUser);
  });

  it('should reschedule session', async () => {
    const dto = {
      newStartsAt: '2026-10-16T10:00:00Z',
      reason: 'Schedule change',
    };
    const res = await controller.rescheduleSession(mockUser, 'session-1', dto);
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('scheduled');
    expect(mockService.rescheduleSession).toHaveBeenCalledWith('session-1', mockUser, dto);
  });

  it('should cancel session and return policy assessment', async () => {
    const dto = { reason: 'No longer needed' };
    const res = await controller.cancelSession(mockUser, 'session-1', dto);
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('cancelled');
    expect(res.assessment.refundPercentage).toBe(100);
    expect(mockService.cancelSession).toHaveBeenCalledWith('session-1', mockUser, dto);
  });

  it('should get public tutor calendar', async () => {
    const res = await controller.getTutorCalendar('tutor-uuid-1');
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockService.getTutorCalendar).toHaveBeenCalled();
  });
});
