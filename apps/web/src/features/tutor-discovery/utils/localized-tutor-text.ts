import type { Locale } from '@/lib/i18n';

/**
 * Resolve a tutor's free-text profile field for the active UI locale.
 *
 * Bangla always prefers the tutor-authored Bangla copy and falls back to
 * English when it is missing. Nothing is machine-translated: a tutor without
 * Bangla copy simply shows English on the Bangla UI rather than fabricated
 * Bangla text.
 */
export function localizedTutorText(
  locale: Locale,
  english: string | null | undefined,
  bangla: string | null | undefined,
  legacy?: string | null,
): string | null {
  const englishText = english ?? legacy ?? null;
  if (locale === 'bn') return bangla ?? englishText ?? null;
  return englishText ?? bangla ?? null;
}

/** Pair helper used when a component renders e.g. both summary and detail. */
export function localizedTutorFields(
  locale: Locale,
  tutor: {
    headline?: string | null;
    bio?: string | null;
    headlineEn?: string | null;
    headlineBn?: string | null;
    bioEn?: string | null;
    bioBn?: string | null;
  },
): { headline: string | null; bio: string | null } {
  return {
    headline: localizedTutorText(locale, tutor.headlineEn, tutor.headlineBn, tutor.headline),
    bio: localizedTutorText(locale, tutor.bioEn, tutor.bioBn, tutor.bio),
  };
}
