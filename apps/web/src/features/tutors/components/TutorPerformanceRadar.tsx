'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';

interface TutorPerformanceRadarProps {
  locale: Locale;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  completionRate?: number;
  profileStrength?: number;
}

export function TutorPerformanceRadar({
  locale,
  rating = 4.9,
  reviewCount = 18,
  responseRate = 98,
  completionRate = 100,
  profileStrength = 95,
}: TutorPerformanceRadarProps) {
  const isBn = locale === 'bn';

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
      data-testid="tutor-performance-radar"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {isBn ? 'গুণমান ও রেটিং' : 'Quality & Reputation'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isBn ? 'শিক্ষক পারফরম্যান্স রেডার' : 'Tutor Performance Radar'}
            </h3>
          </div>
        </div>

        <Link
          href={withLocale('/dashboard/tutor', locale)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>{isBn ? 'অ্যানালিটিক্স' : 'Analytics'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid of 4 Key Performance Indicators */}
      <div className="my-4 grid grid-cols-2 gap-3">
        {/* Rating Card */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isBn ? 'শিক্ষার্থী মূল্যায়ন' : 'Student Rating'}
            </span>
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          <div className="text-xl font-black text-foreground mt-1 flex items-baseline gap-1">
            <span>{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn
              ? `${formatLocalizedNumber(reviewCount, locale)}টি যাচাইকৃত রিভিউ`
              : `${reviewCount} verified reviews`}
          </p>
        </div>

        {/* Response Rate Card */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isBn ? 'সাড়া দেওয়ার হার' : 'Response Rate'}
            </span>
            <Zap className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-foreground mt-1">
            {formatLocalizedNumber(responseRate, locale)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? 'গড় ১৫ মিনিটে উত্তর' : 'Avg < 15 min reply'}
          </p>
        </div>

        {/* Session Completion Rate */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isBn ? 'ক্লাস সম্পন্নতা' : 'Completion'}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-foreground mt-1">
            {formatLocalizedNumber(completionRate, locale)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? 'অন-টাইম উপস্থিতি' : 'On-time attendance'}
          </p>
        </div>

        {/* Profile Strength / Ranking */}
        <div className="p-3.5 rounded-xl bg-surface border border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {isBn ? 'প্রোফাইল স্কোর' : 'Profile Rank'}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-foreground mt-1">
            {formatLocalizedNumber(profileStrength, locale)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isBn ? 'সার্চ রেজাল্টে অগ্রাধিকার' : 'Priority search rank'}
          </p>
        </div>
      </div>

      {/* Footer advice */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground">
          {isBn
            ? 'উচ্চ রেটিং বজায় রাখলে সরাসরি অভিভাবক সার্চে সবার উপরে প্রদর্শন করা হয়'
            : 'Top rated tutors receive 3x more parent booking requests'}
        </span>
      </div>
    </div>
  );
}
