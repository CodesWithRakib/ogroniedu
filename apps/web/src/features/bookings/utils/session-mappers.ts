import type { Locale } from '@/lib/i18n';
import type { SessionItem } from '@/store/services/sessions-api';
import type { CalendarSessionItem, CancelAssessmentView } from '../types/session.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Narrow the server-computed cancellation assessment. Returns null when the
 * payload is absent or malformed — callers render no assessment rather than
 * a fabricated one.
 */
export function toCancelAssessment(raw: unknown): CancelAssessmentView | null {
  if (!isRecord(raw)) return null;
  const leadHours = num(raw.leadHours);
  const refundPercentage = num(raw.refundPercentage);
  if (leadHours === null || refundPercentage === null) return null;
  const penaltyNotice = typeof raw.penaltyNotice === 'string' ? raw.penaltyNotice : null;
  const reason = typeof raw.reason === 'string' ? raw.reason : null;
  return { leadHours, refundPercentage, penaltyNotice, reason };
}

/**
 * Bookings eligible for one-off scheduling (mirrors the backend
 * allowed-status gate; the server still enforces it authoritatively).
 */
export function schedulableBookings(
  rows: { id: string; status: string }[],
): { id: string; status: string }[] {
  const allowed = ['requested', 'accepted', 'awaiting_payment', 'confirmed', 'in_progress'];
  return rows.filter((row) => allowed.includes(row.status));
}
/** Map API session rows to calendar display items (single home for the mapping). */
export function mapSessionItems(rows: SessionItem[], locale: Locale): CalendarSessionItem[] {
  return rows.map((s) => ({
    id: s.id,
    bookingId: s.bookingId,
    subjectName: s.subjectName ?? (locale === 'bn' ? 'টিউটরিং ক্লাস' : 'Tutoring class'),
    tutorName: s.tutorName ?? '—',
    studentName: s.studentName ?? '—',
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    timezone: s.timezone ?? 'Asia/Dhaka',
    status: s.status,
    meetingUrl: s.meetingUrl ?? null,
    locationInstructions:
      typeof s.locationInstructions === 'string' ? s.locationInstructions : null,
    cancellationAssessment: toCancelAssessment(s.cancellationAssessment ?? null),
  }));
}
