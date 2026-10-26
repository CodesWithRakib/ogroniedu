import type { RateLimitRecord } from './interfaces/rate-limit-record.interface';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  private requests = new Map<string, RateLimitRecord>();

  /**
   * Check rate limit using sliding window counter
   * @param key Unique identifier (IP, email, or composite)
   * @param maxRequests Maximum allowable requests within the window
   * @param windowMs Time window in milliseconds
   */
  checkLimit(key: string, maxRequests: number = 5, windowMs: number = 60000): void {
    const now = Date.now();
    const record = this.requests.get(key) || { timestamps: [] };

    // Filter out expired timestamps
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Too many requests. Please try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    this.requests.set(key, record);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}
