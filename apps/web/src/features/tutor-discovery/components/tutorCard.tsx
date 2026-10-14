'use client';

import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  MapPin,
  Calendar,
  Star,
} from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import type { TutorCardData } from '../types/tutor-discovery.types';

export function TutorCard({
  tutor,
  locale,
  onShowScore,
  onRequestBooking,
}: {
  tutor: TutorCardData;
  locale: Locale;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
}) {
  const dict = getDictionary(locale);
  const hourlyRate = tutor.hourlyRateMinor
    ? formatLocalizedNumber(Number(tutor.hourlyRateMinor) / 100, locale)
    : null;
  const expYears = tutor.yearsExperience
    ? formatLocalizedNumber(tutor.yearsExperience, locale)
    : null;

  // Extract initials for modern avatar
  const initials = tutor.displayName
    ? tutor.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TU';

  return (
    <div
      className="group relative flex flex-col justify-between rounded-2xl bg-[#061f26]/90 hover:bg-[#072730] border border-[#0df5c4]/25 hover:border-[#0df5c4]/55 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_35px_rgba(13,245,196,0.18)] transition-all duration-300 overflow-hidden"
      data-testid={`tutor-card-${tutor.id}`}
    >
      {/* Subtle Glowing Top Edge */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0df5c4]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Card Header & Bio */}
      <div className="p-5 space-y-3.5">
        {/* Top Row: Avatar + Name + Match Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Avatar with status indicator */}
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0a3540] via-[#052128] to-[#03151a] text-[#0df5c4] font-bold text-sm ring-2 ring-[#0df5c4]/30 group-hover:ring-[#0df5c4]/60 transition-all shadow-inner">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#061f26]" />
            </div>

            {/* Name, Headline & Rating */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-white group-hover:text-[#0df5c4] transition-colors truncate">
                  {tutor.displayName}
                </h3>
              </div>
              {tutor.headline && (
                <p className="text-xs font-medium text-teal-300/90 line-clamp-1 mt-0.5">
                  {tutor.headline}
                </p>
              )}
              {/* Star Rating Demonstration */}
              <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-400 font-semibold">
                <Star className="h-3 w-3 fill-amber-400" />
                <span className="text-slate-200">4.9</span>
                <span className="text-slate-400 font-normal">
                  ({locale === 'bn' ? '৪৮টি রিভিউ' : '48 reviews'})
                </span>
              </div>
            </div>
          </div>

          {/* Explainable Match Score Badge */}
          <button
            type="button"
            onClick={() => onShowScore(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#0df5c4]/15 text-[#0df5c4] border border-[#0df5c4]/35 hover:bg-[#0df5c4]/25 transition-all cursor-pointer shadow-[0_0_12px_rgba(13,245,196,0.15)] shrink-0 active:scale-95"
            title={locale === 'bn' ? 'ম্যাচ স্কোরের ব্যাখ্যা দেখুন' : 'Click to view explainable match breakdown'}
            data-testid={`match-score-badge-${tutor.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0df5c4]" />
            <span className="tabular-nums">{formatLocalizedNumber(tutor.matchScore, locale)} pts</span>
          </button>
        </div>

        {/* Verification Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {dict.tutor?.badgeVerifiedTutor || 'Verified Tutor'}
          </span>
          {tutor.badges.includes('verified_identity') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0df5c4]/10 text-[#0df5c4] border border-[#0df5c4]/30">
              <Award className="w-3 h-3 text-[#0df5c4]" />
              {dict.tutor?.badgeVerifiedIdentity || 'NID Verified'}
            </span>
          )}
          {tutor.badges.includes('verified_degree') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <GraduationCap className="w-3 h-3 text-cyan-400" />
              {dict.tutor?.badgeVerifiedAcademic || 'Degree Verified'}
            </span>
          )}
        </div>

        {/* Bio */}
        {tutor.bio && (
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
            {tutor.bio}
          </p>
        )}

        {/* Teaching Subjects Box */}
        <div className="space-y-1.5 bg-[#041a21]/90 p-3 rounded-xl border border-[#0df5c4]/15">
          <span className="text-[11px] font-bold text-teal-300 block uppercase tracking-wider">
            {dict.tutor?.subjectsTitle || 'Teaching Subjects'}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tutor.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub.id}
                className="bg-[#06242c] px-2.5 py-0.5 rounded-lg border border-[#0df5c4]/25 text-[#0df5c4] text-[11px] font-semibold shadow-xs"
              >
                {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn}
              </span>
            ))}
            {tutor.subjects.length > 3 && (
              <span className="text-slate-400 text-[11px] self-center font-medium">
                +{tutor.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Experience & Response Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
          {expYears && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#0df5c4]" />
              <span>
                {dict.discovery?.yearsExperience
                  ? dict.discovery.yearsExperience.replace('{count}', expYears)
                  : `${expYears} yrs experience`}
              </span>
            </div>
          )}
          {tutor.responseTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0df5c4]" />
              <span className="tabular-nums">
                ~{formatLocalizedNumber(tutor.responseTimeMinutes, locale)}m response
              </span>
            </div>
          )}
          <div className="col-span-2 flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="font-semibold text-teal-200">
              {locale === 'bn' ? 'পদ্ধতি:' : 'Modes:'}
            </span>
            {tutor.teachingModes.map((m) => (
              <span
                key={m}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/5 text-[11px] text-slate-300 capitalize"
              >
                {m.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer: Hourly Rate & Booking CTA */}
      <div className="p-5 pt-3.5 border-t border-[#0df5c4]/20 bg-[#04161c]/60 flex items-center justify-between gap-3">
        <div>
          {hourlyRate ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                {locale === 'bn' ? 'ফি (ঘণ্টাপ্রতি)' : 'Hourly Rate'}
              </span>
              <span className="text-base font-extrabold text-white tabular-nums tracking-tight">
                {dict.discovery?.hourlyRate
                  ? dict.discovery.hourlyRate.replace('{rate}', hourlyRate)
                  : `BDT ${hourlyRate}/hr`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              {dict.discovery.contactForFee}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRequestBooking(tutor)}
          data-testid={`request-tutoring-btn-${tutor.id}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0df5c4] to-[#00cba0] hover:from-[#00cba0] hover:to-[#0df5c4] text-[#031317] font-extrabold text-xs px-4 py-2.5 shadow-[0_0_15px_rgba(13,245,196,0.4)] hover:shadow-[0_0_20px_rgba(13,245,196,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <span>{dict.discovery?.requestSession || 'Request Tutoring'}</span>
        </button>
      </div>
    </div>
  );
}
