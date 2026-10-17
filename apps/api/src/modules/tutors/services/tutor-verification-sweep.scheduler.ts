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
import { TutorVerificationExpiryService } from './tutor-verification-expiry.service';

/**
 * Advisory-lock key for the daily sweep. Chosen once and never reused by other
 * features so two pods starting at the same moment cannot both run the sweep
 * (`pg_try_advisory_lock` is cluster-wide within a database).
 */
export const VERIFICATION_SWEEP_LOCK_KEY = 913_402_117;

const DEFAULT_SWEEP_HOUR_UTC = 2;

/** The sweep is off in tests unless explicitly opted in. */
export function isVerificationSweepEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.TUTOR_VERIFICATION_SWEEP_ENABLED === 'false') return false;
  if (env.TUTOR_VERIFICATION_SWEEP_ENABLED === 'true') return true;
  return env.NODE_ENV !== 'test';
}

/** Hour (0-23, UTC) the daily sweep is anchored to. Invalid values fall back. */
export function resolveSweepHourUtc(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.TUTOR_VERIFICATION_SWEEP_HOUR_UTC);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) return DEFAULT_SWEEP_HOUR_UTC;
  return parsed;
}

/**
 * Milliseconds from `now` until the next `hourUtc:00:00Z`.
 * Always strictly positive, so an immediate re-arm cannot spin.
 */
export function msUntilNextSweep(now: Date, hourUtc: number): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0),
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Daily driver for `TutorVerificationExpiryService.sweep()`.
 *
 * Deliberately dependency-free (no `@nestjs/schedule`): a single re-armed timer
 * per process plus a Postgres advisory lock gives exactly-once-per-day
 * behaviour across horizontally scaled API pods, while the in-memory timer
 * stays trivial to reason about. The sweep itself is idempotent, so a missed or
 * duplicated timer run can never double-expire or double-notify.
 *
 * Environment:
 *  - `TUTOR_VERIFICATION_SWEEP_ENABLED` (`true`/`false`, default on outside tests)
 *  - `TUTOR_VERIFICATION_SWEEP_HOUR_UTC` (0-23, default 02:00 UTC)
 */
@Injectable()
export class TutorVerificationSweepScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TutorVerificationSweepScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    @Inject(TutorVerificationExpiryService)
    private readonly expiryService: TutorVerificationExpiryService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (!isVerificationSweepEnabled()) {
      this.logger.log('Tutor verification sweep scheduler is disabled for this runtime.');
      return;
    }
    const hourUtc = resolveSweepHourUtc();
    const delay = msUntilNextSweep(new Date(), hourUtc);
    this.logger.log(
      `Tutor verification sweep scheduled daily at ${String(hourUtc).padStart(2, '0')}:00 UTC ` +
        `(next run in ${Math.round(delay / 60_000)} minute(s)).`,
    );
    this.arm(delay);
  }

  onModuleDestroy(): void {
    this.stop();
  }

  /** Exposed for tests/ops: run the guarded sweep once right now. */
  async runOnce(): Promise<void> {
    if (this.stopped) return;
    const release = await this.acquireLock();
    if (!release) {
      this.logger.log('Verification sweep skipped: another instance holds the advisory lock.');
      return;
    }
    try {
      const result = await this.expiryService.sweep();
      if (result.failures.length > 0) {
        this.logger.warn(
          `Verification sweep finished with ${result.failures.length} failure(s): ${JSON.stringify(
            result.failures,
          )}`,
        );
      }
    } catch (err) {
      // The next scheduled run retries; a scheduler failure must never crash the API.
      this.logger.error(`Scheduled verification sweep failed: ${String(err)}`);
    } finally {
      await release();
    }
  }

  private arm(delayMs: number): void {
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (!this.stopped) {
          // Recompute the delay each cycle so a late/early fire does not drift.
          this.arm(msUntilNextSweep(new Date(), resolveSweepHourUtc()));
        }
      });
    }, delayMs);
    // Never keep a test runner or a CLI process alive because of this timer.
    this.timer.unref?.();
  }

  private stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Returns a release function when this process owns the lock. */
  private async acquireLock(): Promise<(() => Promise<void>) | null> {
    if (!this.dataSource) {
      // No DataSource (isolated unit usage): run unguarded, the sweep is idempotent.
      return async () => undefined;
    }
    try {
      const rows: Array<{ locked: boolean }> = await this.dataSource.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [VERIFICATION_SWEEP_LOCK_KEY],
      );
      if (!rows?.[0]?.locked) return null;
      return async () => {
        try {
          await this.dataSource!.query('SELECT pg_advisory_unlock($1)', [
            VERIFICATION_SWEEP_LOCK_KEY,
          ]);
        } catch (err) {
          this.logger.warn(`Failed to release verification sweep lock: ${String(err)}`);
        }
      };
    } catch (err) {
      this.logger.warn(
        `Could not acquire verification sweep advisory lock, skipping this run: ${String(err)}`,
      );
      return null;
    }
  }
}
