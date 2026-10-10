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

  it('should accept secure production configuration', () => {
    const config = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '8080',
      DB_HOST: 'postgres.production.internal',
      DB_PORT: '5432',
      DB_USERNAME: 'ogroni_app',
      DB_PASSWORD: 'SuperSecureProdPassword2026!#$',
      DB_NAME: 'ogroniedu_prod',
      JWT_SECRET: 'production-strong-jwt-secret-key-32-chars-long!',
      FRONTEND_URL: 'https://ogroniedu.com',
    });

    expect(config.NODE_ENV).toBe(Environment.Production);
    expect(config.PORT).toBe(8080);
    expect(config.DB_NAME).toBe('ogroniedu_prod');
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
