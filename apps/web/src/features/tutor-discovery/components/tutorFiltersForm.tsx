'use client';

import React from 'react';
import { Search, Sparkles, Filter, RotateCcw } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TutorSortKey } from '../types/tutor-discovery.types';

export interface TutorFiltersValue {
  query: string;
  modeFilter: string;
  sortBy: TutorSortKey;
  minPrice: string;
  maxPrice: string;
}

const POPULAR_SUBJECTS_BN = ['পদার্থবিজ্ঞান', 'গণিত', 'ইংরেজি', 'রসায়ন', 'আইসিটি', 'জীববিজ্ঞান'];
const POPULAR_SUBJECTS_EN = ['Physics', 'Mathematics', 'English', 'Chemistry', 'ICT', 'Biology'];

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
  const isBn = locale === 'bn';
  const popularSubjects = isBn ? POPULAR_SUBJECTS_BN : POPULAR_SUBJECTS_EN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleSubjectClick = (sub: string) => {
    onChange({ query: sub });
    // Trigger submit after state update
    setTimeout(() => onSubmit(), 50);
  };

  return (
    <div className="bg-card/90 border border-border rounded-2xl p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4 text-foreground transition-colors">
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="discovery-filters-form">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Main Search Input */}
          <div className="md:col-span-5 relative">
            <Input
              type="text"
              placeholder={
                dict.discovery?.searchPlaceholder ||
                'Search by tutor name, subject or university...'
              }
              value={value.query}
              onChange={(e) => onChange({ query: e.target.value })}
              aria-label={isBn ? 'শিক্ষক খুঁজুন' : 'Search tutors'}
              data-testid="search-query-input"
              leadingIcon={<Search className="w-4 h-4 text-primary" />}
              className="rounded-2xl"
            />
          </div>

          {/* Mode Select */}
          <div className="md:col-span-2 relative">
            <Select
              value={value.modeFilter || 'all'}
              onValueChange={(val) => onChange({ modeFilter: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-2xl bg-card border-border text-xs sm:text-sm"
                data-testid="mode-select"
                aria-label={isBn ? 'পাঠদানের পদ্ধতি অনুযায়ী ছাঁকুন' : 'Filter mode'}
              >
                <SelectValue placeholder={dict.discovery?.filterAllModes || 'All Modes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dict.discovery?.filterAllModes || 'All Modes'}</SelectItem>
                <SelectItem value="in_person">{dict.tutor?.modeInPerson || 'In-person'}</SelectItem>
                <SelectItem value="online">{dict.tutor?.modeOnline || 'Online'}</SelectItem>
                <SelectItem value="hybrid">{dict.tutor?.modeHybrid || 'Hybrid'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By Select */}
          <div className="md:col-span-3 relative">
            <Select
              value={value.sortBy || 'recommended'}
              onValueChange={(val) => onChange({ sortBy: val as TutorSortKey })}
            >
              <SelectTrigger
                className="w-full rounded-2xl bg-card border-border text-xs sm:text-sm"
                data-testid="sort-by-select"
                aria-label={isBn ? 'সাজানোর নিয়ম' : 'Sort by'}
              >
                <SelectValue
                  placeholder={dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">
                  {dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
                </SelectItem>
                <SelectItem value="price_asc">
                  {dict.discovery?.sortPriceAsc || 'Price: Low to High'}
                </SelectItem>
                <SelectItem value="price_desc">
                  {dict.discovery?.sortPriceDesc || 'Price: High to Low'}
                </SelectItem>
                <SelectItem value="experience_desc">
                  {dict.discovery?.sortExpDesc || 'Experience: Most to Least'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 flex gap-2">
            <Button
              type="submit"
              disabled={isPending}
              data-testid="apply-filters-button"
              className="flex-1 rounded-2xl font-bold text-xs gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{dict.discovery?.applyFilters || 'Filter'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onReset}
              data-testid="reset-filters-button"
              className="h-11 w-11 rounded-2xl shrink-0"
              title={dict.discovery?.resetFilters || 'Reset'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Popular Quick Subject Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-primary" />
            {isBn ? 'জনপ্রিয় বিষয়:' : 'Popular:'}
          </span>
          {popularSubjects.map((subject) => (
            <Button
              key={subject}
              type="button"
              variant={value.query === subject ? 'primary' : 'outline'}
              size="xs"
              onClick={() => handleSubjectClick(subject)}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold h-7"
            >
              {subject}
            </Button>
          ))}
        </div>

        {/* Hourly Rate Price Range */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="font-semibold flex items-center gap-1 text-foreground">
            <span className="text-primary font-bold">৳</span>
            {dict.discovery?.priceRange || 'Hourly Rate (BDT)'}:
          </span>
          <div className="w-28">
            <Input
              type="number"
              placeholder={dict.discovery?.minPrice || 'Min BDT'}
              value={value.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              className="h-8 text-xs rounded-xl"
              data-testid="min-price-input"
            />
          </div>
          <span className="text-muted-foreground">—</span>
          <div className="w-28">
            <Input
              type="number"
              placeholder={dict.discovery?.maxPrice || 'Max BDT'}
              value={value.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="h-8 text-xs rounded-xl"
              data-testid="max-price-input"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
