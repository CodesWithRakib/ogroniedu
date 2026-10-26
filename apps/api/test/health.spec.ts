import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '../src/modules/health/health.controller';
import type {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

describe('Health & Readiness Probes Tests', () => {
  it('should return liveness status ok with valid uptime and timestamp', () => {
    const controller = new HealthController(null as any, null as any, null as any);
    const result = controller.checkLiveness();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('should check LiveKit media provider status when configured', () => {
    const originalUrl = process.env.LIVEKIT_URL;
    const originalKey = process.env.LIVEKIT_API_KEY;
    const originalSecret = process.env.LIVEKIT_API_SECRET;

    process.env.LIVEKIT_URL = 'wss://livekit.example.com';
    process.env.LIVEKIT_API_KEY = 'test_key';
    process.env.LIVEKIT_API_SECRET = 'test_secret';

    const controller = new HealthController(null as any, null as any, null as any);
    const result = controller.checkLivekit();

    expect(result.status).toBe('ok');
    expect(result.provider).toBe('livekit');
    expect(result.configured).toBe(true);

    process.env.LIVEKIT_URL = originalUrl;
    process.env.LIVEKIT_API_KEY = originalKey;
    process.env.LIVEKIT_API_SECRET = originalSecret;
  });

  it('should handle readiness check with health indicators', async () => {
    const mockHealthService = {
      check: vi.fn().mockResolvedValue({
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      }),
    } as unknown as HealthCheckService;

    const mockDb = {
      pingCheck: vi.fn().mockResolvedValue({ database: { status: 'up' } }),
    } as unknown as TypeOrmHealthIndicator;

    const mockMemory = {
      checkHeap: vi.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    } as unknown as MemoryHealthIndicator;

    const controller = new HealthController(mockHealthService, mockMemory, mockDb as any);
    const result = await controller.checkReadiness();

    expect(result.status).toBe('ok');
    expect(mockHealthService.check).toHaveBeenCalled();
  });

  it('should fallback gracefully when database is unavailable in offline testing', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const mockHealthService = {
      check: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as HealthCheckService;

    const controller = new HealthController(mockHealthService, null as any, null as any);
    const result = await controller.checkReadiness();

    expect(result.status).toBe('ok');
    expect(result.info).toBeDefined();
    expect((result.info as any).database.status).toBe('mock_fallback_available');
    process.env.NODE_ENV = originalEnv;
  });

  it('should throw and fail readiness check in production when dependencies fail', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const mockHealthService = {
      check: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    } as unknown as HealthCheckService;

    const controller = new HealthController(mockHealthService, null as any, null as any);
    await expect(controller.checkReadiness()).rejects.toThrow('Database unavailable');
    process.env.NODE_ENV = originalEnv;
  });
});
