import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { BookingExpiryService } from './booking-expiry.service';

export function isBookingExpiryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.BOOKING_EXPIRY_SCHEDULER_ENABLED === 'false') return false;
  if (env.BOOKING_EXPIRY_SCHEDULER_ENABLED === 'true') return true;
  return env.NODE_ENV !== 'test';
}

export function resolveBookingExpiryIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.BOOKING_EXPIRY_INTERVAL_MS);
  if (!Number.isFinite(parsed) || parsed < 10_000) return 300_000; // default 5 minutes
  return Math.min(parsed, 3_600_000); // max 1 hour
}

/**
 * Background scheduler that periodically runs the booking expiration sweep
 * for 48h unaccepted requests and 24h unpaid bookings.
 */
@Injectable()
export class BookingExpiryScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpiryScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    @Inject(BookingExpiryService)
    private readonly expiryService: BookingExpiryService,
  ) {}

  onApplicationBootstrap(): void {
    if (!isBookingExpiryEnabled()) {
      this.logger.log('Booking expiry scheduler is disabled for this runtime.');
      return;
    }
    const intervalMs = resolveBookingExpiryIntervalMs();
    this.logger.log(`Booking expiry scheduler started (running every ${intervalMs}ms).`);
    this.arm(intervalMs);
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
    try {
      await this.expiryService.sweepExpiredBookings();
    } catch (err) {
      this.logger.error(`Booking expiry sweep encountered an error: ${String(err)}`);
    }
  }

  private arm(delayMs: number): void {
    this.timer = setTimeout(() => {
      void this.runOnce().finally(() => {
        if (!this.stopped) this.arm(resolveBookingExpiryIntervalMs());
      });
    }, delayMs);
  }
}
