import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  FeedbackSeverities,
  FeedbackStatuses,
  type FeedbackSeverity,
  type FeedbackStatus,
} from '@ogroniedu/contracts';

export class TriageFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackSeverities, {
    message: 'severity must be one of: p0_critical, p1_high, p2_medium, p3_low',
  })
  severity?: FeedbackSeverity;

  @IsOptional()
  @IsEnum(FeedbackStatuses, {
    message: 'status must be one of: submitted, triaged, in_progress, resolved, declined',
  })
  status?: FeedbackStatus;

  @IsOptional()
  @IsUUID('4', { message: 'assignedToUserId must be a valid UUID' })
  assignedToUserId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  triageNotes?: string;
}
