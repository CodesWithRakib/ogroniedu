import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OutboxWorkerService } from './outbox-worker.service';

/** Advisory-lock key for the outbox poller (cluster-wide per database). */
export const OUTBOX_WORKER_LOCK_KEY = 913_402_211;

export function isOutboxWorkerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.OUTBOX_WORKER_ENABLED === 'false') return false;
  if (env.OUTBOX_WORKER_ENABLED === 'true') return true;
  return env.NODE_ENV !== 'test';
}

export function resolveOutboxPollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.OUTBOX_POLL_INTERVAL_MS);
  if (!Number.isFinite(parsed) || parsed < 500) return 5_000;
  return Math.min(parsed, 60_000);
}

/**
 * Re-armed timer that drains the transactional outbox. Uses a Postgres
 * advisory lock so horizontally scaled pods cannot double-dispatch.
 * The processor is idempotent, but the lock avoids redundant work.
 */
@Injectable()
export class OutboxScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    @Inject(OutboxWorkerService)
    private readonly worker: OutboxWorkerService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (!isOutboxWorkerEnabled()) {
      this.logger.log('Outbox scheduler is disabled for this runtime.');
      return;
    }
    this.logger.log(
      `Outbox scheduler started (poll every ${resolveOutboxPollIntervalMs()}ms).`,
    );
    this.arm(resolveOutboxPollIntervalMs());
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    if (this.stopped) return;
    const release = await this.acquireLock();
    if (!release) return;
    try {
      await this.worker.processPendingEvents();
    } catch (err) {
      this.logger.error(`Outbox poll failed: ${String(err)}`);
    } finally {
      await release();
    }
  }

  private arm(delayMs: number): void {
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (!this.stopped) this.arm(resolveOutboxPollIntervalMs());
      });
    }, delayMs);
    this.timer.unref?.();
  }

  private async acquireLock(): Promise<(() => Promise<void>) | null> {
    if (!this.dataSource) return async () => undefined;
    try {
      const rows: Array<{ locked: boolean }> = await this.dataSource.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [OUTBOX_WORKER_LOCK_KEY],
      );
      if (!rows?.[0]?.locked) return null;
      return async () => {
        try {
          await this.dataSource!.query('SELECT pg_advisory_unlock($1)', [
            OUTBOX_WORKER_LOCK_KEY,
          ]);
        } catch (err) {
          this.logger.warn(`Failed to release outbox lock: ${String(err)}`);
        }
      };
    } catch (err) {
      this.logger.warn(`Could not acquire outbox advisory lock: ${String(err)}`);
      return null;
    }
  }
}
