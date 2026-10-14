'use client';

import React from 'react';
import { Search, ChevronDown, Sparkles, Filter, RotateCcw } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
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
    <div className="bg-[#061f26]/90 border border-[#0df5c4]/30 rounded-2xl p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(13,245,196,0.1)] backdrop-blur-xl space-y-4 text-white transition-colors">
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="discovery-filters-form">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="md:col-span-5 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#0df5c4] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  dict.discovery?.searchPlaceholder ||
                  'Search by tutor name, subject or university...'
                }
                value={value.query}
                onChange={(e) => onChange({ query: e.target.value })}
                aria-label={isBn ? 'শিক্ষক খুঁজুন' : 'Search tutors'}
                data-testid="search-query-input"
                className="w-full h-11 pl-10 pr-3 text-xs sm:text-sm rounded-xl border border-[#0df5c4]/30 bg-[#041a21] text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0df5c4] focus:ring-1 focus:ring-[#0df5c4] transition-all"
              />
            </div>
          </div>

          {/* Mode Select */}
          <div className="md:col-span-2 relative">
            <div className="relative flex items-center">
              <select
                aria-label={isBn ? 'পাঠদানের পদ্ধতি অনুযায়ী ছাঁকুন' : 'Filter mode'}
                value={value.modeFilter}
                onChange={(e) => onChange({ modeFilter: e.target.value })}
                data-testid="mode-select"
                className="w-full h-11 px-3 pr-8 text-xs sm:text-sm rounded-xl border border-[#0df5c4]/30 bg-[#041a21] text-slate-200 focus:outline-none focus:border-[#0df5c4] focus:ring-1 focus:ring-[#0df5c4] transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#041a21] text-slate-300">
                  {dict.discovery?.filterAllModes || 'All Modes'}
                </option>
                <option value="in_person" className="bg-[#041a21] text-slate-200">
                  {dict.tutor?.modeInPerson || 'In-person'}
                </option>
                <option value="online" className="bg-[#041a21] text-slate-200">
                  {dict.tutor?.modeOnline || 'Online'}
                </option>
                <option value="hybrid" className="bg-[#041a21] text-slate-200">
                  {dict.tutor?.modeHybrid || 'Hybrid'}
                </option>
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* Sort By Select */}
          <div className="md:col-span-3 relative">
            <div className="relative flex items-center">
              <select
                aria-label={isBn ? 'সাজানোর নিয়ম' : 'Sort by'}
                value={value.sortBy}
                onChange={(e) => onChange({ sortBy: e.target.value as TutorSortKey })}
                data-testid="sort-by-select"
                className="w-full h-11 px-3 pr-8 text-xs sm:text-sm rounded-xl border border-[#0df5c4]/30 bg-[#041a21] text-slate-200 focus:outline-none focus:border-[#0df5c4] focus:ring-1 focus:ring-[#0df5c4] transition-all appearance-none cursor-pointer"
              >
                <option value="recommended" className="bg-[#041a21] text-slate-200">
                  {dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
                </option>
                <option value="price_asc" className="bg-[#041a21] text-slate-200">
                  {dict.discovery?.sortPriceAsc || 'Price: Low to High'}
                </option>
                <option value="price_desc" className="bg-[#041a21] text-slate-200">
                  {dict.discovery?.sortPriceDesc || 'Price: High to Low'}
                </option>
                <option value="experience_desc" className="bg-[#041a21] text-slate-200">
                  {dict.discovery?.sortExpDesc || 'Experience: Most to Least'}
                </option>
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              data-testid="apply-filters-button"
              className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0df5c4] to-[#00cba0] hover:from-[#00cba0] hover:to-[#0df5c4] text-[#031317] font-extrabold text-xs shadow-[0_0_15px_rgba(13,245,196,0.35)] hover:shadow-[0_0_20px_rgba(13,245,196,0.55)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{dict.discovery?.applyFilters || 'Filter'}</span>
            </button>
            <button
              type="button"
              onClick={onReset}
              data-testid="reset-filters-button"
              className="h-11 px-3 inline-flex items-center justify-center rounded-xl border border-[#0df5c4]/30 bg-[#041a21] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={dict.discovery?.resetFilters || 'Reset'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Popular Quick Subject Pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-[#0df5c4]" />
            {isBn ? 'জনপ্রিয় বিষয়:' : 'Popular:'}
          </span>
          {popularSubjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => handleSubjectClick(subject)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-all cursor-pointer ${
                value.query === subject
                  ? 'bg-[#0df5c4] text-[#031317] border-[#0df5c4] shadow-[0_0_10px_rgba(13,245,196,0.4)]'
                  : 'bg-[#041a21] text-slate-300 border-[#0df5c4]/20 hover:border-[#0df5c4]/50 hover:text-[#0df5c4]'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        {/* Hourly Rate Price Range */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#0df5c4]/20 text-xs text-slate-300">
          <span className="font-semibold flex items-center gap-1 text-white">
            <span className="text-[#0df5c4] font-bold">৳</span>
            {dict.discovery?.priceRange || 'Hourly Rate (BDT)'}:
          </span>
          <div className="w-28">
            <input
              type="number"
              placeholder={dict.discovery?.minPrice || 'Min BDT'}
              value={value.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#0df5c4]/30 bg-[#041a21] text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0df5c4]"
              data-testid="min-price-input"
            />
          </div>
          <span className="text-slate-500">—</span>
          <div className="w-28">
            <input
              type="number"
              placeholder={dict.discovery?.maxPrice || 'Max BDT'}
              value={value.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#0df5c4]/30 bg-[#041a21] text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0df5c4]"
              data-testid="max-price-input"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
