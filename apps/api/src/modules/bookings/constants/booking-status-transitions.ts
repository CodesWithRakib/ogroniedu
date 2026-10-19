import { BadRequestException } from '@nestjs/common';
import type { BookingStatus } from '../enums/booking-status.enum';

/**
 * Single source of truth for booking status transitions.
 * Clients never send a status; services map an action to a target status and
 * call `assertBookingTransition` before persisting.
 */
export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  requested: ['accepted', 'awaiting_payment', 'declined', 'cancelled', 'expired'],
  accepted: ['awaiting_payment', 'confirmed', 'cancelled', 'declined', 'expired'],
  awaiting_payment: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['in_progress', 'completed', 'cancelled', 'disputed', 'replacement_requested'],
  in_progress: ['completed', 'cancelled', 'disputed', 'replacement_requested'],
  completed: ['disputed', 'replacement_requested'],
  disputed: ['completed', 'cancelled', 'replacement_requested'],
  replacement_requested: ['confirmed', 'cancelled', 'completed'],
  declined: [],
  cancelled: [],
  expired: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (from === to) return;
  if (!canTransitionBooking(from, to)) {
    throw new BadRequestException(`Invalid booking status transition: '${from}' -> '${to}'.`);
  }
}

/** Statuses from which a payment may authoritatively confirm a booking. */
export const PAYABLE_BOOKING_STATUSES: readonly BookingStatus[] = ['accepted', 'awaiting_payment'];

/** Statuses that may be scheduled; paid bookings must be confirmed first. */
export const SCHEDULABLE_BOOKING_STATUSES: readonly BookingStatus[] = [
  'accepted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
];

/** Booking is free when the agreed price is zero minor units. */
export function isZeroPriceBooking(price: string | number | null | undefined): boolean {
  if (price === null || price === undefined) return false;
  try {
    return BigInt(price) === 0n;
  } catch {
    return false;
  }
}
