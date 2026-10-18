'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Video,
  BookOpen,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Award,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';

interface HeroTutorCardProps {
  locale: Locale;
}

export function HeroTutorCard({ locale }: HeroTutorCardProps) {
  const isBn = locale === 'bn';
  const [selectedTag, setSelectedTag] = useState<'buet' | 'du' | 'dmc' | 'iba'>('buet');

  const tutors = [
    {
      id: 'buet-ayesha',
      tag: 'buet' as const,
      institutionShort: isBn ? 'বুয়েট' : 'BUET',
      iconEmoji: '🎓',
      name: isBn ? 'আয়েশা রহমান' : 'Ayesha Rahman',
      institution: isBn ? 'বুয়েট • সিএসই বিভাগ' : 'BUET • CSE Graduate',
      rating: '4.9',
      reviewsCount: 120,
      subjects: isBn ? ['উচ্চতর গণিত', 'পদার্থবিজ্ঞান'] : ['Higher Math', 'Physics'],
      rate: isBn ? '৳ ৮০০' : '৳ 800',
      experience: isBn ? '৫+ বছর' : '5+ yrs',
      modes: isBn ? '১:১ ও অনলাইন' : '1:1 & Online',
      bio: isBn
        ? 'শিক্ষার্থীদের বেসিক ধারণা স্পষ্ট করে সহজ কৌশলে কঠিন গণিত ও পদার্থবিজ্ঞান বোঝানো আমার বিশেষত্ব।'
        : 'Passionate about simplifying complex concepts in Mathematics and Physics with real-world applications.',
      avatarPos: '0% 100%',
      verifiedType: isBn ? 'এনআইডি ও ডিগ্রি ভেরিফাইড' : 'NID & Degree Verified',
    },
    {
      id: 'du-tanvir',
      tag: 'du' as const,
      institutionShort: isBn ? 'ঢাবি' : 'DU',
      iconEmoji: '🏛️',
      name: isBn ? 'তানভীর আহমেদ' : 'Tanvir Ahmed',
      institution: isBn ? 'ঢাকা বিশ্ববিদ্যালয় • গণিত' : 'Dhaka University • Math',
      rating: '4.8',
      reviewsCount: 95,
      subjects: isBn ? ['সাধারণ গণিত', 'আইসিটি'] : ['General Math', 'ICT'],
      rate: isBn ? '৳ ৭৫০' : '৳ 750',
      experience: isBn ? '৪ বছর' : '4 yrs',
      modes: isBn ? '১:১ হোম ও অনলাইন' : '1:1 Home & Online',
      bio: isBn
        ? 'প্রতিটি অধ্যায়ের বোর্ড প্রশ্ন ও সৃজনশীল সমাধানের শর্টকাট টেকনিকসহ নিবিড় যত্ন নিই।'
        : 'Specialized in board exam shortcuts, creative problem solving, and in-depth personalized guidance.',
      avatarPos: '50% 100%',
      verifiedType: isBn ? 'এনআইডি ও সনদ ভেরিফাইড' : 'NID & Cert Verified',
    },
    {
      id: 'dmc-nusrat',
      tag: 'dmc' as const,
      institutionShort: isBn ? 'ডিএমসি' : 'DMC',
      iconEmoji: '🩺',
      name: isBn ? 'ডা. নুসরাত জাহান' : 'Dr. Nusrat Jahan',
      institution: isBn ? 'ঢাকা মেডিকেল কলেজ • এমবিবিএস' : 'Dhaka Medical • MBBS',
      rating: '5.0',
      reviewsCount: 140,
      subjects: isBn ? ['জীববিজ্ঞান', 'রসায়ন'] : ['Biology', 'Chemistry'],
      rate: isBn ? '৳ ৯০০' : '৳ 900',
      experience: isBn ? '৬ বছর' : '6 yrs',
      modes: isBn ? 'অনলাইন ও হোম' : 'Online & Home',
      bio: isBn
        ? 'মেডিকেল ভর্তি ও এইচএসসি পরীক্ষার জন্য বায়োলজির জটিল টার্ম সহজে আত্মস্থ করানোর বিশেষ মেথড।'
        : 'Proven mnemonic methods for mastering complex Biology & Chemistry concepts for Medical Admission & HSC.',
      avatarPos: '100% 100%',
      verifiedType: isBn ? 'বিএমডিসি ও এনআইডি ভেরিফাইড' : 'BMDC & NID Verified',
    },
    {
      id: 'iba-farhan',
      tag: 'iba' as const,
      institutionShort: isBn ? 'আইবিএ' : 'IBA',
      iconEmoji: '💼',
      name: isBn ? 'ফারহান করিম' : 'Farhan Karim',
      institution: isBn ? 'আইবিএ, ঢাবি • বিবিএ' : 'IBA, DU • BBA',
      rating: '4.9',
      reviewsCount: 88,
      subjects: isBn ? ['ইংরেজি ভাষা', 'অর্থনীতি'] : ['English', 'Economics'],
      rate: isBn ? '৳ ৮৫০' : '৳ 850',
      experience: isBn ? '৩+ বছর' : '3+ yrs',
      modes: isBn ? 'অনলাইন ১:১' : 'Online 1:1',
      bio: isBn
        ? 'আইবিএ ভর্তি প্রস্তুতি এবং ও/এ লেভেলের শিক্ষার্থীদের আন্তর্জাতিক মানের ইংরেজি দক্ষতা তৈরিতে অভিজ্ঞ।'
        : 'Expert mentor for IBA admission and O/A Levels English proficiency and critical reasoning.',
      avatarPos: '25% 100%',
      verifiedType: isBn ? 'এনআইডি ও আইবিএ ভেরিফাইড' : 'NID & IBA Verified',
    },
  ];

  const currentTutor = tutors.find((t) => t.tag === selectedTag) || tutors[0];

  return (
    <div className="relative select-none w-full max-w-[430px] flex flex-col items-center">
      {/* Interactive Institution Filter Tabs */}
      <div className="w-full mb-3 flex items-center justify-between gap-1.5 p-1 bg-surface/80 rounded-2xl border border-border/80 backdrop-blur-md">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-2 hidden xs:inline">
          {isBn ? 'শীর্ষ মেন্টর:' : 'Top Mentors:'}
        </span>
        <div className="flex items-center gap-1 flex-1 justify-end">
          {tutors.map((tutor) => {
            const isActive = tutor.tag === selectedTag;
            return (
              <button
                key={tutor.tag}
                type="button"
                onClick={() => setSelectedTag(tutor.tag)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs scale-102'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                }`}
                aria-pressed={isActive}
              >
                <span>{tutor.iconEmoji}</span>
                <span>{tutor.institutionShort}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Prestige Card Container */}
      <div className="relative w-full rounded-3xl border border-border/80 bg-card/95 p-5 sm:p-6 backdrop-blur-xl shadow-card hover:border-primary/40 hover:shadow-popover transition-all duration-300 text-left">
        {/* Top Floating Badge: Top 20% Verified Star */}
        <div className="absolute -top-3.5 right-5 z-10">
          <div className="flex items-center gap-1.5 rounded-full bg-card/95 border border-amber-200/80 py-1 px-3 shadow-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
            <span className="text-[11px] font-bold text-foreground">
              {isBn ? 'শীর্ষ ২০% নির্বাচিত শিক্ষক' : 'Top 20% Verified'}
            </span>
          </div>
        </div>

        {/* Top Header: Tutor Avatar, Verified Badge & Status */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3.5">
            {/* Tutor Avatar with Verified Badge */}
            <div className="relative shrink-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xs bg-surface">
                <div
                  className="w-full h-full bg-cover bg-center transition-all duration-300"
                  style={{
                    backgroundImage: "url('/images/avatars-group.jpg')",
                    backgroundPosition: currentTutor.avatarPos,
                    backgroundSize: '200% 200%',
                  }}
                />
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-card shadow-xs"
                title={currentTutor.verifiedType}
              >
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.8]" aria-hidden="true" />
              </div>
            </div>

            {/* Tutor Name & Credentials */}
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
                {currentTutor.name}
              </h4>
              <p className="text-xs text-primary font-bold truncate mt-0.5">
                {currentTutor.institution}
              </p>

              {/* Rating & Reviews */}
              <div
                className="flex items-center gap-1 mt-1 text-xs font-bold text-star tabular-nums"
                role="img"
                aria-label={`Rating ${currentTutor.rating} out of 5`}
              >
                <Star className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                <span className="text-foreground font-extrabold">{currentTutor.rating}</span>
                <span className="text-muted-foreground font-normal text-[11px]">
                  ({currentTutor.reviewsCount}+ {isBn ? 'রিভিউ' : 'reviews'})
                </span>
              </div>
            </div>
          </div>

          {/* Verification Pill */}
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-xs shrink-0">
            <ShieldCheck className="h-3 w-3 text-emerald-600 stroke-[2.5]" aria-hidden="true" />
            <span>{isBn ? 'ভেরিফাইড' : 'Verified'}</span>
          </div>
        </div>

        {/* Highlights Row: Session Type, Subjects & Experience */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t border-border/80 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{currentTutor.modes}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <BookOpen
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{currentTutor.subjects.join(' ও ')}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate tabular-nums">{currentTutor.experience}</span>
          </div>
        </div>

        {/* Bio Snippet */}
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[36px]">
          {currentTutor.bio}
        </p>

        {/* Pricing & CTA Button - With 100% CLEAR VISIBILITY (NO OVERLAP) */}
        <div className="mt-4 pt-3.5 border-t border-border/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'সম্মানী / ফি' : 'Hourly Rate'}
            </span>
            <div className="text-base sm:text-lg font-black text-foreground tabular-nums">
              {currentTutor.rate}
              <span className="text-xs font-normal text-muted-foreground">
                {isBn ? ' / ঘণ্টা' : ' / hr'}
              </span>
            </div>
          </div>

          <Link
            href={`/${locale}/tutors?q=${encodeURIComponent(currentTutor.tag)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-4 py-2.5 shadow-sm shadow-blue-500/20 transition-all duration-150 cursor-pointer active:scale-95 group"
          >
            <span>{isBn ? 'ট্রায়াল বুক করুন' : 'Book Trial'}</span>
            <ArrowRight
              className="h-3.5 w-3.5 stroke-[2.5] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      {/* Docked Escrow & Quality Guarantee Strip (Positioned Below Card with ZERO OVERLAP) */}
      <div className="w-full mt-3 flex items-center justify-between gap-2.5 rounded-2xl bg-card/90 border border-border/80 px-4 py-2.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.4]" aria-hidden="true" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-xs font-extrabold text-foreground truncate">
              {isBn ? '১০০% নিরাপদ এসক্রো গ্যারান্টি' : '100% Escrow Protection'}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium truncate">
              {isBn
                ? 'ক্লাস সন্তুষ্টি নিশ্চিত হলে পেমেন্ট ছাড়'
                : 'Funds released after class satisfaction'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
          {isBn ? 'মানি-ব্যাক' : 'Guaranteed'}
        </span>
      </div>
    </div>
  );
}
