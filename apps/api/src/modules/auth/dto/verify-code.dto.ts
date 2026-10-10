import { IsString, IsIn, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  contact!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit numeric OTP' })
  code!: string;

  @IsIn(['contact_verification', 'password_recovery'], {
    message: 'purpose must be one of: contact_verification, password_recovery',
  })
  purpose!: 'contact_verification' | 'password_recovery';
}
