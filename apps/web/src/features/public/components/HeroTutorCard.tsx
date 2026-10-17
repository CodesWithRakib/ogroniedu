'use client';

import React from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, Users, Video, Award, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

export function HeroTutorCard({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';

  return (
    <div className="relative select-none group">
      {/* Holographic Glowing Ambient Backlight */}
      <div className="absolute -inset-1 bg-gradient-to-r from-brand/30 via-brand-accent to-brand/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

      {/* Main Glass Card Container */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-brand/60 bg-card/95 p-4 sm:p-5 backdrop-blur-2xl shadow-sm hover:border-brand transition-all duration-300 max-w-[340px] sm:max-w-[380px] text-left">
        {/* Top Header: Tutor Avatar, Verified Badge, Name & Online Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Tutor Avatar with Glowing Verified Badge */}
            <div className="relative">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden border-2 border-brand shadow-sm">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: "url('/images/avatars-group.jpg')",
                    backgroundPosition: '0% 100%',
                    backgroundSize: '200% 200%',
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground ring-2 ring-border shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Tutor Name & Credentials */}
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  {isBn ? 'আয়েশা রহমান' : 'Ayesha Rahman'}
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-primary-soft-foreground font-medium">
                {isBn ? 'গণিত • বি.এসসি (ইঞ্জিনিয়ারিং)' : 'Mathematics • B.Sc. in Engineering'}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mt-0.5 text-[11px] font-bold text-warning-soft-foreground">
                <Star className="h-3 w-3 fill-warning text-warning-soft-foreground" />
                <span className="text-foreground">4.9</span>
                <span className="text-muted-foreground font-normal text-[10px]">
                  {isBn ? '(১.২হাজার+ রিভিউ)' : '(1.2k reviews)'}
                </span>
              </div>
            </div>
          </div>

          {/* Glowing Online Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/40 px-2.5 py-1 text-[10px] font-bold text-success-soft-foreground shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            <span>{isBn ? 'অনলাইন' : 'Online'}</span>
          </div>
        </div>

        {/* Badges / Offerings Row */}
        <div className="grid grid-cols-3 gap-1.5 mt-3.5 pt-3 border-t border-primary/40 text-[10px] text-muted-foreground font-semibold">
          <div className="flex items-center gap-1 bg-card rounded-lg px-2 py-1.5 border border-primary/40">
            <Video className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">{isBn ? '১:১ ক্লাস' : '1:1 Session'}</span>
          </div>
          <div className="flex items-center gap-1 bg-card rounded-lg px-2 py-1.5 border border-primary/40">
            <Users className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">{isBn ? 'গ্রুপ ব্যাচ' : 'Group Class'}</span>
          </div>
          <div className="flex items-center gap-1 bg-card rounded-lg px-2 py-1.5 border border-primary/40">
            <Award className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">{isBn ? '৫+ বছর' : '5+ yrs'}</span>
          </div>
        </div>

        {/* About Bio snippet */}
        <div className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-primary-soft-foreground font-bold text-[10px] uppercase tracking-wider block mb-0.5">
            {isBn ? 'পরিচিতি' : 'About'}
          </span>
          <p className="line-clamp-2">
            {isBn
              ? 'শিক্ষার্থীদের বেসিক ধারণা স্পষ্ট করে সহজ কৌশলে কঠিন গণিত বোঝানো আমার বিশেষত্ব।'
              : 'Passionate about teaching and helping students build strong concepts. I make complex topics simple and easy to understand.'}
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-3.5">
          <Link
            href={`/${locale}/tutors`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-accent text-brand-foreground font-extrabold text-xs py-2.5 shadow-sm hover:shadow-sm transition-all cursor-pointer group-hover:scale-[1.01]"
          >
            <span>{isBn ? 'সেশন বুক করুন' : 'Book a Session'}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
