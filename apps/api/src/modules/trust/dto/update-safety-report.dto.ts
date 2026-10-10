import { IsIn, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SafetyStatus, EscalationLevel } from '../entities/safety-report.entity';

export class UpdateSafetyReportDto {
  @ApiPropertyOptional({
    description: 'New status for the report',
    enum: ['submitted', 'under_investigation', 'escalated', 'action_taken', 'dismissed'],
  })
  @IsOptional()
  @IsIn(['submitted', 'under_investigation', 'escalated', 'action_taken', 'dismissed'])
  status?: SafetyStatus;

  @ApiPropertyOptional({
    description: 'Escalation level',
    enum: ['standard', 'urgent_child_safety', 'legal_review'],
  })
  @IsOptional()
  @IsIn(['standard', 'urgent_child_safety', 'legal_review'])
  escalationLevel?: EscalationLevel;

  @ApiPropertyOptional({ description: 'Resolution notes or action taken summary' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  resolutionNotes?: string;
}
