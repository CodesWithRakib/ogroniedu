'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  GraduationCap,
  BookOpen,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useGetEducationLevelsQuery,
  useGetSubjectsQuery,
  useGetLocationsQuery,
} from '@/store/services/taxonomy-api';

interface HeroSearchBarProps {
  locale: Locale;
}

export function HeroSearchBar({ locale }: HeroSearchBarProps) {
  const router = useRouter();
  const isBn = locale === 'bn';

  // Mode: 'filter' (Class + Subject + Location) or 'search' (Free-text search)
  const [activeTab, setActiveTab] = useState<'filter' | 'search'>('filter');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // API Taxonomy Data
  const { data: levelsData } = useGetEducationLevelsQuery();
  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: locationsData } = useGetLocationsQuery();

  const apiLevels = Array.isArray(levelsData?.data) ? levelsData.data : [];
  const apiSubjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];
  const apiLocations = Array.isArray(locationsData?.data) ? locationsData.data : [];

  // Fallback data when API is offline or unseeded
  const levels =
    apiLevels.length > 0
      ? apiLevels
      : [
          { id: '1', nameEn: 'Class 1-5 (Primary)', nameBn: 'ক্লাস ১-৫ (প্রাথমিক)' },
          { id: '2', nameEn: 'Class 6-8 (Junior)', nameBn: 'ক্লাস ৬-৮ (নিম্ন মাধ্যমিক)' },
          { id: '3', nameEn: 'Class 9-10 (SSC)', nameBn: 'ক্লাস ৯-১০ (এসএসসি)' },
          { id: '4', nameEn: 'Class 11-12 (HSC)', nameBn: 'একাদশ-দ্বাদশ (এইচএসসি)' },
          { id: '5', nameEn: 'O-Level (English Medium)', nameBn: 'ও-লেভেল (ইংরেজি মাধ্যম)' },
          { id: '6', nameEn: 'A-Level (English Medium)', nameBn: 'এ-লেভেল (ইংরেজি মাধ্যম)' },
          {
            id: '7',
            nameEn: 'University Admission Prep',
            nameBn: 'বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি',
          },
          { id: '8', nameEn: 'Madrasah (Dakhil/Alim)', nameBn: 'মাদ্রাসা (দাখিল/আলিম)' },
        ];

  const subjects =
    apiSubjects.length > 0
      ? apiSubjects
      : [
          { id: 'math', nameEn: 'General Mathematics', nameBn: 'সাধারণ গণিত' },
          { id: 'higher-math', nameEn: 'Higher Mathematics', nameBn: 'উচ্চতর গণিত' },
          { id: 'physics', nameEn: 'Physics', nameBn: 'পদার্থবিজ্ঞান' },
          { id: 'chemistry', nameEn: 'Chemistry', nameBn: 'রসায়ন' },
          { id: 'biology', nameEn: 'Biology', nameBn: 'জীববিজ্ঞান' },
          { id: 'english', nameEn: 'English Language', nameBn: 'ইংরেজি' },
          { id: 'ict', nameEn: 'ICT', nameBn: 'আইসিটি' },
          { id: 'bangla', nameEn: 'Bangla', nameBn: 'বাংলা' },
          { id: 'accounting', nameEn: 'Accounting & Finance', nameBn: 'হিসাববিজ্ঞান' },
        ];

  const locations =
    apiLocations.length > 0
      ? apiLocations
      : [
          { code: 'online', nameEn: 'All Bangladesh (Online)', nameBn: 'সারাদেশে বা অনলাইন' },
          { code: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
          { code: 'chittagong', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
          { code: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
          { code: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
          { code: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
          { code: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
          { code: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
          { code: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
          { code: 'comilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা' },
        ];

  const curriculumPills = [
    { id: '', labelEn: 'All Mediums', labelBn: 'সকল মাধ্যম' },
    { id: 'bangla', labelEn: 'Bangla Medium', labelBn: 'বাংলা মাধ্যম' },
    { id: 'english', labelEn: 'English Version', labelBn: 'ইংলিশ ভার্সন' },
    { id: 'o-level', labelEn: 'English Medium (O/A)', labelBn: 'ইংলিশ মিডিয়াম' },
    { id: 'admission', labelEn: 'Admission Prep', labelBn: 'ভর্তি পরীক্ষা' },
    { id: 'madrasah', labelEn: 'Madrasah', labelBn: 'মাদ্রাসা' },
  ];

  const popularTags = [
    { label: isBn ? 'পদার্থবিজ্ঞান' : 'Physics', query: 'Physics' },
    { label: isBn ? 'গণিত' : 'Mathematics', query: 'Mathematics' },
    { label: isBn ? 'ইংরেজি' : 'English', query: 'English' },
    { label: isBn ? 'রসায়ন' : 'Chemistry', query: 'Chemistry' },
    { label: isBn ? 'আইসিটি' : 'ICT', query: 'ICT' },
    { label: isBn ? 'জীববিজ্ঞান' : 'Biology', query: 'Biology' },
    { label: isBn ? 'উচ্চতর গণিত' : 'Higher Math', query: 'Higher Math' },
  ];

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const params = new URLSearchParams();

    if (activeTab === 'search') {
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
    } else {
      if (selectedLevel) params.set('educationLevelId', selectedLevel);
      if (selectedSubject) params.set('subjectId', selectedSubject);
      if (selectedLocation && selectedLocation !== 'online')
        params.set('districtCode', selectedLocation);
    }

    const queryStr = params.toString();
    router.push(`/${locale}/tutors${queryStr ? `?${queryStr}` : ''}`);
  }

  function handleCurriculumClick(id: string) {
    if (!id) {
      setSelectedLevel('');
      return;
    }
    const matched = levels.find(
      (l) => String(l.id).toLowerCase().includes(id) || String(l.nameEn).toLowerCase().includes(id),
    );
    if (matched) {
      setSelectedLevel(String(matched.id));
    } else {
      router.push(`/${locale}/tutors?q=${encodeURIComponent(id)}`);
    }
  }

  function handleTagClick(query: string) {
    router.push(`/${locale}/tutors?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="w-full space-y-3">
      {/* Search Header Row: Curriculum Quick Chips + Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Curriculum Horizontal Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar scrollbar-none text-xs">
          {curriculumPills.map((pill) => {
            const isSelected =
              (!pill.id && !selectedLevel) || (pill.id && selectedLevel.includes(pill.id));
            return (
              <button
                key={pill.id || 'all'}
                type="button"
                onClick={() => handleCurriculumClick(pill.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs scale-102 ring-2 ring-primary/20'
                    : 'bg-card/90 border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                {isBn ? pill.labelBn : pill.labelEn}
              </button>
            );
          })}
        </div>

        {/* Compact Mode Switcher */}
        <div className="flex items-center self-start sm:self-auto p-1 bg-surface/90 rounded-xl border border-border/80 shrink-0">
          <button
            type="button"
            data-testid="hero-tab-filter"
            onClick={() => setActiveTab('filter')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'filter'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>{isBn ? 'ফিল্টার সার্চ' : 'Filters'}</span>
          </button>
          <button
            type="button"
            data-testid="hero-tab-search"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>{isBn ? 'নাম / কি-ওয়ার্ড' : 'Keyword'}</span>
          </button>
        </div>
      </div>

      {/* Main Glassmorphic Search Bar Capsule */}
      <form onSubmit={handleSubmit} className="w-full">
        {activeTab === 'filter' ? (
          /* ========================================================
           * MODE 1: STRUCTURED FILTER CAPSULE
           * ======================================================== */
          <div className="rounded-3xl lg:rounded-full bg-card/95 border border-border/80 shadow-card hover:border-primary/40 hover:shadow-popover p-2 lg:p-2 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 transition-all duration-300">
            {/* Segment 1: Education Level / Class */}
            <div className="flex-1 px-4 py-2 rounded-2xl lg:rounded-l-full hover:bg-surface-hover/70 transition-colors border-b lg:border-b-0 lg:border-r border-border/70">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{isBn ? 'শ্রেণি / মাধ্যম' : 'Class / Level'}</span>
              </div>
              <Select
                value={selectedLevel || 'all'}
                onValueChange={(val) => setSelectedLevel(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 min-h-[34px] text-xs font-extrabold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 rounded-md gap-1"
                  aria-label={isBn ? 'শ্রেণি / মাধ্যম নির্বাচন করুন' : 'Select Class or Level'}
                >
                  <SelectValue
                    placeholder={isBn ? 'সকল শ্রেণি ও মাধ্যম' : 'All Classes & Curriculums'}
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-64 rounded-2xl border-border bg-popover shadow-popover"
                >
                  <SelectItem value="all">
                    {isBn ? 'সকল শ্রেণি ও মাধ্যম' : 'All Classes & Curriculums'}
                  </SelectItem>
                  {levels.map((lvl) => (
                    <SelectItem key={String(lvl.id)} value={String(lvl.id)}>
                      {String(isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Segment 2: Subject */}
            <div className="flex-1 px-4 py-2 rounded-2xl hover:bg-surface-hover/70 transition-colors border-b lg:border-b-0 lg:border-r border-border/70">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{isBn ? 'পড়ার বিষয়' : 'Subject'}</span>
              </div>
              <Select
                value={selectedSubject || 'all'}
                onValueChange={(val) => setSelectedSubject(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 min-h-[34px] text-xs font-extrabold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 rounded-md gap-1"
                  aria-label={isBn ? 'পড়ার বিষয় নির্বাচন করুন' : 'Select Subject'}
                >
                  <SelectValue placeholder={isBn ? 'সকল বিষয়' : 'All Subjects'} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-64 rounded-2xl border-border bg-popover shadow-popover"
                >
                  <SelectItem value="all">{isBn ? 'সকল বিষয়' : 'All Subjects'}</SelectItem>
                  {subjects.map((sub) => (
                    <SelectItem key={String(sub.id)} value={String(sub.id)}>
                      {String(isBn ? sub.nameBn || sub.nameEn : sub.nameEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Segment 3: Location / Medium */}
            <div className="flex-1 px-4 py-2 rounded-2xl hover:bg-surface-hover/70 transition-colors">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>{isBn ? 'এলাকা বা মাধ্যম' : 'Location / Mode'}</span>
              </div>
              <Select
                value={selectedLocation || 'all'}
                onValueChange={(val) => setSelectedLocation(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 min-h-[34px] text-xs font-extrabold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 rounded-md gap-1"
                  aria-label={isBn ? 'এলাকা বা মাধ্যম নির্বাচন করুন' : 'Select Location or Mode'}
                >
                  <SelectValue placeholder={isBn ? 'সারাদেশে বা অনলাইন' : 'Anywhere / Online'} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="max-h-64 rounded-2xl border-border bg-popover shadow-popover"
                >
                  <SelectItem value="all">
                    {isBn ? 'সারাদেশে বা অনলাইন' : 'Anywhere / Online'}
                  </SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {isBn ? loc.nameBn : loc.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full lg:w-auto rounded-2xl lg:rounded-full px-8 py-3.5 h-auto text-xs font-black gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
            >
              <Search className="h-4 w-4 stroke-[2.8]" aria-hidden="true" />
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
              <ArrowRight
                className="h-3.5 w-3.5 stroke-[2.5] transition-transform group-hover:translate-x-0.5 hidden sm:inline"
                aria-hidden="true"
              />
            </Button>
          </div>
        ) : (
          /* ========================================================
           * MODE 2: DIRECT KEYWORD SEARCH CAPSULE
           * ======================================================== */
          <div className="rounded-3xl lg:rounded-full bg-card/95 border border-border/80 shadow-card hover:border-primary/40 p-2 flex flex-col lg:flex-row items-center justify-between gap-2 transition-all duration-300">
            <div className="flex items-center flex-1 w-full px-4 py-2">
              <Search className="h-4 w-4 text-primary mr-3 shrink-0" aria-hidden="true" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBn
                    ? 'শিক্ষকের নাম, বিশ্ববিদ্যালয় বা বিশেষ কি-ওয়ার্ড লিখে খুঁজুন (যেমন: বুয়েট, আয়শা, উচ্চতর গণিত)...'
                    : 'Search by tutor name, institution or subject (e.g. BUET, Ayesha, Physics)...'
                }
                className="w-full border-0 bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0 shadow-none h-8 p-0"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full lg:w-auto rounded-2xl lg:rounded-full px-8 py-3.5 h-auto text-xs font-black gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 shrink-0 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Search className="h-4 w-4 stroke-[2.8]" aria-hidden="true" />
              <span>{isBn ? 'অনুসন্ধান' : 'Search'}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Popular Subject Quick Pills */}
      <div className="flex items-center gap-1.5 text-xs pt-0.5 overflow-x-auto lg:overflow-visible flex-nowrap no-scrollbar scrollbar-none">
        <span className="font-bold text-muted-foreground shrink-0 mr-1 text-xs flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400" aria-hidden="true" />
          <span>{isBn ? 'জনপ্রিয় বিষয়:' : 'Popular Subjects:'}</span>
        </span>
        {popularTags.map((tag) => (
          <button
            key={tag.query}
            type="button"
            onClick={() => handleTagClick(tag.query)}
            className="rounded-full px-3 py-1 text-[11px] font-bold bg-primary-soft text-primary hover:bg-primary hover:text-white border border-primary/15 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
}
