import { BadRequestException } from '@nestjs/common';

/**
 * Zoned-time helpers. All arithmetic is done on calendar components, never by
 * slicing ISO strings or relying on the server's local timezone.
 *
 * A "local" date is `YYYY-MM-DD` and a "local" time is `HH:MM`.
 */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    // Throws RangeError for an invalid IANA zone; callers validate first.
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function assertValidTimezone(timeZone: string): void {
  if (!isValidIanaTimezone(timeZone)) {
    throw new BadRequestException(`Invalid IANA timezone: '${timeZone}'.`);
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  // Intl may render midnight as 24 in some engines; normalize to 0.
  const hour = values.hour === 24 ? 0 : values.hour;
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute: values.minute, weekday };
}

export function toDateString(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function localDateString(date: Date, timeZone: string): string {
  return toDateString(getZonedParts(date, timeZone));
}

export function localWeekday(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) {
    throw new BadRequestException(`Invalid calendar date: '${dateString}'.`);
  }
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function assertDateString(dateString: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new BadRequestException('Date must be in YYYY-MM-DD format.');
  }
  const [year, month, day] = dateString.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new BadRequestException(`Invalid calendar date: '${dateString}'.`);
  }
}

/**
 * Convert a wall-clock date/time in an IANA timezone to a UTC instant.
 *
 * The offset is resolved by iterating: start from a UTC guess, inspect the
 * wall clock the zone would display, and correct by the difference. Two
 * iterations converge for all real zones. A non-existent wall time (spring
 * forward gap) is rejected; an ambiguous wall time resolves to the earlier
 * offset (first iteration), matching the common scheduling convention.
 */
export function zonedDateTimeToUtc(dateString: string, timeString: string, timeZone: string): Date {
  assertDateString(dateString);
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeString)) {
    throw new BadRequestException('Time must be in HH:MM 24-hour format.');
  }
  assertValidTimezone(timeZone);

  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = getZonedParts(new Date(candidate), timeZone);
    const renderedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
      0,
    );
    const diff = targetAsUtc - renderedAsUtc;
    if (diff === 0) {
      const result = new Date(candidate);
      // Round-trip verification: the resulting instant must render the
      // requested wall time in the zone.
      const check = getZonedParts(result, timeZone);
      if (
        check.year !== year ||
        check.month !== month ||
        check.day !== day ||
        check.hour !== hour ||
        check.minute !== minute
      ) {
        throw new BadRequestException(
          `Local time ${dateString} ${timeString} does not exist in timezone '${timeZone}' (DST gap).`,
        );
      }
      return result;
    }
    candidate += diff;
  }

  throw new BadRequestException(
    `Could not resolve local time ${dateString} ${timeString} in timezone '${timeZone}'.`,
  );
}

/** Format an instant as local date + time in a zone (for notifications/UI). */
export function formatZonedDateTime(date: Date, timeZone: string): string {
  assertValidTimezone(timeZone);
  const parts = getZonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateString(parts)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function normalizeLocalTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
