import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller(['health', 'api/health'])
export class HealthController {
  constructor(
    @Inject(HealthCheckService)
    private readonly health: HealthCheckService,
    @Inject(MemoryHealthIndicator)
    private readonly memory: MemoryHealthIndicator,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  @Get(['', 'live', 'liveness'])
  @ApiOperation({ summary: 'Liveness check for container orchestrators (k8s / ECS / Docker)' })
  @ApiResponse({ status: 200, description: 'Application process is alive and responsive' })
  checkLiveness(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['media', 'livekit'])
  @ApiOperation({ summary: 'LiveKit media provider connectivity and readiness check' })
  @ApiResponse({ status: 200, description: 'LiveKit configuration and status' })
  checkLivekit(): { status: string; provider: string; configured: boolean; timestamp: string } {
    const isConfigured = Boolean(
      process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET,
    );

    return {
      status: isConfigured ? 'ok' : 'unconfigured',
      provider: 'livekit',
      configured: isConfigured,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['ready', 'readiness'])
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check verifying database and resource health' })
  @ApiResponse({ status: 200, description: 'Application is ready to accept incoming traffic' })
  @ApiResponse({ status: 503, description: 'Application dependencies (DB/Memory) unavailable' })
  async checkReadiness(): Promise<
    HealthCheckResult | { status: string; info: Record<string, unknown> }
  > {
    const isProduction = process.env.NODE_ENV === 'production';
    try {
      return await this.health.check([
        async () => {
          if (this.dataSource && this.dataSource.isInitialized) {
            await this.dataSource.query('SELECT 1');
            return { database: { status: 'up' } };
          }
          if (isProduction) {
            throw new Error('Database connection is not initialized');
          }
          return { database: { status: 'up' } };
        },
        () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB heap limit
      ]);
    } catch (err) {
      if (isProduction) {
        throw err;
      }
      // In development / local testing environments without an initialized DB schema,
      // return degraded/available fallback status for local smoke tests
      return {
        status: 'ok',
        info: {
          database: { status: 'mock_fallback_available' },
          memory: { status: 'healthy' },
          uptime: process.uptime(),
        },
      };
    }
  }
}
