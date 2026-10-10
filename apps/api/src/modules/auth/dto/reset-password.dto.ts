import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  contact!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit numeric OTP' })
  code!: string;

  @IsString()
  @MinLength(8, { message: 'newPassword must be at least 8 characters long' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'newPassword must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}
