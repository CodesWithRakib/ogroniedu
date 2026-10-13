'use client';

import React from 'react';
import type { Locale } from '@/lib/i18n';
import { FilterChips, type ActiveFilter } from '@/components/shared/FilterChips';
import { TutorFiltersForm } from '@/features/tutor-discovery/components/tutorFiltersForm';
import type { TutorSearchFilterParams } from '../types/tutor-search.types';

export interface TutorSearchFiltersProps {
  locale: Locale;
  value: TutorSearchFilterParams;
  isPending: boolean;
  onChange: (patch: Partial<TutorSearchFilterParams>) => void;
  onSubmit: () => void;
  onReset: () => void;
}

/**
 * Tutor search filters for the `tutors` feature module.
 *
 * Rendering delegates to the canonical `TutorFiltersForm` so every
 * user-visible contract is preserved verbatim: `data-testid`s
 * (`discovery-filters-form`, `search-query-input`, `mode-select`,
 * `sort-by-select`, `apply-filters-button`, `reset-filters-button`,
 * `min-price-input`, `max-price-input`), i18n keys (`discovery.*`,
 * `tutor.mode*`), and the submit/reset flow. The shared `FilterChips`
 * below the form is the one additive element: it renders `null` when no
 * filter is active, so default/empty states are byte-identical to before.
 */
export function TutorSearchFilters({
  locale,
  value,
  isPending,
  onChange,
  onSubmit,
  onReset,
}: TutorSearchFiltersProps) {
  const activeFilters = React.useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (value.query.trim()) chips.push({ key: 'query', label: value.query.trim() });
    if (value.modeFilter) chips.push({ key: 'modeFilter', label: value.modeFilter });
    if (value.sortBy !== 'recommended') chips.push({ key: 'sortBy', label: value.sortBy });
    if (value.minPrice.trim()) chips.push({ key: 'minPrice', label: `Min ${value.minPrice}` });
    if (value.maxPrice.trim()) chips.push({ key: 'maxPrice', label: `Max ${value.maxPrice}` });
    return chips;
  }, [value]);

  const handleRemoveFilter = React.useCallback(
    (key: string) => {
      if (key === 'query') onChange({ query: '' });
      else if (key === 'modeFilter') onChange({ modeFilter: '' });
      else if (key === 'sortBy') onChange({ sortBy: 'recommended' });
      else if (key === 'minPrice') onChange({ minPrice: '' });
      else if (key === 'maxPrice') onChange({ maxPrice: '' });
      onSubmit();
    },
    [onChange, onSubmit],
  );

  return (
    <div className="space-y-3">
      <TutorFiltersForm
        locale={locale}
        value={value}
        isPending={isPending}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />
      <FilterChips filters={activeFilters} onRemove={handleRemoveFilter} onResetAll={onReset} locale={locale} />
    </div>
  );
}
