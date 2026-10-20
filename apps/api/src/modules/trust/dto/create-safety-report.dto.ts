import {
  IsUUID,
  IsIn,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  SafetyCategory,
  SafetySeverity,
  ContactMethod,
} from '../entities/safety-report.entity';

export const ALL_SAFETY_CATEGORIES = [
  'general_complaint',
  'tutor_conduct',
  'student_guardian_conduct',
  'inappropriate_communication',
  'harassment_bullying',
  'discrimination',
  'abuse_exploitation',
  'physical_safety',
  'privacy_data_exposure',
  'booking_dispute',
  'payment_refund',
  'harassment',
  'child_safety',
  'inappropriate_content',
  'off_platform_payment',
  'academic_dishonesty',
  'fraud_billing',
  'other',
] as const;

export class CreateSafetyReportDto {
  @ApiPropertyOptional({ description: 'Reported user ID (if specific user)' })
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @ApiPropertyOptional({ description: 'Booking ID (if associated with a booking)' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Specific session ID (if associated with a class session)' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({
    description: 'Category of the safety/abuse violation or service complaint',
    enum: ALL_SAFETY_CATEGORIES,
  })
  @IsIn(ALL_SAFETY_CATEGORIES)
  category!: SafetyCategory;

  @ApiPropertyOptional({
    description: 'Severity level (server may override for critical categories)',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: SafetySeverity;

  @ApiProperty({
    description: 'Detailed description of the incident/concern',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Incident description must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Incident description cannot exceed 5000 characters' })
  description!: string;

  @ApiPropertyOptional({
    description: 'Evidence file asset UUIDs uploaded for verification',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidenceAssetIds?: string[];

  @ApiPropertyOptional({
    description: 'Whether this report is confidential and masked from subjects/guardians',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred safe contact method',
    enum: ['in_app', 'email', 'phone', 'emergency_only'],
    default: 'in_app',
  })
  @IsOptional()
  @IsIn(['in_app', 'email', 'phone', 'emergency_only'])
  preferredContactMethod?: ContactMethod;

  @ApiPropertyOptional({
    description: 'Approximate incident date/time (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  incidentDate?: string;
}
