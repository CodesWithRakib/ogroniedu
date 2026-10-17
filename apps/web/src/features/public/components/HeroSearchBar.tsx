'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, GraduationCap, BookOpen, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
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

  // Mode: 'filter' (Class + Subject + Location) or 'search' (Direct free-text keyword search)
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
          { code: 'online', nameEn: 'All Bangladesh (Online)', nameBn: 'সারাদেশে (অনলাইন)' },
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

  const popularTags = [
    { label: isBn ? 'পদার্থবিজ্ঞান' : 'Physics', query: 'Physics' },
    { label: isBn ? 'গণিত' : 'Mathematics', query: 'Mathematics' },
    { label: isBn ? 'ইংরেজি' : 'English', query: 'English' },
    { label: isBn ? 'রসায়ন' : 'Chemistry', query: 'Chemistry' },
    { label: isBn ? 'আইসিটি' : 'ICT', query: 'ICT' },
    { label: isBn ? 'জীববিজ্ঞান' : 'Biology', query: 'Biology' },
    { label: isBn ? 'বাংলা' : 'Bangla', query: 'Bangla' },
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
      if (selectedLocation) params.set('districtCode', selectedLocation);
    }

    const queryStr = params.toString();
    router.push(`/${locale}/tutors${queryStr ? `?${queryStr}` : ''}`);
  }

  function handleTagClick(query: string) {
    router.push(`/${locale}/tutors?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="w-full space-y-3">
      {/* Top Tab Switcher: Direct Filter vs Quick Search */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          data-testid="hero-tab-filter"
          variant={activeTab === 'filter' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('filter')}
          className="rounded-full text-xs font-semibold gap-1.5 h-8 px-4 transition-all"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{isBn ? 'শ্রেণি ও বিষয় দিয়ে খুঁজুন' : 'Filter by Class & Subject'}</span>
        </Button>

        <Button
          type="button"
          data-testid="hero-tab-search"
          variant={activeTab === 'search' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('search')}
          className="rounded-full text-xs font-semibold gap-1.5 h-8 px-4 transition-all"
        >
          <Search className="h-3.5 w-3.5" />
          <span>{isBn ? 'নাম বা কি-ওয়ার্ড দিয়ে খুঁজুন' : 'Search by Name / Keyword'}</span>
        </Button>
      </div>

      {/* Main Search Card */}
      <form onSubmit={handleSubmit} className="w-full">
        {activeTab === 'filter' ? (
          /* ========================================================
           * MODE 1: DIRECT FILTER (Class + Subject + Location)
           * ======================================================== */
          <div className="rounded-2xl lg:rounded-full bg-card border border-border/80 shadow-xs p-2 lg:p-1.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 transition-all">
            {/* Segment 1: Class / Education Level */}
            <div className="flex-1 px-3.5 py-1.5 rounded-xl lg:rounded-l-full hover:bg-muted/40 transition-colors border-b lg:border-b-0 lg:border-r border-border/60">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>{isBn ? 'শ্রেণি / মাধ্যম' : 'Class / Level'}</span>
              </div>
              <Select
                value={selectedLevel || 'all'}
                onValueChange={(val) => setSelectedLevel(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 h-7 text-xs font-semibold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 gap-1"
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
            <div className="flex-1 px-3.5 py-1.5 rounded-xl hover:bg-muted/40 transition-colors border-b lg:border-b-0 lg:border-r border-border/60">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>{isBn ? 'পড়ার বিষয়' : 'Subject'}</span>
              </div>
              <Select
                value={selectedSubject || 'all'}
                onValueChange={(val) => setSelectedSubject(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 h-7 text-xs font-semibold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 gap-1"
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

            {/* Segment 3: Location / Tuition Mode */}
            <div className="flex-1 px-3.5 py-1.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{isBn ? 'এলাকা বা মাধ্যম' : 'Location / Mode'}</span>
              </div>
              <Select
                value={selectedLocation || 'all'}
                onValueChange={(val) => setSelectedLocation(val === 'all' ? '' : val)}
              >
                <SelectTrigger
                  className="w-full border-0 bg-transparent p-0 h-7 text-xs font-semibold text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 gap-1"
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

            {/* Action Button */}
            <Button
              type="submit"
              size="lg"
              className="rounded-xl lg:rounded-full px-7 py-3 h-auto text-xs font-semibold gap-2 shadow-xs shrink-0"
            >
              <Search className="h-4 w-4 stroke-[2.5]" />
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
            </Button>
          </div>
        ) : (
          /* ========================================================
           * MODE 2: QUICK KEYWORD SEARCH (Name, University, Topic)
           * ======================================================== */
          <div className="rounded-2xl lg:rounded-full bg-card border border-border/80 shadow-xs p-2 lg:p-1.5 flex flex-col lg:flex-row items-center justify-between gap-2 transition-all">
            <div className="flex items-center flex-1 w-full px-3 py-1.5">
              <Search className="h-4 w-4 text-primary mr-2.5 shrink-0" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBn
                    ? 'শিক্ষকের নাম, বিশ্ববিদ্যালয় বা বিশেষ কি-ওয়ার্ড লিখে খুঁজুন (যেমন: বুয়েট, আয়েশা)...'
                    : 'Search by tutor name, university, or keyword (e.g. BUET, Ayesha)...'
                }
                className="w-full border-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-0 shadow-none h-8 p-0"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full lg:w-auto rounded-xl lg:rounded-full px-7 py-3 h-auto text-xs font-semibold gap-2 shadow-xs shrink-0"
            >
              <Search className="h-4 w-4 stroke-[2.5]" />
              <span>{isBn ? 'অনুসন্ধান' : 'Search'}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Popular Tags Row */}
      <div className="flex items-center gap-1.5 text-xs pt-0.5 overflow-x-auto lg:overflow-visible flex-nowrap scrollbar-none">
        <span className="font-semibold text-muted-foreground shrink-0 mr-1 text-xs flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>{isBn ? 'জনপ্রিয়:' : 'Popular:'}</span>
        </span>
        {popularTags.map((tag) => (
          <Button
            key={tag.query}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTagClick(tag.query)}
            className="rounded-full h-6 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors whitespace-nowrap shrink-0"
          >
            {tag.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
