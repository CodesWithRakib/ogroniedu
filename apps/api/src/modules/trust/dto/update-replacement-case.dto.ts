import { IsIn, IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ReplacementStatus } from '../entities/tutor-replacement-case.entity';

export class UpdateReplacementCaseDto {
  @ApiPropertyOptional({
    description: 'Updated state machine status',
    enum: [
      'requested',
      'under_review',
      'matching',
      'offered',
      'accepted',
      'rejected',
      'closed',
    ],
  })
  @IsOptional()
  @IsIn([
    'requested',
    'under_review',
    'matching',
    'offered',
    'accepted',
    'rejected',
    'closed',
  ])
  status?: ReplacementStatus;

  @ApiPropertyOptional({ description: 'UUID of the replacement tutor offered/assigned' })
  @IsOptional()
  @IsUUID()
  replacementTutorUserId?: string;

  @ApiPropertyOptional({ description: 'Notes on case review, matching, or rejection' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  outcomeNotes?: string;
}
