import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WeeklySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startLocal must be in HH:MM 24-hour format (e.g. 15:30)',
  })
  startLocal!: string;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMinutes?: number;
}

export class CreateRecurringSessionsDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string; // YYYY-MM-DD

  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  count?: number; // Total number of sessions to generate (default: 4)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklySlotDto)
  scheduleSlots!: WeeklySlotDto[];

  @IsString()
  @MaxLength(500)
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  locationInstructions?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
