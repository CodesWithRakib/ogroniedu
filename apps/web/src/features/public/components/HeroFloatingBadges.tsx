'use client';

import React from 'react';
import { GraduationCap, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export function QualifiedTutorsBadge({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  return (
    <div className="group rounded-xl sm:rounded-2xl border border-border bg-card p-2 sm:p-2.5 shadow-card flex items-center gap-2.5 hover:border-primary/40 transition-all select-none">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <GraduationCap className="h-4 w-4" />
      </div>
      <div className="text-left pr-1.5">
        <div className="text-[11px] sm:text-xs font-bold text-foreground flex items-center gap-1">
          <span>{isBn ? 'দক্ষ শিক্ষক' : 'Qualified Tutors'}</span>
          <CheckCircle2 className="h-2.5 w-2.5 text-primary stroke-[3]" />
        </div>
        <div className="text-[9px] sm:text-[9.5px] text-muted-foreground font-medium">
          {isBn ? 'যাচাইকৃত ও অভিজ্ঞ' : 'Verified & Experienced'}
        </div>
      </div>
    </div>
  );
}

export function SafeSecureBadge({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  return (
    <div className="group rounded-xl sm:rounded-2xl border border-border bg-card p-2 sm:p-2.5 shadow-card flex items-center gap-2.5 hover:border-primary/40 transition-all select-none">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div className="text-left pr-1.5">
        <div className="text-[11px] sm:text-xs font-bold text-foreground flex items-center gap-1">
          <span>{isBn ? 'নিরাপদ ও বিশ্বস্ত' : 'Safe & Secure'}</span>
          <CheckCircle2 className="h-2.5 w-2.5 text-primary stroke-[3]" />
        </div>
        <div className="text-[9px] sm:text-[9.5px] text-muted-foreground font-medium">
          {isBn ? 'ব্যাকগ্রাউন্ড ভেরিফাইড' : 'Background Checked'}
        </div>
      </div>
    </div>
  );
}

export function FlexibleLearningBadge({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  return (
    <div className="group rounded-xl sm:rounded-2xl border border-border bg-card p-2 sm:p-2.5 shadow-card flex items-center gap-2.5 hover:border-primary/40 transition-all select-none">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Clock className="h-4 w-4" />
      </div>
      <div className="text-left pr-1.5">
        <div className="text-[11px] sm:text-xs font-bold text-foreground flex items-center gap-1">
          <span>{isBn ? 'নমনীয় সময়' : 'Flexible Learning'}</span>
          <CheckCircle2 className="h-2.5 w-2.5 text-primary stroke-[3]" />
        </div>
        <div className="text-[9px] sm:text-[9.5px] text-muted-foreground font-medium">
          {isBn ? 'যেকোনো সময়' : 'Anytime, Anywhere'}
        </div>
      </div>
    </div>
  );
}
