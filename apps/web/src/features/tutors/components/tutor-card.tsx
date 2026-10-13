'use client';

import type { Locale } from '@/lib/i18n';
import { TutorCard as DiscoveryTutorCard } from '@/features/tutor-discovery/components/tutor-card';
import type { TutorCardData } from '../types/tutor-search.types';

export interface TutorCardProps {
  /** Presentational card data (canonical discovery shape, no API duplication). */
  tutor: TutorCardData;
  /** `bn` | `en`; selects subject names, badge copy, and number formatting. */
  locale: Locale;
  /** Opens the explainable match-score breakdown for this tutor. */
  onShowScore: (tutor: TutorCardData) => void;
  /** Opens the booking-request modal prefilled for this tutor. */
  onRequestBooking: (tutor: TutorCardData) => void;
}

/**
 * Tutor card for the `tutors` feature module.
 *
 * Thin adapter over the canonical discovery `TutorCard`: identical markup,
 * i18n keys (`tutor.badge*`, `tutor.subjectsTitle`, `discovery.hourlyRate`,
 * `discovery.requestSession`, `discovery.yearsExperience`), localized
 * number formatting, and `data-testid`s (`tutor-card-{id}`,
 * `match-score-badge-{id}`, `request-tutoring-btn-{id}`). No duplicated
 * markup or fake data lives here; presentational changes belong upstream.
 *
 * Preserved behavior notes (do not drift without updating specs):
 * - Hourly rate renders from `hourlyRateMinor / 100` via
 *   `formatLocalizedNumber`; missing rate shows "Contact for fee".
 * - Experience renders only when `yearsExperience` is set, using the
 *   `discovery.yearsExperience` template with a `{count}` placeholder.
 * - Identity/degree badges render only when `tutor.badges` includes
 *   `verified_identity` / `verified_degree`; the base "Verified Tutor"
 *   badge always renders.
 * - Subject chips show at most 3 plus a "+N more" overflow label, using
 *   the locale-appropriate (`bn`/`en`) subject name.
 * - `onShowScore` / `onRequestBooking` are invoked with the full card
 *   record so score and booking modals receive identical payloads.
 */
export function TutorCard({ tutor, locale, onShowScore, onRequestBooking }: TutorCardProps) {
  return (
    <DiscoveryTutorCard
      tutor={tutor}
      locale={locale}
      onShowScore={onShowScore}
      onRequestBooking={onRequestBooking}
    />
  );
}
