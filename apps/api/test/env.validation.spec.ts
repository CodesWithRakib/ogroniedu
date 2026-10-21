import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validateEnvironment, Environment } from '../src/config/env.validation';

describe('Environment Configuration & Startup Secret Validation Tests', () => {
  it('should accept valid development configuration with defaults', () => {
    const config = validateEnvironment({
      NODE_ENV: 'development',
    });

    expect(config.NODE_ENV).toBe(Environment.Development);
    expect(config.PORT).toBe(4000);
    expect(config.DB_HOST).toBe('localhost');
  });

  it('should accept secure production configuration with DATABASE_URL and Supabase credentials', () => {
    const config = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL:
        'postgresql://postgres:StrongPassword123!@ep-nameless-term-azyfnc49-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      DB_PASSWORD: 'StrongPassword123!',
      SUPABASE_URL: 'https://placeholder-project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'test-supabase-publishable-key-placeholder',
      SUPABASE_SECRET_KEY: 'test-supabase-secret-key-placeholder',
      SUPABASE_JWKS_URL:
        'https://placeholder-project.supabase.co/auth/v1/.well-known/jwks.json',
      JWT_SECRET: 'production-strong-jwt-secret-key-32-chars-long!',
      FRONTEND_URL: 'https://ogroniedu.com',
    });

    expect(config.NODE_ENV).toBe(Environment.Production);
    expect(config.DATABASE_URL).toContain('neon.tech');
    expect(config.SUPABASE_URL).toBe('https://placeholder-project.supabase.co');
    expect(config.SUPABASE_SECRET_KEY).toBeDefined();
  });

  it('NEGATIVE TEST: should fail fast in production if default placeholder JWT_SECRET is used', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DB_PASSWORD: 'StrongPassword123!',
        JWT_SECRET: 'super-secret-jwt-key-replace-in-production',
      }),
    ).toThrow(/Insecure JWT_SECRET detected in production environment/i);
  });

  it('NEGATIVE TEST: should fail fast in production if default postgres password is used', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'production-strong-jwt-secret-key-32-chars-long!',
        DB_PASSWORD: 'postgres',
      }),
    ).toThrow(/Insecure DB_PASSWORD detected in production environment/i);
  });

  it('NEGATIVE TEST: should fail fast if JWT_SECRET is shorter than 16 characters', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET must be at least 16 characters/i);
  });
});
