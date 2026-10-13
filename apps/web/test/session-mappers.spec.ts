import { describe, it, expect } from 'vitest';
import {
  mapSessionItems,
  schedulableBookings,
  toCancelAssessment,
} from '../src/features/bookings/utils/session-mappers';
import type { SessionItem } from '../src/store/services/sessions-api';

const row = (overrides: Partial<SessionItem> = {}): SessionItem => ({
  id: 's1',
  bookingId: 'b1',
  startsAt: '2026-02-01T10:00:00+06:00',
  endsAt: '2026-02-01T11:00:00+06:00',
  status: 'scheduled',
  ...overrides,
});

describe('Session mappers (no fabricated assessments)', () => {
  it('passes through the server cancellation assessment untouched', () => {
    const items = mapSessionItems(
      [
        row({
          status: 'cancelled',
          cancellationAssessment: { leadHours: 6, refundPercentage: 80 },
        }),
      ],
      'en',
    );
    expect(items[0].cancellationAssessment).toEqual({
      leadHours: 6,
      refundPercentage: 80,
      penaltyNotice: null,
      reason: null,
    });
  });

  it('maps absent assessment to null (never a hardcoded 100% refund)', () => {
    const items = mapSessionItems([row({ status: 'cancelled' })], 'en');
    expect(items[0].status).toBe('cancelled');
    expect(items[0].cancellationAssessment).toBeNull();
  });

  it('rejects malformed assessment payloads', () => {
    expect(toCancelAssessment(null)).toBeNull();
    expect(toCancelAssessment('100%')).toBeNull();
    expect(toCancelAssessment({ leadHours: 'many', refundPercentage: 100 })).toBeNull();
    expect(toCancelAssessment({ leadHours: 30, refundPercentage: 100, reason: 'ok' })).toEqual({
      leadHours: 30,
      refundPercentage: 100,
      penaltyNotice: null,
      reason: 'ok',
    });
  });

  it('applies locale fallbacks for names and timezone', () => {
    const [bn, en] = [mapSessionItems([row()], 'bn'), mapSessionItems([row()], 'en')];
    expect(bn[0].subjectName).toBe('টিউটরিং ক্লাস');
    expect(en[0].subjectName).toBe('Tutoring class');
    expect(en[0].timezone).toBe('Asia/Dhaka');
    expect(en[0].tutorName).toBe('—');
  });

  it('filters schedulable bookings to backend-allowed statuses', () => {
    const rows = schedulableBookings([
      { id: 'a', status: 'requested' },
      { id: 'b', status: 'confirmed' },
      { id: 'c', status: 'cancelled' },
      { id: 'd', status: 'declined' },
      { id: 'e', status: 'in_progress' },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'e']);
  });
});
