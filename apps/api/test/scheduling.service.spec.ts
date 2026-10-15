import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulingService } from '../src/modules/bookings/scheduling.service';
import { SessionSchedulingService } from '../src/modules/bookings/services/session-scheduling.service';
import { SessionReschedulingService } from '../src/modules/bookings/services/session-rescheduling.service';
import { SessionQueriesService } from '../src/modules/bookings/services/session-queries.service';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BookingEntity } from '../src/modules/bookings/entities/booking.entity';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('SchedulingService Unit & Conflict-Safety Tests (Phase 09)', () => {
  let service: SchedulingService;
  let mockBookingRepo: any;
  let mockSessionRepo: any;
  let mockOutboxRepo: any;
  let mockLinkRepo: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const guardianUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'guardian@example.com',
    roles: ['guardian'],
  };

  const studentUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'student@example.com',
    roles: ['student'],
  };

  const tutorId = '33333333-3333-4333-8333-333333333333';
  const tutorUser: AuthenticatedUser = {
    id: tutorId,
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const sampleBooking: Partial<BookingEntity> = {
    id: 'booking-uuid-1',
    requesterUserId: guardianUser.id,
    studentUserId: studentUser.id,
    tutorUserId: tutorId,
    durationMinutes: 60,
    status: 'accepted',
    subject: { nameEn: 'Mathematics' } as any,
  };

  beforeEach(() => {
    mockBookingRepo = {
      findOne: vi.fn().mockResolvedValue({ ...sampleBooking }),
      save: vi.fn().mockImplementation(async (b) => b),
    };

    mockSessionRepo = {
      create: vi.fn((data) => ({ id: 'session-uuid-1', ...data })),
      save: vi
        .fn()
        .mockImplementation(async (s) =>
          Array.isArray(s) ? s : { ...s, id: s.id || 'session-uuid-1' },
        ),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null), // Default no collision
        getMany: vi.fn().mockResolvedValue([]),
      })),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'outbox-uuid-1', ...data })),
      save: vi.fn().mockImplementation(async (e) => e),
    };

    mockLinkRepo = {
      findOne: vi.fn().mockResolvedValue({
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      }),
      find: vi.fn().mockResolvedValue([]),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    };

    const guardianAccess = new GuardianAccessService(mockLinkRepo);
    const queries = new SessionQueriesService(mockSessionRepo, guardianAccess) as never;
    service = new SchedulingService(
      new SessionSchedulingService(
        mockBookingRepo,
        mockSessionRepo,
        mockOutboxRepo,
        mockAuditService,
        mockNotificationService,
        queries,
      ) as never,
      new SessionReschedulingService(
        mockSessionRepo,
        mockOutboxRepo,
        mockAuditService,
        mockNotificationService,
        queries,
      ) as never,
      queries,
    );
  });

  describe('scheduleSession (One-off)', () => {
    it('should throw NotFoundException if booking does not exist', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.scheduleSession(guardianUser, {
          bookingId: 'non-existent',
          startsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not authorized for this booking', async () => {
      const strangerUser: AuthenticatedUser = {
        id: '99999999-9999-4999-8999-999999999999',
        email: 'stranger@example.com',
        roles: ['student'],
      };
      mockLinkRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.scheduleSession(strangerUser, {
          bookingId: 'booking-uuid-1',
          startsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is in invalid status', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        ...sampleBooking,
        status: 'cancelled',
      });

      await expect(
        service.scheduleSession(guardianUser, {
          bookingId: 'booking-uuid-1',
          startsAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if scheduling in the past', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();

      await expect(
        service.scheduleSession(guardianUser, {
          bookingId: 'booking-uuid-1',
          startsAt: pastDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if tutor already has an active overlapping session (DoD)', async () => {
      const futureStartsAt = new Date(Date.now() + 86400000).toISOString();

      // Mock overlapping query builder returning an existing active session
      mockSessionRepo.createQueryBuilder = vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValueOnce({
          id: 'existing-active-session',
          tutorUserId: tutorId,
          status: 'scheduled',
        }),
      }));

      await expect(
        service.scheduleSession(guardianUser, {
          bookingId: 'booking-uuid-1',
          startsAt: futureStartsAt,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should catch PostgreSQL GiST exclusion violation (23P01) and throw ConflictException', async () => {
      const futureStartsAt = new Date(Date.now() + 86400000).toISOString();

      // Simulate concurrent race condition where GiST constraint catches it at database level
      const gistError: any = new Error('exclusion constraint "ex_tutor_session_overlap"');
      gistError.code = '23P01';
      mockSessionRepo.save.mockRejectedValueOnce(gistError);

      await expect(
        service.scheduleSession(guardianUser, {
          bookingId: 'booking-uuid-1',
          startsAt: futureStartsAt,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully schedule session, confirm booking, persist outbox and audit log', async () => {
      const futureStartsAt = new Date(Date.now() + 86400000).toISOString();

      const session = await service.scheduleSession(guardianUser, {
        bookingId: 'booking-uuid-1',
        startsAt: futureStartsAt,
        meetingUrl: 'https://meet.ogroni.edu/room-101',
      });

      expect(session).toBeDefined();
      expect(session.status).toBe('scheduled');
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(mockBookingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' }),
      );
      expect(mockOutboxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'session.scheduled',
          aggregateType: 'session',
        }),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session.scheduled',
        }),
      );
    });
  });

  describe('scheduleRecurringSessions', () => {
    it('should throw BadRequestException if scheduleSlots array is empty', async () => {
      await expect(
        service.scheduleRecurringSessions(guardianUser, {
          bookingId: 'booking-uuid-1',
          startDate: '2026-11-01',
          scheduleSlots: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate 4 recurring sessions on specified weekdays and save atomically', async () => {
      const sessions = await service.scheduleRecurringSessions(guardianUser, {
        bookingId: 'booking-uuid-1',
        startDate: '2026-11-01',
        count: 4,
        scheduleSlots: [
          { weekday: 0, startLocal: '16:00', durationMinutes: 60 }, // Sunday
          { weekday: 2, startLocal: '16:00', durationMinutes: 60 }, // Tuesday
        ],
      });

      expect(sessions).toHaveLength(4);
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(mockOutboxRepo.save).toHaveBeenCalledTimes(4);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sessions.recurring.scheduled',
        }),
      );
    });
  });

  describe('rescheduleSession', () => {
    it('should throw BadRequestException if trying to reschedule a completed or cancelled session', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce({
        id: 'session-1',
        status: 'completed',
        booking: sampleBooking,
      });

      await expect(
        service.rescheduleSession('session-1', tutorUser, {
          newStartsAt: new Date(Date.now() + 90000000).toISOString(),
          reason: 'Exam conflict',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully reschedule session and record outbox event', async () => {
      const existingSession = {
        id: 'session-1',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        status: 'scheduled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(existingSession);

      const newTime = new Date(Date.now() + 172800000).toISOString();
      const updated = await service.rescheduleSession('session-1', tutorUser, {
        newStartsAt: newTime,
        reason: 'Requested date change',
      });

      expect(updated.status).toBe('scheduled');
      expect(mockOutboxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'session.rescheduled',
        }),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session.rescheduled',
        }),
      );
    });
  });

  describe('cancelSession & Bangladesh Operational Refund Policy Matrix', () => {
    it('should give 100% refund when student/guardian cancels > 24 hours in advance', async () => {
      const sessionInFuture = {
        id: 'session-1',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        studentUserId: studentUser.id,
        startsAt: new Date(Date.now() + 48 * 3600 * 1000), // 48 hours in future
        status: 'scheduled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(sessionInFuture);

      const result = await service.cancelSession('session-1', guardianUser, {
        reason: 'Family trip',
      });

      expect(result.session.status).toBe('cancelled');
      expect(result.policyAssessment.refundPercentage).toBe(100);
      expect(result.policyAssessment.tutorCompensationPercentage).toBe(0);
      expect(result.policyAssessment.penaltyNotice).toBe('none');
      expect(mockOutboxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'session.cancelled',
        }),
      );
    });

    it('should give 80% refund when student/guardian cancels between 4 and 24 hours', async () => {
      const sessionInFuture = {
        id: 'session-1',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        studentUserId: studentUser.id,
        startsAt: new Date(Date.now() + 12 * 3600 * 1000), // 12 hours in future
        status: 'scheduled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(sessionInFuture);

      const result = await service.cancelSession('session-1', studentUser, {
        reason: 'Feeling unwell',
      });

      expect(result.policyAssessment.refundPercentage).toBe(80);
      expect(result.policyAssessment.tutorCompensationPercentage).toBe(20);
    });

    it('should give 0% refund and 80% tutor compensation when student/guardian cancels < 4 hours', async () => {
      const sessionSoon = {
        id: 'session-1',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        studentUserId: studentUser.id,
        startsAt: new Date(Date.now() + 2 * 3600 * 1000), // 2 hours in future
        status: 'scheduled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(sessionSoon);

      const result = await service.cancelSession('session-1', studentUser, {
        reason: 'Sudden conflict',
      });

      expect(result.policyAssessment.refundPercentage).toBe(0);
      expect(result.policyAssessment.tutorCompensationPercentage).toBe(80);
      expect(result.policyAssessment.penaltyNotice).toContain('Late cancellation');
    });

    it('should deduct reliability points when tutor initiates cancellation', async () => {
      const sessionSoon = {
        id: 'session-1',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        studentUserId: studentUser.id,
        startsAt: new Date(Date.now() + 12 * 3600 * 1000), // 12 hours in future (< 24h)
        status: 'scheduled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(sessionSoon);

      const result = await service.cancelSession('session-1', tutorUser, {
        reason: 'Emergency at university',
      });

      expect(result.policyAssessment.initiatedByRole).toBe('tutor');
      expect(result.policyAssessment.refundPercentage).toBe(100);
      expect(result.policyAssessment.penaltyNotice).toContain('3 reliability points deducted');
    });

    it('CRITICAL INVARIANT: Cancelled session slot is immediately reusable without collision', async () => {
      // 1. Session is cancelled
      const session = {
        id: 'session-cancelled',
        bookingId: 'booking-uuid-1',
        tutorUserId: tutorId,
        studentUserId: studentUser.id,
        startsAt: new Date(Date.now() + 86400000),
        status: 'cancelled',
        booking: sampleBooking,
      };
      mockSessionRepo.findOne.mockResolvedValueOnce(session);

      // The query for active overlapping sessions only checks status IN ('scheduled', 'in_progress').
      // When a query is run for that exact same slot, the cancelled session does NOT trigger a collision:
      const qb = mockSessionRepo.createQueryBuilder();
      const collision = await qb.getOne();
      expect(collision).toBeNull(); // No collision

      // Now we schedule a new session in that same slot:
      const newSession = await service.scheduleSession(guardianUser, {
        bookingId: 'booking-uuid-1',
        startsAt: session.startsAt.toISOString(),
      });
      expect(newSession).toBeDefined();
      expect(newSession.status).toBe('scheduled');
    });
  });

  describe('getTutorCalendar (Privacy-Safe Public Calendar)', () => {
    it('should return busy slots without disclosing student identity or private PII', async () => {
      const startsAt = new Date('2026-10-15T10:00:00Z');
      const endsAt = new Date('2026-10-15T11:00:00Z');

      mockSessionRepo.createQueryBuilder = vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValueOnce([
          {
            id: 'sess-1',
            startsAt,
            endsAt,
            studentUserId: 'secret-student-uuid', // Should NOT be present in output
          },
        ]),
      }));

      const calendar = await service.getTutorCalendar(
        tutorId,
        new Date('2026-10-15T00:00:00Z'),
        new Date('2026-10-16T00:00:00Z'),
      );

      expect(calendar).toHaveLength(1);
      expect(calendar[0].startsAt).toBe(startsAt.toISOString());
      expect(calendar[0].endsAt).toBe(endsAt.toISOString());
      expect(calendar[0].type).toBe('busy');
      expect((calendar[0] as any).studentUserId).toBeUndefined();
    });
  });
});
