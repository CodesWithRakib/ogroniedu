import type { BookingEntity } from '../entities/booking.entity';
import type { BookingStatus } from '../enums/booking-status.enum';
import { assertBookingTransition } from '../constants/booking-status-transitions';

export interface TransitionContext {
  actorUserId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AppliedTransition {
  from: BookingStatus;
  to: BookingStatus;
  changed: boolean;
}

/**
 * Validate and apply a booking transition in memory. Persistence and history
 * insertion are the caller's responsibility so this can run inside the
 * caller's transaction (payments, replacement) or unit-of-work (bookings).
 */
export function applyBookingTransition(
  booking: BookingEntity,
  to: BookingStatus,
  _context: TransitionContext = {},
): AppliedTransition {
  const from = booking.status;
  assertBookingTransition(from, to);
  if (from === to) {
    return { from, to, changed: false };
  }
  booking.status = to;
  if (to === 'completed') {
    booking.completedAt = new Date();
  }
  return { from, to, changed: true };
}

export function transitionHistoryValues(
  bookingId: string,
  transition: AppliedTransition,
  context: TransitionContext = {},
): {
  bookingId: string;
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  actorUserId: string | null;
  actorRole: string | null;
  reason: string | null;
  safeMetadata: Record<string, unknown>;
} {
  return {
    bookingId,
    fromStatus: transition.from,
    toStatus: transition.to,
    actorUserId: context.actorUserId ?? null,
    actorRole: context.actorRole ?? null,
    reason: context.reason ?? null,
    safeMetadata: context.metadata ?? {},
  };
}
