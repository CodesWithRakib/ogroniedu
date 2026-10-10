import { IsUUID, IsIn, IsString, IsOptional, MaxLength } from 'class-validator';

export class AssignSupportCaseDto {
  @IsUUID('4')
  assignedToUserId!: string;

  @IsIn(['replacement', 'safety', 'dispute'])
  caseType!: 'replacement' | 'safety' | 'dispute';

  @IsUUID('4')
  caseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
