'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, SearchX, RotateCcw } from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';
import { TutorCard } from './tutorCard';

export function TutorResultsGrid({
  tutors,
  locale,
  isLoading = false,
  currentPage,
  totalPages,
  onShowScore,
  onRequestBooking,
  onPageChange,
  onReset,
}: {
  tutors: TutorCardData[];
  locale: Locale;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
  onPageChange: (page: number) => void;
  onReset: () => void;
}) {
  const dict = getDictionary(locale);
  const _isBn = locale === 'bn';

  // While the first search is in flight render placeholders, never fabricated
  // or clickable cards (audit F-4/S-1: real results or nothing).
  if (isLoading && tutors.length === 0) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="tutors-grid-loading"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            data-testid="tutor-skeleton-card"
            className="h-80 animate-pulse rounded-2xl bg-card/70 border border-border"
          />
        ))}
      </div>
    );
  }

  if (tutors.length === 0) {
    return (
      <div className="rounded-2xl bg-card/90 border border-border p-10 sm:p-16 text-center space-y-4 backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft border border-border text-primary mx-auto">
          <SearchX className="w-8 h-8 stroke-[2]" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          {dict.discovery?.noResults || 'No tutors matched your criteria.'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {dict.discovery?.noResultsSuggestion ||
            'Try expanding your search radius or clearing price filters.'}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-accent hover:from-brand-accent hover:to-brand text-brand-foreground font-extrabold text-xs px-5 py-2.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{dict.discovery?.resetFilters || 'Reset Filters'}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="tutors-grid"
      >
        {tutors.map((tutor) => (
          <TutorCard
            key={tutor.id}
            tutor={tutor}
            locale={locale}
            onShowScore={onShowScore}
            onRequestBooking={onRequestBooking}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-3 pt-6"
          data-testid="pagination-controls"
        >
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            data-testid="pagination-prev-btn"
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-bold px-3.5 py-2 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span>{dict.discovery?.paginationPrevious || 'Previous'}</span>
          </button>
          <span
            className="text-xs font-semibold text-muted-foreground px-2"
            data-testid="page-indicator"
          >
            {dict.discovery?.pageIndicator
              ? dict.discovery.pageIndicator
                  .replace('{page}', formatLocalizedNumber(currentPage, locale))
                  .replace('{totalPages}', formatLocalizedNumber(totalPages, locale))
              : `Page ${currentPage} of ${totalPages}`}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            data-testid="pagination-next-btn"
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card hover:bg-surface-hover text-foreground text-xs font-bold px-3.5 py-2 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>{dict.discovery?.paginationNext || 'Next'}</span>
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      )}
    </>
  );
}
