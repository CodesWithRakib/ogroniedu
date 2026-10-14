'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  GraduationCap,
  BookOpen,
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';
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
          { id: '7', nameEn: 'University Admission Prep', nameBn: 'বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি' },
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
    <div className="w-full space-y-2.5">
      {/* Top Tab Switcher: Direct Filter vs Quick Search */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('filter')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'filter'
              ? 'bg-[#0df5c4] text-[#042426] shadow-[0_0_15px_rgba(13,245,196,0.35)]'
              : 'text-slate-300 hover:text-white bg-[#062026]/80 hover:bg-[#062026] border border-teal-500/20'
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>{isBn ? 'শ্রেণি ও বিষয় দিয়ে খুঁজুন' : 'Filter by Class & Subject'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-[#0df5c4] text-[#042426] shadow-[0_0_15px_rgba(13,245,196,0.35)]'
              : 'text-slate-300 hover:text-white bg-[#062026]/80 hover:bg-[#062026] border border-teal-500/20'
          }`}
        >
          <Search className="h-3 w-3" />
          <span>{isBn ? 'নাম বা কি-ওয়ার্ড দিয়ে খুঁজুন' : 'Search by Name / Keyword'}</span>
        </button>
      </div>

      {/* Main Glass Search Card */}
      <form onSubmit={handleSubmit} className="w-full">
        {activeTab === 'filter' ? (
          /* ========================================================
           * MODE 1: DIRECT FILTER (Class + Subject + Location)
           * ======================================================== */
          <div className="rounded-2xl lg:rounded-full bg-[#061f26]/95 border border-[#0df5c4]/45 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(13,245,196,0.15)] p-2 lg:p-1.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 transition-all">
            {/* Segment 1: Class / Education Level */}
            <div className="relative flex-1 px-3 py-1.5 rounded-xl lg:rounded-l-full hover:bg-white/5 transition-colors border-b lg:border-b-0 lg:border-r border-teal-500/20">
              <div className="flex items-center gap-1 text-[9px] font-bold text-teal-300 uppercase tracking-wider mb-0.5">
                <GraduationCap className="h-3 w-3 text-[#0df5c4]" />
                <span>{isBn ? 'শ্রেণি / মাধ্যম' : 'Class / Level'}</span>
              </div>
              <div className="relative flex items-center">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full appearance-none bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-5"
                >
                  <option value="" className="bg-[#081b22] text-slate-300">
                    {isBn ? 'সকল শ্রেণি ও মাধ্যম' : 'All Classes & Curriculums'}
                  </option>
                  {levels.map((lvl) => (
                    <option key={String(lvl.id)} value={String(lvl.id)} className="bg-[#081b22] text-slate-200">
                      {String(isBn ? lvl.nameBn || lvl.nameEn : lvl.nameEn)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
            </div>

            {/* Segment 2: Subject */}
            <div className="relative flex-1 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors border-b lg:border-b-0 lg:border-r border-teal-500/20">
              <div className="flex items-center gap-1 text-[9px] font-bold text-teal-300 uppercase tracking-wider mb-0.5">
                <BookOpen className="h-3 w-3 text-[#0df5c4]" />
                <span>{isBn ? 'পড়ার বিষয়' : 'Subject'}</span>
              </div>
              <div className="relative flex items-center">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full appearance-none bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-5"
                >
                  <option value="" className="bg-[#081b22] text-slate-300">
                    {isBn ? 'সকল বিষয়' : 'All Subjects'}
                  </option>
                  {subjects.map((sub) => (
                    <option key={String(sub.id)} value={String(sub.id)} className="bg-[#081b22] text-slate-200">
                      {String(isBn ? sub.nameBn || sub.nameEn : sub.nameEn)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
            </div>

            {/* Segment 3: Location / Tuition Mode */}
            <div className="relative flex-1 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-1 text-[9px] font-bold text-teal-300 uppercase tracking-wider mb-0.5">
                <MapPin className="h-3 w-3 text-[#0df5c4]" />
                <span>{isBn ? 'এলাকা বা মাধ্যম' : 'Location / Mode'}</span>
              </div>
              <div className="relative flex items-center">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full appearance-none bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-5"
                >
                  <option value="" className="bg-[#081b22] text-slate-300">
                    {isBn ? 'সারাদেশে বা অনলাইন' : 'Anywhere / Online'}
                  </option>
                  {locations.map((loc) => (
                    <option key={loc.code} value={loc.code} className="bg-[#081b22] text-slate-200">
                      {isBn ? loc.nameBn : loc.nameEn}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl lg:rounded-full bg-gradient-to-r from-[#0df5c4] to-[#00f2c3] hover:from-[#00f2c3] hover:to-[#0df5c4] text-[#042426] font-extrabold text-xs px-6 py-3 shadow-[0_0_20px_rgba(13,245,196,0.45)] whitespace-nowrap cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95"
            >
              <Search className="h-4 w-4 stroke-[2.5]" />
              <span>{isBn ? 'শিক্ষক খুঁজুন' : 'Find Tutors'}</span>
            </button>
          </div>
        ) : (
          /* ========================================================
           * MODE 2: QUICK KEYWORD SEARCH (Name, University, Topic)
           * ======================================================== */
          <div className="rounded-2xl lg:rounded-full bg-[#061f26]/95 border border-[#0df5c4]/45 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(13,245,196,0.15)] p-2 lg:p-1.5 flex flex-col lg:flex-row items-center justify-between gap-2 transition-all">
            <div className="flex items-center flex-1 w-full px-3 py-1.5">
              <Search className="h-4 w-4 text-[#0df5c4] mr-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBn
                    ? 'শিক্ষকের নাম, বিশ্ববিদ্যালয় বা বিশেষ কি-ওয়ার্ড লিখে খুঁজুন (যেমন: বুয়েট, আয়েশা)...'
                    : 'Search by tutor name, university, or keyword (e.g. BUET, Ayesha)...'
                }
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 rounded-xl lg:rounded-full bg-gradient-to-r from-[#0df5c4] to-[#00f2c3] hover:from-[#00f2c3] hover:to-[#0df5c4] text-[#042426] font-extrabold text-xs px-7 py-3 shadow-[0_0_20px_rgba(13,245,196,0.45)] whitespace-nowrap cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95"
            >
              <Search className="h-4 w-4 stroke-[2.5]" />
              <span>{isBn ? 'অনুসন্ধান' : 'Search'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Popular Tags Row */}
      <div className="flex items-center gap-1.5 text-xs pt-0.5 overflow-x-auto lg:overflow-visible flex-nowrap scrollbar-none">
        <span className="font-semibold text-slate-400 shrink-0 mr-0.5 text-xs flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-teal-400" />
          <span>{isBn ? 'জনপ্রিয়:' : 'Popular:'}</span>
        </span>
        {popularTags.map((tag) => (
          <button
            key={tag.query}
            type="button"
            onClick={() => handleTagClick(tag.query)}
            className="rounded-full border border-teal-500/30 bg-[#07242a]/80 px-2.5 py-0.5 text-[11px] font-medium text-teal-300 hover:border-[#0df5c4] hover:bg-[#0df5c4] hover:text-[#042426] transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
}
