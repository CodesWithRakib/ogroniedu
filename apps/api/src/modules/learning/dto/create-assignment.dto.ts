import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsNotEmpty()
  title!: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  instructions?: string;

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxScore?: number;
}
