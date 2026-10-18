'use client';

import React from 'react';
import { Search, Sparkles, Filter, RotateCcw, X } from 'lucide-react';
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
import { WEEKDAY_LABELS, type OptionItem, type TutorSortKey } from '../types/tutor-discovery.types';

export interface TutorFiltersValue {
  query: string;
  subjectId: string;
  educationLevelId: string;
  curriculumId: string;
  districtCode: string;
  modeFilter: string;
  sortBy: TutorSortKey;
  minPrice: string;
  maxPrice: string;
  minExperience: string;
  availableWeekday: string;
  radiusKm: string;
}

export const EMPTY_FILTERS: TutorFiltersValue = {
  query: '',
  subjectId: '',
  educationLevelId: '',
  curriculumId: '',
  districtCode: '',
  modeFilter: '',
  sortBy: 'recommended',
  minPrice: '',
  maxPrice: '',
  minExperience: '',
  availableWeekday: '',
  radiusKm: '',
};

const POPULAR_SUBJECTS_BN = ['পদার্থবিজ্ঞান', 'গণিত', 'ইংরেজি', 'রসায়ন', 'আইসিটি', 'জীববিজ্ঞান'];
const POPULAR_SUBJECTS_EN = ['Physics', 'Mathematics', 'English', 'Chemistry', 'ICT', 'Biology'];

const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

export function TutorFiltersForm({
  locale,
  value,
  isPending,
  subjectOptions = [],
  levelOptions = [],
  curriculumOptions = [],
  districtOptions = [],
  hasLocation = false,
  onChange,
  onSubmit,
  onReset,
}: {
  locale: Locale;
  value: TutorFiltersValue;
  isPending: boolean;
  subjectOptions?: OptionItem[];
  levelOptions?: OptionItem[];
  curriculumOptions?: OptionItem[];
  districtOptions?: OptionItem[];
  /** True when the user shared coordinates, so nearest-first is meaningful. */
  hasLocation?: boolean;
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

  const activeChips: Array<{ key: keyof TutorFiltersValue; label: string }> = [];
  if (value.query) activeChips.push({ key: 'query', label: `“${value.query}”` });
  if (value.subjectId) {
    activeChips.push({
      key: 'subjectId',
      label:
        subjectOptions.find((o) => o.id === value.subjectId)?.label ?? (isBn ? 'বিষয়' : 'Subject'),
    });
  }
  if (value.educationLevelId) {
    activeChips.push({
      key: 'educationLevelId',
      label: levelOptions.find((o) => o.id === value.educationLevelId)?.label ?? 'Level',
    });
  }
  if (value.curriculumId) {
    activeChips.push({
      key: 'curriculumId',
      label: curriculumOptions.find((o) => o.id === value.curriculumId)?.label ?? 'Curriculum',
    });
  }
  if (value.modeFilter) activeChips.push({ key: 'modeFilter', label: value.modeFilter });
  if (value.minPrice) activeChips.push({ key: 'minPrice', label: `≥ ৳${value.minPrice}` });
  if (value.maxPrice) activeChips.push({ key: 'maxPrice', label: `≤ ৳${value.maxPrice}` });
  if (value.minExperience) {
    activeChips.push({
      key: 'minExperience',
      label: isBn ? `${value.minExperience}+ বছর` : `${value.minExperience}+ yrs`,
    });
  }
  if (value.availableWeekday) {
    const day = WEEKDAY_LABELS[Number(value.availableWeekday)];
    activeChips.push({ key: 'availableWeekday', label: isBn ? day?.bn : day?.en });
  }
  if (value.radiusKm) {
    activeChips.push({ key: 'radiusKm', label: `${value.radiusKm} km` });
  }

  return (
    <div className="bg-card/90 border border-border rounded-2xl p-5 sm:p-6 shadow-xs backdrop-blur-xl space-y-4 text-foreground transition-colors">
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="discovery-filters-form">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
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

          <div className="md:col-span-3 relative">
            <Select
              value={value.subjectId || 'all'}
              onValueChange={(val) => onChange({ subjectId: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-2xl bg-card border-border text-xs sm:text-sm"
                data-testid="subject-select"
                aria-label={isBn ? 'বিষয়' : 'Subject'}
              >
                <SelectValue placeholder={isBn ? 'সকল বিষয়' : 'All Subjects'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সকল বিষয়' : 'All Subjects'}</SelectItem>
                {subjectOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 relative">
            <Select
              value={value.educationLevelId || 'all'}
              onValueChange={(val) => onChange({ educationLevelId: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-2xl bg-card border-border text-xs sm:text-sm"
                data-testid="level-select"
                aria-label={isBn ? 'শ্রেণি' : 'Class / level'}
              >
                <SelectValue placeholder={isBn ? 'সকল শ্রেণি' : 'All Classes'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সকল শ্রেণি' : 'All Classes'}</SelectItem>
                {levelOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            value={value.modeFilter || 'all'}
            onValueChange={(val) => onChange({ modeFilter: val === 'all' ? '' : val })}
          >
            <SelectTrigger
              className="w-full rounded-2xl bg-card border-border text-xs"
              data-testid="mode-select"
              aria-label={isBn ? 'পাঠদানের পদ্ধতি' : 'Teaching mode'}
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

          <Select
            value={value.curriculumId || 'all'}
            onValueChange={(val) => onChange({ curriculumId: val === 'all' ? '' : val })}
          >
            <SelectTrigger
              className="w-full rounded-2xl bg-card border-border text-xs"
              data-testid="curriculum-select"
              aria-label={isBn ? 'শিক্ষাক্রম' : 'Curriculum'}
            >
              <SelectValue placeholder={isBn ? 'সকল শিক্ষাক্রম' : 'All Curricula'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল শিক্ষাক্রম' : 'All Curricula'}</SelectItem>
              {curriculumOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={value.availableWeekday || 'all'}
            onValueChange={(val) => onChange({ availableWeekday: val === 'all' ? '' : val })}
          >
            <SelectTrigger
              className="w-full rounded-2xl bg-card border-border text-xs"
              data-testid="weekday-select"
              aria-label={isBn ? 'উপলব্ধতার দিন' : 'Availability day'}
            >
              <SelectValue placeholder={isBn ? 'সকল দিন' : 'Any Day'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল দিন' : 'Any Day'}</SelectItem>
              {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {isBn ? label.bn : label.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={value.districtCode || 'all'}
            onValueChange={(val) => onChange({ districtCode: val === 'all' ? '' : val })}
          >
            <SelectTrigger
              className="w-full rounded-2xl bg-card border-border text-xs"
              data-testid="district-select"
              aria-label={isBn ? 'জেলা' : 'District'}
            >
              <SelectValue placeholder={isBn ? 'সকল জেলা' : 'All Districts'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল জেলা' : 'All Districts'}</SelectItem>
              {districtOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">৳ {isBn ? 'ফি' : 'Fee'}</span>
            <Input
              type="number"
              min={0}
              placeholder={dict.discovery?.minPrice || 'Min'}
              value={value.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              className="h-8 w-24 text-xs rounded-xl"
              data-testid="min-price-input"
              aria-label={isBn ? 'সর্বনিম্ন ফি' : 'Minimum fee'}
            />
            <span>—</span>
            <Input
              type="number"
              min={0}
              placeholder={dict.discovery?.maxPrice || 'Max'}
              value={value.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              className="h-8 w-24 text-xs rounded-xl"
              data-testid="max-price-input"
              aria-label={isBn ? 'সর্বোচ্চ ফি' : 'Maximum fee'}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {isBn ? 'অভিজ্ঞতা (বছর)' : 'Experience (yrs)'}
            </span>
            <Input
              type="number"
              min={0}
              max={60}
              value={value.minExperience}
              onChange={(e) => onChange({ minExperience: e.target.value })}
              className="h-8 w-20 text-xs rounded-xl"
              data-testid="min-experience-input"
              aria-label={isBn ? 'সর্বনিম্ন অভিজ্ঞতা' : 'Minimum experience'}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{isBn ? 'দূরত্ব' : 'Distance'}</span>
            <Select
              value={value.radiusKm || 'all'}
              onValueChange={(val) => onChange({ radiusKm: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="h-8 w-28 rounded-xl bg-card border-border text-xs"
                data-testid="radius-select"
                aria-label={isBn ? 'দূরত্ব ব্যাসার্ধ' : 'Distance radius'}
              >
                <SelectValue placeholder={isBn ? 'যেকোনো' : 'Any'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'যেকোনো' : 'Any'}</SelectItem>
                {RADIUS_OPTIONS.map((km) => (
                  <SelectItem key={km} value={String(km)}>
                    {km} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasLocation && value.radiusKm && (
              <span className="text-warning-soft-foreground" data-testid="radius-needs-location">
                {isBn ? 'লোকেশন শেয়ার করুন' : 'Share location'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="font-semibold text-foreground">{isBn ? 'সাজান' : 'Sort'}</span>
            <Select
              value={value.sortBy || 'recommended'}
              onValueChange={(val) => onChange({ sortBy: val as TutorSortKey })}
            >
              <SelectTrigger
                className="h-8 w-48 rounded-xl bg-card border-border text-xs"
                data-testid="sort-by-select"
                aria-label={isBn ? 'সাজানোর নিয়ম' : 'Sort by'}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">
                  {dict.discovery?.sortRecommended || 'Recommended (Match Score)'}
                </SelectItem>
                <SelectItem value="nearest" disabled={!hasLocation}>
                  {isBn ? 'নিকটতম প্রথমে' : 'Nearest first'}
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
                <SelectItem value="rating_desc">
                  {isBn ? 'রেটিং: সর্বোচ্চ প্রথমে' : 'Rating: Highest'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3 text-primary" />
            {isBn ? 'জনপ্রিয়:' : 'Popular:'}
          </span>
          {popularSubjects.map((subject) => (
            <Button
              key={subject}
              type="button"
              variant={value.query === subject ? 'primary' : 'outline'}
              size="xs"
              onClick={() => {
                onChange({ query: subject });
                onSubmit();
              }}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold h-7"
            >
              {subject}
            </Button>
          ))}
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="active-filter-chips">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  onChange({ [chip.key]: chip.key === 'sortBy' ? 'recommended' : '' });
                  onSubmit();
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onReset}
              className="text-[11px] h-7"
            >
              {isBn ? 'সব মুছুন' : 'Clear all'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
