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
import { TutorReplacementService } from '../tutor-replacement.service';

/** Advisory-lock key unique to the replacement deadline sweep. */
export const REPLACEMENT_SWEEP_LOCK_KEY = 913_402_118;

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

export function isReplacementSweepEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.TUTOR_REPLACEMENT_SWEEP_ENABLED === 'false') return false;
  if (env.TUTOR_REPLACEMENT_SWEEP_ENABLED === 'true') return true;
  return env.NODE_ENV !== 'test';
}

/**
 * Runs the idempotent overdue sweep every 15 minutes. The sweep itself is
 * guarded by an adapter-level advisory lock; per-case idempotency is enforced
 * by `overdue_notified_at`, so a duplicate/late run cannot re-notify or move a
 * deadline. The timer never keeps a test runner alive.
 */
@Injectable()
export class TutorReplacementDeadlineScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TutorReplacementDeadlineScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(TutorReplacementService)
    private readonly replacementService: TutorReplacementService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (!isReplacementSweepEnabled()) return;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, SWEEP_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<{ processed: number }> {
    const release = await this.acquireLock();
    if (!release) return { processed: 0 };
    try {
      return await this.replacementService.runOverdueSweep();
    } catch (error) {
      // Next tick retries; a scheduler failure must never crash the API.
      this.logger.error(`Replacement deadline sweep failed: ${String(error)}`);
      return { processed: 0 };
    } finally {
      await release();
    }
  }

  private async acquireLock(): Promise<(() => Promise<void>) | null> {
    if (!this.dataSource) return async () => undefined;
    try {
      const rows: Array<{ locked: boolean }> = await this.dataSource.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [REPLACEMENT_SWEEP_LOCK_KEY],
      );
      if (!rows?.[0]?.locked) return null;
      return async () => {
        try {
          await this.dataSource!.query('SELECT pg_advisory_unlock($1)', [
            REPLACEMENT_SWEEP_LOCK_KEY,
          ]);
        } catch (error) {
          this.logger.warn(`Failed to release replacement sweep lock: ${String(error)}`);
        }
      };
    } catch (error) {
      this.logger.warn(`Could not acquire replacement sweep lock: ${String(error)}`);
      return null;
    }
  }
}
