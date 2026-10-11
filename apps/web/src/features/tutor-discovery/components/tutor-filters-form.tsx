'use client';

import React from 'react';
import { DollarSign, Search } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { TutorSortKey } from '../types/tutor-discovery.types';

export interface TutorFiltersValue {
  query: string;
  modeFilter: string;
  sortBy: TutorSortKey;
  minPrice: string;
  maxPrice: string;
}

export function TutorFiltersForm({
  locale,
  value,
  isPending,
  onChange,
  onSubmit,
  onReset,
}: {
  locale: Locale;
  value: TutorFiltersValue;
  isPending: boolean;
  onChange: (patch: Partial<TutorFiltersValue>) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const dict = getDictionary(locale);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="discovery-filters-form">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <Input
              leadingIcon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder={
                dict.discovery?.searchPlaceholder ||
                'Search by tutor name, subject or university...'
              }
              value={value.query}
              onChange={(e) => onChange({ query: e.target.value })}
              aria-label="Search tutors"
              data-testid="search-query-input"
            />
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filter mode"
              value={value.modeFilter}
              onChange={(e) => onChange({ modeFilter: e.target.value })}
              data-testid="mode-select"
              className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">{dict.discovery?.filterAllModes || 'All Modes'}</option>
              <option value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</option>
              <option value="online">{dict.tutor?.modeOnline || 'Online'}</option>
              <option value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Sort by"
              value={value.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value as TutorSortKey })}
              data-testid="sort-by-select"
              className="w-full h-11 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="recommended">
                {dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
              </option>
              <option value="price_asc">
                {dict.discovery?.sortPriceAsc || 'Price: Low to High'}
              </option>
              <option value="price_desc">
                {dict.discovery?.sortPriceDesc || 'Price: High to Low'}
              </option>
              <option value="experience_desc">
                {dict.discovery?.sortExpDesc || 'Experience: Most to Least'}
              </option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 h-11"
              isLoading={isPending}
              data-testid="apply-filters-button"
            >
              {dict.discovery?.applyFilters || 'Filter'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-3"
              onClick={onReset}
              data-testid="reset-filters-button"
            >
              {dict.discovery?.resetFilters || 'Reset'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {dict.discovery?.priceRange || 'Hourly Rate (BDT)'}:
          </span>
          <div className="w-28">
            <input
              type="number"
              placeholder={dict.discovery?.minPrice || 'Min BDT'}
              value={value.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              data-testid="min-price-input"
            />
          </div>
          <span>—</span>
          <div className="w-28">
            <input
              type="number"
              placeholder={dict.discovery?.maxPrice || 'Max BDT'}
              value={value.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              data-testid="max-price-input"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
