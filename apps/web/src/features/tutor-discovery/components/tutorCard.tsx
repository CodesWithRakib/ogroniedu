import React from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
  Star,
  ArrowRight,
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
      className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/80 hover:border-primary/40 shadow-xs hover:shadow-card transition-all duration-300 overflow-hidden"
      data-testid={`tutor-card-${tutor.id}`}
    >
      {/* Subtle Glowing Top Edge */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Card Header & Bio */}
      <div className="p-5 space-y-3.5">
        {/* Top Row: Avatar + Name + Match Score */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/${locale}/tutors/${tutor.id}`}
            className="flex items-start gap-3 group/link flex-1 min-w-0"
          >
            {/* Avatar with status indicator */}
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-sm ring-1 ring-border">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            {/* Name, Headline & Rating */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-foreground group-hover/link:text-primary transition-colors truncate">
                  {tutor.displayName}
                </h3>
              </div>
              {tutor.headline && (
                <p className="text-xs font-medium text-muted-foreground line-clamp-1 mt-0.5">
                  {tutor.headline}
                </p>
              )}
              {/* Star Rating Demonstration */}
              <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600 font-semibold">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span className="text-foreground">4.9</span>
                <span className="text-muted-foreground font-normal">
                  ({locale === 'bn' ? '৪৮টি রিভিউ' : '48 reviews'})
                </span>
              </div>
            </div>
          </Link>

          {/* Explainable Match Score Badge */}
          <button
            type="button"
            onClick={() => onShowScore(tutor)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary border border-border/80 hover:border-primary/40 transition-colors cursor-pointer shadow-xs shrink-0"
            title={
              locale === 'bn'
                ? 'ম্যাচ স্কোরের ব্যাখ্যা দেখুন'
                : 'Click to view explainable match breakdown'
            }
            data-testid={`match-score-badge-${tutor.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="tabular-nums">
              {formatLocalizedNumber(tutor.matchScore, locale)} pts
            </span>
          </button>
        </div>

        {/* Verification Badges */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {dict.tutor?.badgeVerifiedTutor || 'Verified Tutor'}
          </span>
          {tutor.badges.includes('verified_identity') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-soft text-primary border border-border/80">
              <Award className="w-3 h-3 text-primary" />
              {dict.tutor?.badgeVerifiedIdentity || 'NID Verified'}
            </span>
          )}
          {tutor.badges.includes('verified_degree') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 border border-blue-500/20">
              <GraduationCap className="w-3 h-3 text-blue-600" />
              {dict.tutor?.badgeVerifiedAcademic || 'Degree Verified'}
            </span>
          )}
        </div>

        {/* Bio */}
        {tutor.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{tutor.bio}</p>
        )}

        {/* Teaching Subjects Box */}
        <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
            {dict.tutor?.subjectsTitle || 'Teaching Subjects'}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tutor.subjects.slice(0, 3).map((sub) => (
              <span
                key={sub.id}
                className="bg-card px-2.5 py-0.5 rounded-md border border-border/80 text-foreground text-[11px] font-medium shadow-xs"
              >
                {locale === 'bn' ? sub.subjectNameBn : sub.subjectNameEn}
              </span>
            ))}
            {tutor.subjects.length > 3 && (
              <span className="text-muted-foreground text-[11px] self-center font-medium">
                +{tutor.subjects.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Experience & Response Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
          {expYears && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              <span>
                {dict.discovery?.yearsExperience
                  ? dict.discovery.yearsExperience.replace('{count}', expYears)
                  : `${expYears} yrs experience`}
              </span>
            </div>
          )}
          {tutor.responseTimeMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="tabular-nums">
                ~{formatLocalizedNumber(tutor.responseTimeMinutes, locale)}m response
              </span>
            </div>
          )}
          <div className="col-span-2 flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="font-semibold text-muted-foreground">
              {locale === 'bn' ? 'পদ্ধতি:' : 'Modes:'}
            </span>
            {tutor.teachingModes.map((m) => (
              <span
                key={m}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground capitalize"
              >
                {m.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer: Hourly Rate & Booking CTA */}
      <div className="p-4 sm:p-5 pt-3.5 border-t border-border/70 bg-muted/10 flex items-center justify-between gap-3">
        <div>
          {hourlyRate ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                {locale === 'bn' ? 'ফি (ঘণ্টাপ্রতি)' : 'Hourly Rate'}
              </span>
              <span className="text-base font-extrabold text-foreground tabular-nums tracking-tight">
                {dict.discovery?.hourlyRate
                  ? dict.discovery.hourlyRate.replace('{rate}', hourlyRate)
                  : `BDT ${hourlyRate}/hr`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {dict.discovery.contactForFee}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${locale}/tutors/${tutor.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-card hover:bg-muted/50 border border-border/80 text-foreground hover:text-primary font-semibold text-xs px-3 py-2 transition-colors"
            title={
              locale === 'bn'
                ? 'সম্পূর্ণ প্রোফাইল ও যোগ্যতা দেখুন'
                : 'View Full Profile & Credentials'
            }
          >
            <span>{locale === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => onRequestBooking(tutor)}
            data-testid={`request-tutoring-btn-${tutor.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs px-3.5 py-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <span>{dict.discovery?.requestSession || 'Request Tutoring'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
