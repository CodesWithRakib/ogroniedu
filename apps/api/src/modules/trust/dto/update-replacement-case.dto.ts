import {
  IsIn,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type {
  RefundEligibility,
  ReplacementStatus,
} from '../entities/tutor-replacement-case.entity';

/**
 * Staff-editable transitions. `accepted` is deliberately excluded: participant
 * consent is required and can only be recorded by `POST /:id/accept`.
 */
export const STAFF_TARGET_STATUSES = [
  'under_review',
  'matching',
  'offered',
  'rejected',
  'closed',
  'refund_eligible',
  'cancelled',
] as const;

export class UpdateReplacementCaseDto {
  @ApiPropertyOptional({ description: 'Validated state-machine target status' })
  @IsOptional()
  @IsIn(STAFF_TARGET_STATUSES)
  status?: ReplacementStatus;

  @ApiPropertyOptional({ description: 'UUID of the replacement tutor offered' })
  @IsOptional()
  @IsUUID()
  replacementTutorUserId?: string;

  @ApiPropertyOptional({ description: 'Staff member assigned to the case' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Applicant-facing explanation', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  userVisibleNote?: string;

  @ApiPropertyOptional({
    description: 'Internal reviewer note (never shown to applicant)',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  internalNote?: string;

  @ApiPropertyOptional({ enum: ['not_determined', 'eligible', 'not_eligible'] })
  @IsOptional()
  @IsIn(['not_determined', 'eligible', 'not_eligible'])
  refundEligibility?: RefundEligibility;

  @ApiPropertyOptional({ description: 'Optimistic concurrency version loaded by the reviewer' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class ExtendReplacementDeadlineDto {
  @ApiPropertyOptional({ description: 'Hours to add to the current deadline' })
  @IsInt()
  @Min(1)
  hours!: number;

  @ApiPropertyOptional({ description: 'Mandatory reason for the extension' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class ReplacementCaseQueryDto {
  @ApiPropertyOptional({ enum: STAFF_TARGET_STATUSES })
  @IsOptional()
  @IsIn([...STAFF_TARGET_STATUSES, 'requested', 'accepted'])
  status?: ReplacementStatus;

  @ApiPropertyOptional({ description: 'Only cases past their deadline' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ description: 'Only cases assigned to the caller' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  assignedToMe?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
