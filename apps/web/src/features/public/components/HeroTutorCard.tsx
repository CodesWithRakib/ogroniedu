'use client';

import React from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, Video, BookOpen, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export function HeroTutorCard({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';

  return (
    <div className="relative select-none group w-full max-w-[390px]">
      {/* Subtle ambient shadow halo */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

      {/* Main Prestige Card Container */}
      <div className="relative rounded-3xl border border-border/80 bg-card/95 p-5 sm:p-6 backdrop-blur-xl shadow-card hover:border-primary/50 hover:shadow-popover transition-all duration-300 text-left">
        {/* Top Header: Tutor Avatar, Verified Badge & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* Tutor Avatar with Verified Badge */}
            <div className="relative shrink-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xs">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: "url('/images/avatars-group.jpg')",
                    backgroundPosition: '0% 100%',
                    backgroundSize: '200% 200%',
                  }}
                />
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-card shadow-xs"
                title={isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor'}
              >
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.8]" aria-hidden="true" />
              </div>
            </div>

            {/* Tutor Name & Credentials */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
                  {isBn ? 'আয়েশা রহমান' : 'Ayesha Rahman'}
                </h4>
              </div>
              <p className="text-xs text-primary font-bold truncate">
                {isBn ? 'বুয়েট • সিএসই বিভাগ' : 'BUET • CSE Graduate'}
              </p>

              {/* Rating & Reviews */}
              <div
                className="flex items-center gap-1 mt-1 text-xs font-bold text-star tabular-nums"
                role="img"
                aria-label={isBn ? 'রেটিং ৪.৯' : 'Rating 4.9 out of 5'}
              >
                <Star className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                <span className="text-foreground font-extrabold">4.9</span>
                <span className="text-muted-foreground font-normal text-[11px]">
                  {isBn ? '(১২০+ রিভিউ)' : '(120+ reviews)'}
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

        {/* Highlights Row: Session Type, Experience & Response Time */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t border-border/80 text-[10px] sm:text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{isBn ? '১:১ ক্লাস' : '1:1 Session'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <BookOpen
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{isBn ? 'গণিত ও পদার্থ' : 'Math & Phys'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 bg-surface rounded-xl px-2 sm:px-2.5 py-1.5 sm:py-2 border border-border/60">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate tabular-nums">{isBn ? '৫+ বছর' : '5+ yrs'}</span>
          </div>
        </div>

        {/* Bio Snippet */}
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {isBn
            ? 'শিক্ষার্থীদের বেসিক ধারণা স্পষ্ট করে সহজ কৌশলে কঠিন গণিত ও পদার্থবিজ্ঞান বোঝানো আমার বিশেষত্ব।'
            : 'Passionate about simplifying complex concepts in Mathematics and Physics with real-world applications.'}
        </p>

        {/* Pricing & CTA Button */}
        <div className="mt-4 pt-3.5 border-t border-border/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'পারিশ্রমিক' : 'Hourly Rate'}
            </span>
            <div className="text-base font-black text-foreground tabular-nums">
              {isBn ? '৳ ৮০০' : '৳ 800'}
              <span className="text-xs font-normal text-muted-foreground">
                {isBn ? ' / ঘণ্টা' : ' / hr'}
              </span>
            </div>
          </div>

          <Link
            href={`/${locale}/tutors`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs px-4 py-2.5 shadow-sm shadow-primary/20 transition-all duration-150 cursor-pointer active:scale-95"
          >
            <span>{isBn ? 'ট্রায়াল বুক করুন' : 'Book Trial'}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
