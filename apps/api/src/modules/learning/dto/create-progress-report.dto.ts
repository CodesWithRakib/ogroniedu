import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateProgressReportDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  @IsNotEmpty()
  observableProgress!: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  areasForGrowth?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  tutorRemarks?: string;
}
