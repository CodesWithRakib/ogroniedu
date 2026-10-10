import { IsNumber, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  @Max(1000)
  score!: number;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  tutorFeedback?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  revisionReason?: string;
}
