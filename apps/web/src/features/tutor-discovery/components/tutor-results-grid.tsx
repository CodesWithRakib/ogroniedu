'use client';

import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';
import { TutorCard } from './tutor-card';

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

  if (tutors.length === 0) {
    return (
      <Card className="text-center py-16">
        <CardContent className="space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {dict.discovery?.noResults || 'No tutors matched your criteria.'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {dict.discovery?.noResultsSuggestion ||
              'Try expanding your search radius or clearing price filters.'}
          </p>
          <Button variant="outline" size="sm" onClick={onReset}>
            {dict.discovery?.resetFilters || 'Reset Filters'}
          </Button>
        </CardContent>
      </Card>
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
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            data-testid="pagination-prev-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {dict.discovery?.paginationPrevious || 'Previous'}
          </Button>
          <span
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
            data-testid="page-indicator"
          >
            {dict.discovery?.pageIndicator
              ? dict.discovery.pageIndicator
                  .replace('{page}', formatLocalizedNumber(currentPage, locale))
                  .replace('{totalPages}', formatLocalizedNumber(totalPages, locale))
              : `Page ${currentPage} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            data-testid="pagination-next-btn"
          >
            {dict.discovery?.paginationNext || 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  );
}
