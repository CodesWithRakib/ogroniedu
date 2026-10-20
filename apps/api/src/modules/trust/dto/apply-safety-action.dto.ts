import {
  IsUUID,
  IsIn,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SafetyActionType } from '../entities/safety-action.entity';

export const SAFETY_ACTION_TYPES = [
  'tutor_safety_hold',
  'contact_restriction',
  'messaging_disabled',
  'temporary_suspension',
  'flagged_for_review',
] as const;

export class ApplySafetyActionDto {
  @ApiProperty({
    description: 'Type of immediate protective safety action',
    enum: SAFETY_ACTION_TYPES,
  })
  @IsIn(SAFETY_ACTION_TYPES)
  actionType!: SafetyActionType;

  @ApiProperty({ description: 'Target user ID receiving the protective measure' })
  @IsUUID()
  targetUserId!: string;

  @ApiProperty({ description: 'Mandatory documented justification for protective action' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({ description: 'Optional expiration timestamp for temporary measure' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
