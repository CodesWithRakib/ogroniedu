import { IsUUID, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class AddTutorSubjectDto {
  @IsNotEmpty()
  @IsUUID()
  subjectId!: string;

  @IsNotEmpty()
  @IsUUID()
  educationLevelId!: string;

  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @IsOptional()
  @IsString()
  stream?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateMinor?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
