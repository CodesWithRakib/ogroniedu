import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
