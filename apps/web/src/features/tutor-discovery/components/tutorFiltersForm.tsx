'use client';

import React from 'react';
import {
  Filter,
  RotateCcw,
  X,
  SlidersHorizontal,
  BookOpen,
  GraduationCap,
  MapPin,
  Banknote,
  Calendar,
} from 'lucide-react';
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

export const POPULAR_SUBJECTS_BN = [
  'পদার্থবিজ্ঞান',
  'গণিত',
  'ইংরেজি',
  'রসায়ন',
  'আইসিটি',
  'জীববিজ্ঞান',
];
export const POPULAR_SUBJECTS_EN = [
  'Physics',
  'Mathematics',
  'English',
  'Chemistry',
  'ICT',
  'Biology',
];

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
  className = '',
  isMobileDrawer = false,
  onCloseDrawer,
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
  className?: string;
  isMobileDrawer?: boolean;
  onCloseDrawer?: () => void;
}) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const popularSubjects = isBn ? POPULAR_SUBJECTS_BN : POPULAR_SUBJECTS_EN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
    if (isMobileDrawer) {
      onCloseDrawer?.();
    }
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
  if (value.modeFilter) {
    const modeLabel =
      value.modeFilter === 'in_person'
        ? dict.tutor?.modeInPerson || 'In-person'
        : value.modeFilter === 'online'
          ? dict.tutor?.modeOnline || 'Online'
          : value.modeFilter === 'hybrid'
            ? dict.tutor?.modeHybrid || 'Hybrid'
            : value.modeFilter;
    activeChips.push({ key: 'modeFilter', label: modeLabel });
  }
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
  if (value.districtCode) {
    const distName =
      districtOptions.find((d) => d.id === value.districtCode)?.label ?? value.districtCode;
    activeChips.push({ key: 'districtCode', label: distName });
  }
  if (value.radiusKm) {
    activeChips.push({ key: 'radiusKm', label: `${value.radiusKm} km` });
  }

  const activeCount = activeChips.length;

  return (
    <div
      className={`rounded-2xl border border-border bg-card/95 text-foreground shadow-xs transition-colors backdrop-blur-xl ${
        isMobileDrawer ? 'p-4 sm:p-5' : 'p-5'
      } ${className}`}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        data-testid="discovery-filters-form"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground">
                {isBn ? 'ফিল্টারসমূহ' : 'Filters'}
              </span>
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black">
                  {activeCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onReset}
                data-testid="reset-filters-button"
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 gap-1"
                title={dict.discovery?.resetFilters || 'Reset'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isBn ? 'রিসেট' : 'Reset'}</span>
              </Button>
            )}
            {isMobileDrawer && onCloseDrawer && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onCloseDrawer}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 2. Subject & Class */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-primary" />
            <span>{isBn ? 'বিষয় ও শ্রেণি' : 'Subject & Class'}</span>
          </label>
          <div className="flex flex-col gap-2">
            <Select
              value={value.subjectId || 'all'}
              onValueChange={(val) => onChange({ subjectId: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
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

            <Select
              value={value.educationLevelId || 'all'}
              onValueChange={(val) => onChange({ educationLevelId: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
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
        </div>

        {/* 3. Teaching Mode & Curriculum */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-primary" />
            <span>{isBn ? 'পদ্ধতি ও শিক্ষাক্রম' : 'Mode & Curriculum'}</span>
          </label>
          <div className="flex flex-col gap-2">
            <Select
              value={value.modeFilter || 'all'}
              onValueChange={(val) => onChange({ modeFilter: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
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
                className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
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
          </div>
        </div>

        {/* 4. District & Distance */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            <span>{isBn ? 'এলাকা ও দূরত্ব' : 'District & Radius'}</span>
          </label>
          <div className="flex flex-col gap-2">
            <Select
              value={value.districtCode || 'all'}
              onValueChange={(val) => onChange({ districtCode: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
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

            <div className="flex items-center gap-2">
              <Select
                value={value.radiusKm || 'all'}
                onValueChange={(val) => onChange({ radiusKm: val === 'all' ? '' : val })}
              >
                <SelectTrigger
                  className="w-full rounded-xl bg-background/60 border-border text-xs h-9.5"
                  data-testid="radius-select"
                  aria-label={isBn ? 'দূরত্ব ব্যাসার্ধ' : 'Distance radius'}
                >
                  <SelectValue placeholder={isBn ? 'দূরত্ব: যেকোনো' : 'Radius: Any'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'দূরত্ব: যেকোনো' : 'Radius: Any'}</SelectItem>
                  {RADIUS_OPTIONS.map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {km} km {isBn ? 'ব্যাসার্ধ' : 'radius'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!hasLocation && value.radiusKm && (
              <span
                className="block text-[11px] text-warning-soft-foreground bg-warning/10 px-2.5 py-1 rounded-lg"
                data-testid="radius-needs-location"
              >
                ⚠️{' '}
                {isBn
                  ? 'সঠিক দূরত্বের জন্য লোকেশন শেয়ার করুন'
                  : 'Share location for accurate distance'}
              </span>
            )}
          </div>
        </div>

        {/* 5. Budget / Hourly Fee */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Banknote className="w-3 h-3 text-primary" />
            <span>{isBn ? 'ঘণ্টাপ্রতি ফি (৳)' : 'Hourly Fee (৳)'}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                ৳
              </span>
              <Input
                type="number"
                min={0}
                placeholder={dict.discovery?.minPrice || 'Min'}
                value={value.minPrice}
                onChange={(e) => onChange({ minPrice: e.target.value })}
                className="h-9 pl-7 text-xs rounded-xl bg-background/60"
                data-testid="min-price-input"
                aria-label={isBn ? 'সর্বনিম্ন ফি' : 'Minimum fee'}
              />
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                ৳
              </span>
              <Input
                type="number"
                min={0}
                placeholder={dict.discovery?.maxPrice || 'Max'}
                value={value.maxPrice}
                onChange={(e) => onChange({ maxPrice: e.target.value })}
                className="h-9 pl-7 text-xs rounded-xl bg-background/60"
                data-testid="max-price-input"
                aria-label={isBn ? 'সর্বোচ্চ ফি' : 'Maximum fee'}
              />
            </div>
          </div>
          {/* Quick price chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onChange({ minPrice: '', maxPrice: '500' })}
              className={`text-[10px] px-2 py-0.5 rounded-full border border-border transition-colors ${
                value.maxPrice === '500' && !value.minPrice
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent font-bold shadow-xs'
                  : 'bg-background/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              &lt; ৳৫০০
            </button>
            <button
              type="button"
              onClick={() => onChange({ minPrice: '500', maxPrice: '1000' })}
              className={`text-[10px] px-2 py-0.5 rounded-full border border-border transition-colors ${
                value.minPrice === '500' && value.maxPrice === '1000'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent font-bold shadow-xs'
                  : 'bg-background/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              ৳৫০০ - ১০০০
            </button>
            <button
              type="button"
              onClick={() => onChange({ minPrice: '1000', maxPrice: '' })}
              className={`text-[10px] px-2 py-0.5 rounded-full border border-border transition-colors ${
                value.minPrice === '1000' && !value.maxPrice
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent font-bold shadow-xs'
                  : 'bg-background/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              &gt; ৳১০০০
            </button>
          </div>
        </div>

        {/* 6. Experience & Weekday */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" />
            <span>{isBn ? 'অভিজ্ঞতা ও দিন' : 'Experience & Day'}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                {isBn ? 'ন্যূনতম অভিজ্ঞতা (বছর)' : 'Min Exp (Years)'}
              </span>
              <Input
                type="number"
                min={0}
                max={60}
                placeholder="0"
                value={value.minExperience}
                onChange={(e) => onChange({ minExperience: e.target.value })}
                className="h-9 text-xs rounded-xl bg-background/60"
                data-testid="min-experience-input"
                aria-label={isBn ? 'সর্বনিম্ন অভিজ্ঞতা' : 'Minimum experience'}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">
                {isBn ? 'উপলব্ধতার দিন' : 'Available Day'}
              </span>
              <Select
                value={value.availableWeekday || 'all'}
                onValueChange={(val) => onChange({ availableWeekday: val === 'all' ? '' : val })}
              >
                <SelectTrigger
                  className="w-full rounded-xl bg-background/60 border-border text-xs h-9"
                  data-testid="weekday-select"
                  aria-label={isBn ? 'উপলব্ধতার দিন' : 'Availability day'}
                >
                  <SelectValue placeholder={isBn ? 'যেকোনো' : 'Any'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'যেকোনো দিন' : 'Any Day'}</SelectItem>
                  {Object.entries(WEEKDAY_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {isBn ? label.bn : label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            data-testid="apply-filters-button"
            className="w-full rounded-xl font-extrabold text-xs gap-1.5 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/20 hover:shadow-xs transition-all duration-150 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>
              {dict.discovery?.applyFilters || (isBn ? 'ফিল্টার প্রয়োগ করুন' : 'Apply Filters')}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
