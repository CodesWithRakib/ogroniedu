import { IsOptional, IsUUID, IsDateString, IsIn } from 'class-validator';
import { SessionStatus } from '../entities/booking-session.entity';

export class GetSessionsQueryDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  tutorId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'reschedule_pending'])
  status?: SessionStatus;
}
