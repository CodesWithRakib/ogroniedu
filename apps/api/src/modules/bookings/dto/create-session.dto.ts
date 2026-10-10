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
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsDateString()
  @IsNotEmpty()
  startsAt!: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMinutes?: number;

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
  @Matches(/^[A-Za-z0-9_/+-]+$/, { message: 'Invalid timezone format' })
  timezone?: string;
}
