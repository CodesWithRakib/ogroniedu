import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RescheduleSessionDto {
  @IsDateString()
  @IsNotEmpty()
  newStartsAt!: string;

  @IsDateString()
  @IsOptional()
  newEndsAt?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
