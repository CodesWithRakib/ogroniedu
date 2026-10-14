import type { Locale } from './i18n';

/** Centralized locale-aware formatters. Features must import from here — no ad-hoc toLocaleString. */

export function formatDate(iso: string | Date | null | undefined, locale: Locale = 'bn'): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(
  iso: string | Date | null | undefined,
  locale: Locale = 'bn',
): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Grouping-aware number formatting (1,500 / ১,৫০০). Distinct from
 * `lib/i18n.formatLocalizedNumber`, which only transliterates digits without
 * grouping — that helper stays for inline digit conversion; use this one for
 * standalone counts and currency-adjacent figures.
 */
export function formatGroupedNumber(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US');
}

/** Weekday-inclusive date for schedule cards (matches SessionCard display). */
export function formatWeekdayDate(
  iso: string | Date | null | undefined,
  locale: Locale = 'bn',
): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Hour:minute time for schedule cards (matches SessionCard display). */
export function formatTime(iso: string | Date | null | undefined, locale: Locale = 'bn'): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** BDT amounts stored as minor units (poisha). Renders ৳ with locale digits. */
export function formatBDTMinor(minor: string | number | null | undefined, locale: Locale): string {
  const n = typeof minor === 'string' ? Number(minor) : (minor ?? NaN);
  if (!Number.isFinite(n)) return '—';
  const major = n / 100;
  const digits = major.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US');
  return locale === 'bn' ? `৳${digits}` : `BDT ${digits}`;
}
