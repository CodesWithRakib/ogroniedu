import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
  Matches,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+?8801[3-9]\d{8}|01[3-9]\d{8}|\+?[1-9]\d{6,14})$/, {
    message:
      'phone must be a valid Bangladeshi or international number (e.g. 01712345678 or +8801712345678)',
  })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @IsIn(['student', 'guardian', 'tutor'], {
    message: 'role must be one of: student, guardian, tutor',
  })
  role!: 'student' | 'guardian' | 'tutor';

  @IsOptional()
  @IsIn(['bn', 'en'])
  preferredLocale?: 'bn' | 'en';
}
