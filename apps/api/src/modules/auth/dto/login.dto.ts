import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3, { message: 'identifier must be at least 3 characters long' })
  @MaxLength(128)
  identifier!: string;

  @IsString()
  @MinLength(1, { message: 'password is required' })
  password!: string;
}
