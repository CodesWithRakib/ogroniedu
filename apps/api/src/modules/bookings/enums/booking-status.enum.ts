export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'awaiting_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'disputed'
  | 'replacement_requested';

export const BOOKING_ACTIVE_STATUSES: readonly BookingStatus[] = [
  'accepted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
];

export const BOOKING_TERMINAL_STATUSES: readonly BookingStatus[] = [
  'completed',
  'declined',
  'cancelled',
  'expired',
];
