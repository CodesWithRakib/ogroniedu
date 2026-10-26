import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';
import { Environment } from './environment.enum';

export { Environment } from './environment.enum';

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:5000';

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_NAME: string = 'ogroniedu';

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsOptional()
  DB_POOL_MAX: number = 20;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  DB_SSL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_PUBLISHABLE_KEY?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  SUPABASE_JWKS_URL?: string;

  @IsString()
  @IsOptional()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters long' })
  JWT_SECRET: string = 'super-secret-jwt-key-replace-in-production';

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  UPSTASH_REDIS_REST_URL?: string;

  @IsString()
  @IsOptional()
  UPSTASH_REDIS_REST_TOKEN?: string;

  @IsString()
  @IsOptional()
  LIVEKIT_URL?: string;

  @IsString()
  @IsOptional()
  LIVEKIT_API_KEY?: string;

  @IsString()
  @IsOptional()
  LIVEKIT_API_SECRET?: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  // Strict production security invariants
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (
      !validatedConfig.JWT_SECRET ||
      validatedConfig.JWT_SECRET === 'super-secret-jwt-key-replace-in-production' ||
      validatedConfig.JWT_SECRET.includes('replace-in-production')
    ) {
      throw new Error(
        'Production security violation: Insecure JWT_SECRET detected in production environment. A strong, non-default secret must be configured.',
      );
    }
    if (!validatedConfig.DB_PASSWORD || validatedConfig.DB_PASSWORD === 'postgres') {
      throw new Error(
        'Production security violation: Insecure DB_PASSWORD detected in production environment.',
      );
    }
  }

  return validatedConfig;
}
