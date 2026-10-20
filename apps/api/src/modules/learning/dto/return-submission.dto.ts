import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReturnSubmissionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  returnReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  tutorFeedback?: string;
}
