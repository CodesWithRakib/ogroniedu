import { IsString, IsIn, MinLength, MaxLength } from 'class-validator';

export class RequestCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  contact!: string;

  @IsIn(['contact_verification', 'password_recovery'], {
    message: 'purpose must be one of: contact_verification, password_recovery',
  })
  purpose!: 'contact_verification' | 'password_recovery';
}
