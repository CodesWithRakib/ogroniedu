import { BadRequestException } from '@nestjs/common';
import { AnalyticsTimeQueryDto } from '../dto';
import type { TimeBounds } from '../interfaces/time-bounds.interface';

/** Raw SQL is returned as untyped rows by the pg driver; narrow at the boundary. */
export type SqlRow = Record<string, unknown>;

export function asSqlRows(rows: unknown): SqlRow[] {
  return Array.isArray(rows) ? (rows as SqlRow[]) : [];
}

export function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Parse and validate time boundaries preventing temporal inversion.
 * Shared by platform and tutor analytics (single date-math home).
 */
export function resolveTimeBounds(query: AnalyticsTimeQueryDto): TimeBounds {
  const rawEnd = query.endDate || query.to;
  const end = rawEnd ? new Date(rawEnd) : new Date();

  const days = typeof query.days === 'number' && query.days > 0 ? query.days : 30;
  const defaultStart = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const rawStart = query.startDate || query.from;
  const start = rawStart ? new Date(rawStart) : defaultStart;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestException('Invalid date format provided for temporal analytics');
  }

  if (start > end) {
    throw new BadRequestException('startDate cannot be after endDate');
  }

  return { start, end };
}
