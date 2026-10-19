import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';
import type { BookingStatus } from '../enums/booking-status.enum';

const BOOKING_STATUSES: BookingStatus[] = [
  'requested',
  'accepted',
  'awaiting_payment',
  'confirmed',
  'in_progress',
  'completed',
  'declined',
  'cancelled',
  'expired',
  'disputed',
  'replacement_requested',
];

export class GetBookingRequestsQueryDto {
  /** Explicit child scope. Revalidated against active guardian links. */
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  role?: 'student' | 'tutor';
}
