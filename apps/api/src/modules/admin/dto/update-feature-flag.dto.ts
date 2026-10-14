import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
