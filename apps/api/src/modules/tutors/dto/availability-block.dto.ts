import { IsDateString, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateBlockedPeriodDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_/+-]+$/, { message: 'Invalid timezone format' })
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class GetBlockedPeriodsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
