import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { applyBookingTransition } from '../src/modules/bookings/utils/booking-lifecycle';
import {
  buildSeriesIdempotencyKey,
  generateSeriesOccurrences,
  MAX_SERIES_OCCURRENCES,
} from '../src/modules/bookings/utils/session-series';
import {
  formatZonedDateTime,
  getZonedParts,
  zonedDateTimeToUtc,
} from '../src/modules/bookings/utils/zoned-time';
import { SessionReminderService } from '../src/modules/bookings/services/session-reminder.service';
import { SessionQueriesService } from '../src/modules/bookings/services/session-queries.service';
import { TutorAvailabilityService } from '../src/modules/tutors/services/tutor-availability.service';

describe('Phase 04 booking/session invariants', () => {
  describe('booking transition map', () => {
    const booking = (status: string) => ({ status, completedAt: null }) as any;

    it('allows requested -> awaiting_payment (tutor accept) and accepts it directly', () => {
      const entity = booking('requested');
      const result = applyBookingTransition(entity, 'awaiting_payment', {
        actorUserId: 'tutor-1',
        actorRole: 'tutor',
      });
      expect(result).toEqual({ from: 'requested', to: 'awaiting_payment', changed: true });
      expect(entity.status).toBe('awaiting_payment');
    });

    it('rejects terminal -> active transitions even when a client supplies a status', () => {
      expect(() => applyBookingTransition(booking('cancelled'), 'confirmed')).toThrow(
        BadRequestException,
      );
      expect(() => applyBookingTransition(booking('completed'), 'requested')).toThrow(
        BadRequestException,
      );
    });

    it('is a no-op for the same status', () => {
      const entity = booking('confirmed');
      expect(applyBookingTransition(entity, 'confirmed').changed).toBe(false);
    });
  });

  describe('zoned-time and recurring generation', () => {
    it('round-trips Asia/Dhaka wall time to UTC', () => {
      const instant = zonedDateTimeToUtc('2026-10-20', '16:30', 'Asia/Dhaka');
      expect(instant.toISOString()).toBe('2026-10-20T10:30:00.000Z');
      expect(formatZonedDateTime(instant, 'Asia/Dhaka')).toBe('2026-10-20 16:30');
    });

    it('keeps the same local hour across a DST boundary', () => {
      const before = zonedDateTimeToUtc('2026-03-07', '09:00', 'America/New_York');
      const after = zonedDateTimeToUtc('2026-03-08', '09:00', 'America/New_York');
      expect(getZonedParts(before, 'America/New_York').hour).toBe(9);
      expect(getZonedParts(after, 'America/New_York').hour).toBe(9);
      // EST is UTC-5, EDT is UTC-4.
      expect(before.toISOString()).toBe('2026-03-07T14:00:00.000Z');
      expect(after.toISOString()).toBe('2026-03-08T13:00:00.000Z');
    });

    it('generates a bounded, ordered weekly series with deterministic idempotency key', () => {
      const input = {
        startDate: '2026-03-02', // Monday
        count: 3,
        timezone: 'Asia/Dhaka',
        slots: [{ weekday: 1, startLocal: '09:00', durationMinutes: 60 }],
        defaultDurationMinutes: 60,
      };
      const occurrences = generateSeriesOccurrences(input);
      expect(occurrences).toHaveLength(3);
      expect(occurrences.map((o) => o.localDate)).toEqual([
        '2026-03-02',
        '2026-03-09',
        '2026-03-16',
      ]);
      expect(occurrences[1].startsAt.getTime() - occurrences[0].startsAt.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
      expect(buildSeriesIdempotencyKey({ ...input, bookingId: 'booking-1' })).toBe(
        buildSeriesIdempotencyKey({ ...input, bookingId: 'booking-1' }),
      );
      expect(buildSeriesIdempotencyKey({ ...input, bookingId: 'booking-1' })).not.toBe(
        buildSeriesIdempotencyKey({ ...input, bookingId: 'booking-2' }),
      );
    });

    it('rejects duplicate slots and counts above the hard cap instead of silently skipping', () => {
      expect(() =>
        generateSeriesOccurrences({
          startDate: '2026-03-02',
          count: 2,
          timezone: 'Asia/Dhaka',
          slots: [
            { weekday: 1, startLocal: '09:00', durationMinutes: 60 },
            { weekday: 1, startLocal: '09:00', durationMinutes: 60 },
          ],
          defaultDurationMinutes: 60,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        generateSeriesOccurrences({
          startDate: '2026-03-02',
          count: MAX_SERIES_OCCURRENCES + 1,
          timezone: 'Asia/Dhaka',
          slots: [{ weekday: 1, startLocal: '09:00', durationMinutes: 60 }],
          defaultDurationMinutes: 60,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('session reminders', () => {
    function makeService(overrides: {
      due?: any[];
      saveOutbox?: ReturnType<typeof vi.fn>;
    } = {}) {
      const chain: any = {
        leftJoinAndSelect: vi.fn(() => chain),
        where: vi.fn(() => chain),
        andWhere: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        take: vi.fn(() => chain),
        getMany: vi.fn().mockResolvedValue(overrides.due ?? []),
      };
      const sessionRepo = {
        createQueryBuilder: vi.fn(() => chain),
        save: vi.fn(async (entity: any) => entity),
      };
      const outboxRepo = {
        create: vi.fn((data: any) => ({ id: 'outbox-1', ...data })),
        save: overrides.saveOutbox ?? vi.fn(async (entity: any) => entity),
      };
      const service = new SessionReminderService(sessionRepo as any, outboxRepo as any);
      return { service, sessionRepo, outboxRepo, chain };
    }

    it('creates one reminder, sets reminder_sent_at, and uses the stable idempotency key', async () => {
      const session = {
        id: 'session-1',
        bookingId: 'booking-1',
        tutorUserId: 'tutor-1',
        studentUserId: 'student-1',
        startsAt: new Date('2026-10-20T10:15:00Z'),
        timezone: 'Asia/Dhaka',
        status: 'scheduled',
        reminderSentAt: null,
        booking: { subject: { nameEn: 'Physics' } },
      };
      const { service, sessionRepo, outboxRepo } = makeService({ due: [session] });

      const result = await service.generateDueReminders(new Date('2026-10-20T10:00:00Z'));

      expect(result).toEqual({ scanned: 1, created: 1, skipped: 0 });
      expect(outboxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'session.reminder',
          aggregateId: 'session-1',
          idempotencyKey: 'session.reminder:session-1',
        }),
      );
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      );
    });

    it('treats a duplicate unique-idempotency insert as a skip and never marks the session', async () => {
      const session = {
        id: 'session-2',
        bookingId: 'booking-2',
        tutorUserId: 'tutor-1',
        studentUserId: 'student-1',
        startsAt: new Date('2026-10-20T10:15:00Z'),
        timezone: 'Asia/Dhaka',
        status: 'scheduled',
        reminderSentAt: null,
        booking: { subject: { nameEn: 'Physics' } },
      };
      const duplicate = Object.assign(new Error('duplicate key'), { code: '23505' });
      const { service, sessionRepo } = makeService({
        due: [session],
        saveOutbox: vi.fn().mockRejectedValue(duplicate),
      });

      const result = await service.generateDueReminders(new Date('2026-10-20T10:00:00Z'));

      expect(result).toEqual({ scanned: 1, created: 0, skipped: 1 });
      expect(sessionRepo.save).not.toHaveBeenCalled();
      expect(session.reminderSentAt).toBeNull();
    });
  });

  describe('iCalendar export', () => {
    function makeService() {
      return new SessionQueriesService({} as any, {} as any);
    }

    it('exports authorized sessions with stable UIDs, UTC instants and cancelled status', async () => {
      const service = makeService();
      vi.spyOn(service, 'getSessions').mockResolvedValue([
        {
          id: 'session-1',
          bookingId: 'booking-1',
          startsAt: new Date('2026-10-20T10:00:00Z'),
          endsAt: new Date('2026-10-20T11:00:00Z'),
          timezone: 'Asia/Dhaka',
          status: 'scheduled',
          version: 2,
          updatedAt: new Date('2026-10-19T09:00:00Z'),
          locationInstructions: 'Room 4',
          meetingUrl: 'https://meet.example/secret-join-token',
          booking: { subject: { nameEn: 'Mathematics', nameBn: 'গণিত' } },
          tutorProfile: { user: { displayName: 'Tutor A' } },
        },
        {
          id: 'session-2',
          bookingId: 'booking-1',
          startsAt: new Date('2026-10-21T10:00:00Z'),
          endsAt: new Date('2026-10-21T11:00:00Z'),
          timezone: 'Asia/Dhaka',
          status: 'cancelled',
          version: 3,
          updatedAt: new Date('2026-10-19T10:00:00Z'),
          booking: { subject: { nameEn: 'Mathematics' } },
          tutorProfile: { user: { displayName: 'Tutor A' } },
        },
      ] as any);

      const ics = await service.generateIcsCalendar(
        { id: 'student-1', roles: ['student'] } as any,
        {},
      );

      expect(ics).toContain('BEGIN:VCALENDAR\r\n');
      expect(ics).toContain('METHOD:PUBLISH');
      expect(ics).toContain('UID:session-session-1@ogroniedu.com');
      expect(ics).toContain('DTSTART:20261020T100000Z');
      expect(ics).toContain('SEQUENCE:1');
      expect(ics).toContain('STATUS:CANCELLED');
      expect(ics).toContain('SEQUENCE:2');
      expect(ics).not.toContain('secret-join-token');
      expect(ics).not.toContain('meet.example');
    });

    it('rejects a forged child filter before returning any sessions', async () => {
      const service = makeService();
      const guardianAccess = (service as any).guardianAccess;
      guardianAccess.findActiveStudentIds = vi.fn().mockResolvedValue(['child-1']);

      await expect(
        service.getSessions({ id: 'guardian-1', roles: ['guardian'] } as any, {
          studentId: 'child-2',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('tutor availability enforcement', () => {
    it('allows unconfigured availability but rejects an explicit blocked period', async () => {
      const exceptionRepo: any = {
        createQueryBuilder: vi.fn(() => {
          const chain: any = {
            where: vi.fn(() => chain),
            andWhere: vi.fn(() => chain),
            getOne: vi.fn().mockResolvedValue(null),
          };
          return chain;
        }),
      };
      const availabilityRepo: any = { find: vi.fn().mockResolvedValue([]) };
      const audit: any = { record: vi.fn() };
      const service = new TutorAvailabilityService(availabilityRepo, exceptionRepo, audit);

      await expect(
        service.assertWithinAvailability(
          'tutor-1',
          new Date('2026-10-20T10:00:00Z'),
          new Date('2026-10-20T11:00:00Z'),
        ),
      ).resolves.toBeUndefined();

      exceptionRepo.createQueryBuilder.mockImplementationOnce(() => {
        const chain: any = {
          where: vi.fn(() => chain),
          andWhere: vi.fn(() => chain),
          getOne: vi.fn().mockResolvedValue({ reason: 'Medical leave' }),
        };
        return chain;
      });

      await expect(
        service.assertWithinAvailability(
          'tutor-1',
          new Date('2026-10-20T10:00:00Z'),
          new Date('2026-10-20T11:00:00Z'),
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
