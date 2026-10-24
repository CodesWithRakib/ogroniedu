import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  assertBookingTransition,
  canTransitionBooking,
} from '../src/modules/bookings/constants/booking-status-transitions';
import {
  assertSessionTransition,
  canTransitionSession,
} from '../src/modules/bookings/constants/session-status-transitions';
import {
  assertNoTutorOverlap,
  ACTIVE_SESSION_STATUSES,
} from '../src/modules/bookings/services/session-booking.helpers';
import { BookingExpiryService } from '../src/modules/bookings/services/booking-expiry.service';
import type { BookingEntity } from '../src/modules/bookings/entities/booking.entity';

describe('Phase 7: Core Tutoring Lifecycle & Booking Concurrency', () => {
  describe('1. Booking State Machine Transitions', () => {
    it('allows valid progressive transitions', () => {
      expect(canTransitionBooking('requested', 'accepted')).toBe(true);
      expect(canTransitionBooking('requested', 'awaiting_payment')).toBe(true);
      expect(canTransitionBooking('accepted', 'confirmed')).toBe(true);
      expect(canTransitionBooking('awaiting_payment', 'confirmed')).toBe(true);
      expect(canTransitionBooking('confirmed', 'in_progress')).toBe(true);
      expect(canTransitionBooking('in_progress', 'completed')).toBe(true);
    });

    it('allows terminal and exception transitions', () => {
      expect(canTransitionBooking('requested', 'declined')).toBe(true);
      expect(canTransitionBooking('requested', 'cancelled')).toBe(true);
      expect(canTransitionBooking('requested', 'expired')).toBe(true);
      expect(canTransitionBooking('awaiting_payment', 'expired')).toBe(true);
      expect(canTransitionBooking('confirmed', 'disputed')).toBe(true);
      expect(canTransitionBooking('disputed', 'completed')).toBe(true);
      expect(canTransitionBooking('disputed', 'replacement_requested')).toBe(true);
    });

    it('rejects illegal status transitions', () => {
      expect(canTransitionBooking('requested', 'completed')).toBe(false);
      expect(canTransitionBooking('declined', 'confirmed')).toBe(false);
      expect(canTransitionBooking('cancelled', 'in_progress')).toBe(false);
      expect(canTransitionBooking('expired', 'accepted')).toBe(false);

      expect(() => assertBookingTransition('requested', 'completed')).toThrow(BadRequestException);
      expect(() => assertBookingTransition('declined', 'confirmed')).toThrow(BadRequestException);
    });
  });

  describe('2. Session State Transitions & No-Show Lifecycle', () => {
    it('allows session workflow to no_show from scheduled and in_progress', () => {
      expect(canTransitionSession('scheduled', 'in_progress')).toBe(true);
      expect(canTransitionSession('in_progress', 'completed')).toBe(true);
      expect(canTransitionSession('scheduled', 'no_show')).toBe(true);
      expect(canTransitionSession('in_progress', 'no_show')).toBe(true);
      expect(canTransitionSession('scheduled', 'cancelled')).toBe(true);
      expect(canTransitionSession('scheduled', 'reschedule_pending')).toBe(true);
    });

    it('rejects illegal session transitions', () => {
      expect(canTransitionSession('completed', 'scheduled')).toBe(false);
      expect(canTransitionSession('cancelled', 'in_progress')).toBe(false);
      expect(canTransitionSession('no_show', 'scheduled')).toBe(false);

      expect(() => assertSessionTransition('completed', 'scheduled')).toThrow(BadRequestException);
    });
  });

  describe('3. Timetable Overlap Invariant (Concurrency Protection)', () => {
    const tutorUserId = 'tutor-uuid-1';
    const startsAt = new Date('2026-11-01T10:00:00Z');
    const endsAt = new Date('2026-11-01T11:00:00Z');

    it('throws ConflictException when a conflicting active session exists', async () => {
      const mockQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'existing-session-uuid',
          tutorUserId,
          status: 'scheduled',
          startsAt,
          endsAt,
        }),
      };

      const mockRepo = {
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      await expect(
        assertNoTutorOverlap(mockRepo as any, tutorUserId, startsAt, endsAt),
      ).rejects.toThrow(ConflictException);

      expect(mockQb.where).toHaveBeenCalledWith('s.tutorUserId = :tutorUserId', { tutorUserId });
      expect(mockQb.andWhere).toHaveBeenCalledWith('s.status IN (:...activeStatuses)', {
        activeStatuses: [...ACTIVE_SESSION_STATUSES],
      });
    });

    it('passes when no overlapping session is found', async () => {
      const mockQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };

      const mockRepo = {
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      await expect(
        assertNoTutorOverlap(mockRepo as any, tutorUserId, startsAt, endsAt),
      ).resolves.toBeUndefined();
    });

    it('excludes self when rescheduling an existing session', async () => {
      const excludeSessionId = 'current-session-id';
      const mockQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };

      const mockRepo = {
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      await assertNoTutorOverlap(mockRepo as any, tutorUserId, startsAt, endsAt, excludeSessionId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('s.id != :excludeSessionId', {
        excludeSessionId,
      });
    });
  });

  describe('4. Booking Expiration Engine (48h Request TTL & 24h Payment TTL)', () => {
    let expiryService: BookingExpiryService;
    let mockBookingRepo: any;
    let mockAuditService: any;
    let mockNotificationService: any;
    let mockStatusEventRepo: any;

    beforeEach(() => {
      mockBookingRepo = {
        find: vi.fn(),
        save: vi.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'b-1' })),
      };
      mockAuditService = {
        record: vi.fn().mockResolvedValue(undefined),
      };
      mockNotificationService = {
        dispatch: vi.fn().mockResolvedValue(undefined),
      };
      mockStatusEventRepo = {
        create: vi.fn().mockImplementation((data) => data),
        save: vi.fn().mockResolvedValue({ id: 'event-uuid' }),
      };

      expiryService = new BookingExpiryService(
        mockBookingRepo,
        mockAuditService,
        mockNotificationService,
        mockStatusEventRepo,
        undefined, // dataSource optional
      );
    });

    it('expires unaccepted requests older than 48 hours and notifies requester', async () => {
      const now = new Date('2026-11-05T12:00:00Z');
      const overdueCreatedAt = new Date('2026-11-02T10:00:00Z'); // 74h ago (>48h)

      const staleRequest: Partial<BookingEntity> = {
        id: 'booking-stale-req-1',
        requesterUserId: 'student-user-1',
        studentUserId: 'student-user-1',
        tutorUserId: 'tutor-user-1',
        status: 'requested',
        createdAt: overdueCreatedAt,
        updatedAt: overdueCreatedAt,
      };

      mockBookingRepo.find.mockImplementation(({ where }: any) => {
        if (where.status === 'requested') {
          return Promise.resolve([staleRequest]);
        }
        return Promise.resolve([]);
      });

      const result = await expiryService.sweepExpiredBookings(now);

      expect(result.expiredRequests).toBe(1);
      expect(result.expiredPayments).toBe(0);
      expect(result.totalExpired).toBe(1);

      expect(staleRequest.status).toBe('expired');
      expect(mockBookingRepo.save).toHaveBeenCalledWith(staleRequest);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.request_expired',
          resourceId: 'booking-stale-req-1',
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'student-user-1',
          eventType: 'booking.cancelled',
          recipientRole: 'student',
        }),
      );
    });

    it('expires unpaid awaiting_payment bookings older than 24 hours', async () => {
      const now = new Date('2026-11-05T12:00:00Z');
      const overdueUpdatedAt = new Date('2026-11-04T10:00:00Z'); // 26h ago (>24h)

      const stalePaymentBooking: Partial<BookingEntity> = {
        id: 'booking-stale-pay-1',
        requesterUserId: 'guardian-user-1',
        studentUserId: 'student-user-1',
        tutorUserId: 'tutor-user-1',
        status: 'awaiting_payment',
        createdAt: new Date('2026-11-04T08:00:00Z'),
        updatedAt: overdueUpdatedAt,
      };

      mockBookingRepo.find.mockImplementation(({ where }: any) => {
        if (where.status === 'awaiting_payment') {
          return Promise.resolve([stalePaymentBooking]);
        }
        return Promise.resolve([]);
      });

      const result = await expiryService.sweepExpiredBookings(now);

      expect(result.expiredRequests).toBe(0);
      expect(result.expiredPayments).toBe(1);
      expect(result.totalExpired).toBe(1);

      expect(stalePaymentBooking.status).toBe('expired');
      expect(mockBookingRepo.save).toHaveBeenCalledWith(stalePaymentBooking);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.payment_window_expired',
          resourceId: 'booking-stale-pay-1',
        }),
      );
    });
  });
});
