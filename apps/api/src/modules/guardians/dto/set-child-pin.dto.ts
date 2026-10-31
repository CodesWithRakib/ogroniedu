import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetChildPinDto {
  @IsString()
  @MinLength(4, { message: 'PIN or password must be at least 4 characters' })
  @MaxLength(64, { message: 'PIN or password cannot exceed 64 characters' })
  pin!: string;
}
