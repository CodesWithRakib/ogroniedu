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
import { SessionReminderService } from './session-reminder.service';

export const SESSION_REMINDER_LOCK_KEY = 913_402_307;

export function isSessionReminderEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SESSION_REMINDER_SCHEDULER_ENABLED === 'false') return false;
  if (env.SESSION_REMINDER_SCHEDULER_ENABLED === 'true') return true;
  return env.NODE_ENV !== 'test';
}

export function resolveReminderIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.SESSION_REMINDER_INTERVAL_MS);
  if (!Number.isFinite(parsed) || parsed < 5_000) return 60_000;
  return Math.min(parsed, 300_000);
}

/** Re-armed timer + advisory lock around idempotent reminder generation. */
@Injectable()
export class SessionReminderScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SessionReminderScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    @Inject(SessionReminderService)
    private readonly reminders: SessionReminderService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  onApplicationBootstrap(): void {
    if (!isSessionReminderEnabled()) {
      this.logger.log('Session reminder scheduler is disabled for this runtime.');
      return;
    }
    this.logger.log(
      `Session reminder scheduler started (every ${resolveReminderIntervalMs()}ms).`,
    );
    this.arm(resolveReminderIntervalMs());
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
      const result = await this.reminders.generateDueReminders();
      if (result.created > 0) {
        this.logger.log(`Generated ${result.created} session reminder(s).`);
      }
    } catch (err) {
      this.logger.error(`Session reminder generation failed: ${String(err)}`);
    } finally {
      await release();
    }
  }

  private arm(delayMs: number): void {
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (!this.stopped) this.arm(resolveReminderIntervalMs());
      });
    }, delayMs);
    this.timer.unref?.();
  }

  private async acquireLock(): Promise<(() => Promise<void>) | null> {
    if (!this.dataSource) return async () => undefined;
    try {
      const rows: Array<{ locked: boolean }> = await this.dataSource.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [SESSION_REMINDER_LOCK_KEY],
      );
      if (!rows?.[0]?.locked) return null;
      return async () => {
        try {
          await this.dataSource!.query('SELECT pg_advisory_unlock($1)', [
            SESSION_REMINDER_LOCK_KEY,
          ]);
        } catch (err) {
          this.logger.warn(`Failed to release reminder lock: ${String(err)}`);
        }
      };
    } catch (err) {
      this.logger.warn(`Could not acquire reminder advisory lock: ${String(err)}`);
      return null;
    }
  }
}
