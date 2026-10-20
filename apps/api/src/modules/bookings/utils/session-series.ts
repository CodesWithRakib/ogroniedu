import crypto from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import {
  addDaysToDateString,
  assertDateString,
  assertValidTimezone,
  localWeekday,
  normalizeLocalTime,
  zonedDateTimeToUtc,
} from './zoned-time';
import type { SeriesSlot } from '../entities/booking-session-series.entity';

export const MAX_SERIES_OCCURRENCES = 24;
export const MAX_SERIES_HORIZON_WEEKS = 26;

export interface GeneratedOccurrence {
  occurrenceIndex: number;
  startsAt: Date;
  endsAt: Date;
  localDate: string;
  localStart: string;
}

export interface GenerateSeriesInput {
  startDate: string;
  count: number;
  timezone: string;
  slots: SeriesSlot[];
  defaultDurationMinutes: number;
}

/**
 * Deterministic occurrence generation.
 *
 * Dates are enumerated from `startDate` through the bounded horizon. Slots are
 * ordered by weekday then local start time. Every wall time is resolved in the
 * series timezone, so DST transitions are handled by the zoned-time utility.
 * If `count` cannot be reached inside the horizon, the request is rejected —
 * occurrences are never silently skipped.
 */
export function generateSeriesOccurrences(input: GenerateSeriesInput): GeneratedOccurrence[] {
  assertDateString(input.startDate);
  assertValidTimezone(input.timezone);
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_SERIES_OCCURRENCES) {
    throw new BadRequestException(
      `Recurring session count must be between 1 and ${MAX_SERIES_OCCURRENCES}.`,
    );
  }
  if (!input.slots || input.slots.length === 0) {
    throw new BadRequestException('At least one weekly schedule slot is required.');
  }

  const seen = new Set<string>();
  const normalizedSlots = input.slots
    .map((slot) => {
      if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6) {
        throw new BadRequestException('Slot weekday must be between 0 (Sunday) and 6 (Saturday).');
      }
      const startLocal = normalizeLocalTime(slot.startLocal);
      const duration = slot.durationMinutes || input.defaultDurationMinutes || 60;
      if (!Number.isInteger(duration) || duration < 15 || duration > 480) {
        throw new BadRequestException('Slot duration must be between 15 and 480 minutes.');
      }
      const key = `${slot.weekday}-${startLocal}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate recurring slot for weekday ${slot.weekday} at ${startLocal}.`,
        );
      }
      seen.add(key);
      return { weekday: slot.weekday, startLocal, durationMinutes: duration };
    })
    .sort((a, b) => a.weekday - b.weekday || a.startLocal.localeCompare(b.startLocal));

  const horizonEnd = addDaysToDateString(input.startDate, MAX_SERIES_HORIZON_WEEKS * 7 - 1);
  const occurrences: GeneratedOccurrence[] = [];
  let cursor = input.startDate;

  while (cursor <= horizonEnd && occurrences.length < input.count) {
    const weekday = localWeekday(cursor);
    const slotsToday = normalizedSlots.filter((slot) => slot.weekday === weekday);
    for (const slot of slotsToday) {
      if (occurrences.length >= input.count) break;
      const startsAt = zonedDateTimeToUtc(cursor, slot.startLocal, input.timezone);
      const endsAt = new Date(startsAt.getTime() + slot.durationMinutes * 60_000);
      occurrences.push({
        occurrenceIndex: occurrences.length,
        startsAt,
        endsAt,
        localDate: cursor,
        localStart: slot.startLocal,
      });
    }
    cursor = addDaysToDateString(cursor, 1);
  }

  if (occurrences.length < input.count) {
    throw new BadRequestException(
      `Only ${occurrences.length} occurrence(s) fit inside the ${MAX_SERIES_HORIZON_WEEKS}-week horizon; ` +
        `reduce the count or add weekly slots. Occurrences are never silently skipped.`,
    );
  }

  return occurrences;
}

/** Stable idempotency key for a series request. */
export function buildSeriesIdempotencyKey(input: {
  bookingId: string;
  startDate: string;
  timezone: string;
  count: number;
  slots: SeriesSlot[];
  clientKey?: string;
}): string {
  if (input.clientKey && input.clientKey.trim().length > 0) {
    return `client:${input.clientKey.trim()}`;
  }
  const normalizedSlots = [...input.slots]
    .map((s) => `${s.weekday}:${normalizeLocalTime(s.startLocal)}:${s.durationMinutes || 0}`)
    .sort()
    .join('|');
  const raw = [input.bookingId, input.startDate, input.timezone, input.count, normalizedSlots].join(
    '::',
  );
  return `auto:${crypto.createHash('sha256').update(raw).digest('hex')}`;
}

export function computeHorizonEndDate(startDate: string): string {
  return addDaysToDateString(startDate, MAX_SERIES_HORIZON_WEEKS * 7 - 1);
}
