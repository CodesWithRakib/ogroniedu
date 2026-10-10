import { IsString, IsOptional, IsUUID, Matches, MaxLength, IsIn } from 'class-validator';

export class UpsertStudentProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateOfBirth must be formatted as YYYY-MM-DD',
  })
  dateOfBirth?: string;

  @IsOptional()
  @IsUUID('4')
  educationLevelId?: string;

  @IsOptional()
  @IsUUID('4')
  curriculumId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  institutionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  stream?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  districtCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  upazilaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  learningGoals?: string;

  @IsOptional()
  @IsIn(['private', 'limited'])
  profileVisibility?: 'private' | 'limited';
}
