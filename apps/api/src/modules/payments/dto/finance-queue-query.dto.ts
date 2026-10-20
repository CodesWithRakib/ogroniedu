import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FinanceQueueQueryDto {
  @IsString()
  @IsOptional()
  @MaxLength(40)
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  tutorId?: string;
}
