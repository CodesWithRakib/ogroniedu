import {
  IsIn,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DisputeResolutionType } from '../entities/booking-dispute.entity';

export class ResolveDisputeDto {
  @ApiProperty({
    description: 'Outcome type of the dispute resolution',
    enum: ['refund', 'tutor_upheld', 'partial_refund', 'replacement', 'dismissed'],
  })
  @IsIn(['refund', 'tutor_upheld', 'partial_refund', 'replacement', 'dismissed'])
  resolutionType!: DisputeResolutionType;

  @ApiProperty({
    description: 'Investigator notes and rationale for this resolution decision',
    minLength: 5,
    maxLength: 3000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(3000)
  resolutionNotes!: string;

  @ApiPropertyOptional({
    description:
      'Refund amount in BDT minor units (poisha) when resolution is refund or partial_refund',
  })
  @IsOptional()
  refundAmountMinor?: string | number;
}
