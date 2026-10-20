import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { OffsetPaginationQueryDto } from '../../../common/pagination';

export class LearningScopeQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  tutorId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AttendanceSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class LearningListQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

export class AdminSessionsQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  tutorId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'reschedule_pending'])
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminOverviewQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class StudentScopedListQueryDto extends OffsetPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'achieved', 'not_achieved', 'cancelled'])
  status?: 'open' | 'in_progress' | 'achieved' | 'not_achieved' | 'cancelled';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
