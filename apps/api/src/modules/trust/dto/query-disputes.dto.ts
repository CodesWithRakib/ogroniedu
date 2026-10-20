import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DisputeStatus } from '../entities/booking-dispute.entity';

export class QueryDisputesDto {
  @ApiPropertyOptional({
    description: 'Filter disputes by status',
    enum: [
      'opened',
      'under_review',
      'evidence_requested',
      'resolved_refund',
      'resolved_tutor_upheld',
      'resolved_partial_refund',
      'resolved_replacement',
      'dismissed',
    ],
  })
  @IsOptional()
  @IsIn([
    'opened',
    'under_review',
    'evidence_requested',
    'resolved_refund',
    'resolved_tutor_upheld',
    'resolved_partial_refund',
    'resolved_replacement',
    'dismissed',
  ])
  status?: DisputeStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
