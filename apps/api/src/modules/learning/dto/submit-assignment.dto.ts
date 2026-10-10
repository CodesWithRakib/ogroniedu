import { IsOptional, IsString, MaxLength, IsArray, IsUUID } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @MaxLength(10000)
  @IsOptional()
  submissionText?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  assetIds?: string[];
}
