import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSystemSettingDto {
  @IsObject()
  value!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
