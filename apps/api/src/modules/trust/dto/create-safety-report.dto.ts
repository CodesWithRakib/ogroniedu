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
import type { SafetyCategory, SafetySeverity } from '../entities/safety-report.entity';

export class CreateSafetyReportDto {
  @ApiPropertyOptional({ description: 'Reported user ID (if specific user)' })
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @ApiPropertyOptional({ description: 'Booking ID (if associated with a booking)' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({
    description: 'Category of the safety/abuse violation',
    enum: [
      'harassment',
      'child_safety',
      'inappropriate_content',
      'off_platform_payment',
      'academic_dishonesty',
      'fraud_billing',
      'other',
    ],
  })
  @IsIn([
    'harassment',
    'child_safety',
    'inappropriate_content',
    'off_platform_payment',
    'academic_dishonesty',
    'fraud_billing',
    'other',
  ])
  category!: SafetyCategory;

  @ApiPropertyOptional({
    description: 'Severity level',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: SafetySeverity;

  @ApiProperty({
    description: 'Detailed description of the incident',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Attached evidence file asset IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  evidenceAssetIds?: string[];
}
