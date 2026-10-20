import {
  IsUUID,
  IsIn,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DisputeReasonCode } from '../entities/booking-dispute.entity';

export class CreateDisputeDto {
  @ApiProperty({ description: 'Target booking ID being disputed' })
  @IsUUID('4')
  bookingId!: string;

  @ApiProperty({
    description: 'Reason code for opening the dispute',
    enum: [
      'tutor_no_show',
      'poor_quality',
      'unfulfilled_hours',
      'curriculum_mismatch',
      'inappropriate_conduct',
      'billing_dispute',
      'other',
    ],
  })
  @IsIn([
    'tutor_no_show',
    'poor_quality',
    'unfulfilled_hours',
    'curriculum_mismatch',
    'inappropriate_conduct',
    'billing_dispute',
    'other',
  ])
  reasonCode!: DisputeReasonCode;

  @ApiProperty({
    description: 'Detailed explanation of the complaint (min 10 chars)',
    minLength: 10,
    maxLength: 3000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(3000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Optional disputed or claimed refund amount in BDT minor units (poisha)',
  })
  @IsOptional()
  disputedAmountMinor?: string | number;

  @ApiPropertyOptional({ description: 'Evidence file asset UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidenceAssetIds?: string[];
}
