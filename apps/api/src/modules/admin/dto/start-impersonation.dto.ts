import { IsUUID, IsString, MinLength, MaxLength, IsOptional, IsInt, Min, Max } from 'class-validator';

export class StartImpersonationDto {
  @IsUUID('4', { message: 'targetUserId must be a valid UUID' })
  targetUserId!: string;

  @IsString()
  @MinLength(5, { message: 'Explicit operational justification reason is required (min 5 characters)' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Impersonation duration must be at least 1 minute' })
  @Max(15, { message: 'Impersonation session cannot exceed 15 minutes limit' })
  durationMinutes?: number = 15;
}
