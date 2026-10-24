import { IsString, MinLength, MaxLength } from 'class-validator';

export class BanUserDto {
  @IsString()
  @MinLength(3, { message: 'Reason for permanent ban must be at least 3 characters' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;
}
