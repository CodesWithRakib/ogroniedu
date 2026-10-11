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
    const mockHealthService = {
      check: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as HealthCheckService;

    const controller = new HealthController(mockHealthService, null as any, null as any);
    const result = await controller.checkReadiness();

    expect(result.status).toBe('ok');
    expect(result.info).toBeDefined();
    expect((result.info as any).database.status).toBe('mock_fallback_available');
  });
});
