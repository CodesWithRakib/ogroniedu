import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '../src/modules/health/health.controller';
import { validateEnvironment, Environment } from '../src/config/env.validation';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';

describe('Production Smoke & Operational Readiness Verification', () => {
  describe('Container & Orchestrator Probes', () => {
    it('should return valid liveness payload with uptime and timestamp', () => {
      const controller = new HealthController(null as any, null as any, null as any);
      const res = controller.checkLiveness();

      expect(res.status).toBe('ok');
      expect(typeof res.uptime).toBe('number');
      expect(res.uptime).toBeGreaterThanOrEqual(0);
      expect(new Date(res.timestamp).getTime()).not.toBeNaN();
    });

    it('should execute readiness probe through HealthCheckService', async () => {
      const mockHealth = {
        check: vi.fn().mockResolvedValue({
          status: 'ok',
          info: { database: { status: 'up' }, memory_heap: { status: 'up' } },
        }),
      } as unknown as HealthCheckService;

      const mockMemory = {
        checkHeap: vi.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      } as unknown as MemoryHealthIndicator;

      const controller = new HealthController(mockHealth, mockMemory, {
        isInitialized: true,
        query: vi.fn(),
      } as any);
      const res = await controller.checkReadiness();

      expect(res.status).toBe('ok');
      expect(mockHealth.check).toHaveBeenCalled();
    });

    it('should strictly throw in production when dependencies fail (preventing bad pod in-service)', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const mockHealth = {
        check: vi.fn().mockRejectedValue(new Error('PostgreSQL connection timeout')),
      } as unknown as HealthCheckService;

      const controller = new HealthController(mockHealth, null as any, null as any);
      await expect(controller.checkReadiness()).rejects.toThrow('PostgreSQL connection timeout');
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Production Environment & Secrets Guard', () => {
    it('should prevent default or insecure JWT_SECRET from starting in production', () => {
      expect(() => {
        validateEnvironment({
          NODE_ENV: Environment.Production,
          PORT: 4000,
          JWT_SECRET: 'super-secret-jwt-key-replace-in-production',
          DB_PASSWORD: 'secure_prod_password_123',
        });
      }).toThrow(/Insecure JWT_SECRET detected in production environment/);
    });

    it('should prevent default DB_PASSWORD from starting in production', () => {
      expect(() => {
        validateEnvironment({
          NODE_ENV: Environment.Production,
          PORT: 4000,
          JWT_SECRET: 'a_very_strong_production_secret_32chars_long!',
          DB_PASSWORD: 'postgres',
        });
      }).toThrow(/Insecure DB_PASSWORD detected in production environment/);
    });

    it('should succeed with properly configured production secrets', () => {
      const valid = validateEnvironment({
        NODE_ENV: Environment.Production,
        PORT: 4000,
        JWT_SECRET: 'a_very_strong_production_secret_32chars_long!',
        DB_PASSWORD: 'strong_production_db_password_#987',
      });
      expect(valid.NODE_ENV).toBe(Environment.Production);
      expect(valid.PORT).toBe(4000);
    });
  });

  describe('Zero Information Leakage on Exceptions', () => {
    it('should sanitize 5xx exceptions and prevent stack trace or SQL leakage', () => {
      const filter = new AllExceptionsFilter();
      let capturedStatus = 0;
      let capturedJson: any = null;

      const mockResponse = {
        status: (status: number) => {
          capturedStatus = status;
          return mockResponse;
        },
        json: (payload: any) => {
          capturedJson = payload;
          return mockResponse;
        },
        setHeader: vi.fn(),
      };

      const mockRequest = {
        url: '/api/v1/internal-fail',
        method: 'POST',
        headers: { 'x-request-id': 'test-smoke-trace-id' },
      };

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      const dangerousException = new Error(
        'FATAL: password authentication failed for user "postgres" at Object.runQuery',
      );
      filter.catch(dangerousException, host);

      expect(capturedStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(capturedJson.success).toBe(false);
      expect(capturedJson.error.code).toBe('INTERNAL_ERROR');
      expect(capturedJson.error.message).toBe(
        'Internal server error. Please contact support with request ID.',
      );
      // Confirm raw error message and stack trace are NEVER leaked to the client
      expect(JSON.stringify(capturedJson)).not.toContain('password');
      expect(JSON.stringify(capturedJson)).not.toContain('runQuery');
      expect(capturedJson.meta.requestId).toBe('test-smoke-trace-id');
    });

    it('should cleanly format 401 Unauthorized responses with canonical envelope', () => {
      const filter = new AllExceptionsFilter();
      let capturedStatus = 0;
      let capturedJson: any = null;

      const mockResponse = {
        status: (status: number) => {
          capturedStatus = status;
          return mockResponse;
        },
        json: (payload: any) => {
          capturedJson = payload;
          return mockResponse;
        },
        setHeader: vi.fn(),
      };

      const mockRequest = {
        url: '/api/v1/users/me',
        method: 'GET',
        headers: {},
      };

      const host = {
        getType: () => 'http',
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      } as any;

      filter.catch(new HttpException('Unauthorized access token', HttpStatus.UNAUTHORIZED), host);

      expect(capturedStatus).toBe(HttpStatus.UNAUTHORIZED);
      expect(capturedJson.success).toBe(false);
      expect(capturedJson.error.code).toBe('UNAUTHORIZED');
      expect(capturedJson.error.message).toBe('Unauthorized access token');
      expect(capturedJson.meta.requestId).toBeDefined();
    });
  });
});
