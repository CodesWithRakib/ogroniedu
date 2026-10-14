'use client';

import React from 'react';
import { BookOpen, ChevronLeft, ChevronRight, SearchX, RotateCcw } from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';
import { TutorCard } from './tutorCard';

export function TutorResultsGrid({
  tutors,
  locale,
  currentPage,
  totalPages,
  onShowScore,
  onRequestBooking,
  onPageChange,
  onReset,
}: {
  tutors: TutorCardData[];
  locale: Locale;
  currentPage: number;
  totalPages: number;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
  onPageChange: (page: number) => void;
  onReset: () => void;
}) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';

  if (tutors.length === 0) {
    return (
      <div className="rounded-2xl bg-[#061f26]/90 border border-[#0df5c4]/30 p-10 sm:p-16 text-center space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0df5c4]/15 border border-[#0df5c4]/35 text-[#0df5c4] mx-auto shadow-[0_0_20px_rgba(13,245,196,0.25)]">
          <SearchX className="w-8 h-8 stroke-[2]" />
        </div>
        <h3 className="text-xl font-bold text-white">
          {dict.discovery?.noResults || 'No tutors matched your criteria.'}
        </h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          {dict.discovery?.noResultsSuggestion ||
            'Try expanding your search radius or clearing price filters.'}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0df5c4] to-[#00cba0] hover:from-[#00cba0] hover:to-[#0df5c4] text-[#031317] font-extrabold text-xs px-5 py-2.5 shadow-[0_0_15px_rgba(13,245,196,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
            className="inline-flex items-center gap-1 rounded-xl border border-[#0df5c4]/30 bg-[#041a21] hover:bg-white/10 text-slate-200 text-xs font-bold px-3.5 py-2 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span>{dict.discovery?.paginationPrevious || 'Previous'}</span>
          </button>
          <span
            className="text-xs font-semibold text-slate-300 px-2"
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
            className="inline-flex items-center gap-1 rounded-xl border border-[#0df5c4]/30 bg-[#041a21] hover:bg-white/10 text-slate-200 text-xs font-bold px-3.5 py-2 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>{dict.discovery?.paginationNext || 'Next'}</span>
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      )}
    </>
  );
}
