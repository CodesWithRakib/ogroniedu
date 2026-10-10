import { IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsIn(['bn', 'en'])
  preferredLocale?: 'bn' | 'en';
}
