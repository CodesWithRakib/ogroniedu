import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  /** Optional internal destination preserved after sign-in (open-redirect guarded). */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  redirectPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}

export class ConsumeMagicLinkDto {
  @IsString()
  @MinLength(16, { message: 'token is required' })
  @MaxLength(512)
  token!: string;
}
