import { IsIn, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SafetyStatus } from '../entities/safety-report.entity';

export const CASE_TRANSITION_STATUSES = [
  'triaged',
  'assigned',
  'under_review',
  'awaiting_information',
  'escalated',
  'action_taken',
  'resolved',
  'closed',
  'reopened',
  'dismissed',
] as const;

export class UpdateCaseStatusDto {
  @ApiProperty({
    description: 'Target state in lifecycle',
    enum: CASE_TRANSITION_STATUSES,
  })
  @IsIn(CASE_TRANSITION_STATUSES)
  status!: SafetyStatus;

  @ApiPropertyOptional({ description: 'Documented justification or context for state transition' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
