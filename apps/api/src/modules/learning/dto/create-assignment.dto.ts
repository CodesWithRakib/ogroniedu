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
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @IsNotEmpty()
  title!: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  topic?: string;

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

  /** Defaults to false: assignments are created as drafts and published explicitly. */
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;

  @IsOptional()
  @IsBoolean()
  resubmissionAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  lateSubmissionAllowed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;
}
