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
  MapPin,
  CalendarDays,
  Bookmark,
  BookOpen,
  Send,
  Video,
} from 'lucide-react';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { WEEKDAY_LABELS, type TutorCardData } from '../types/tutor-discovery.types';
import { localizedTutorFields } from '../utils/localized-tutor-text';

export function TutorCard({
  tutor,
  locale,
  isSaved = false,
  canSave = false,
  onToggleSave,
  onShowScore,
  onRequestBooking,
}: {
  tutor: TutorCardData;
  locale: Locale;
  isSaved?: boolean;
  canSave?: boolean;
  onToggleSave?: (tutor: TutorCardData) => void;
  onShowScore: (tutor: TutorCardData) => void;
  onRequestBooking: (tutor: TutorCardData) => void;
}) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const resolvedDisplayName = isBn
    ? tutor.displayNameBn || tutor.displayNameEn || tutor.displayName || ''
    : tutor.displayNameEn || tutor.displayNameBn || tutor.displayName || '';
  const { headline, bio } = localizedTutorFields(locale, tutor);

  const hourlyRate = tutor.hourlyRateMinor
    ? formatLocalizedNumber(Number(tutor.hourlyRateMinor) / 100, locale)
    : null;
  const expYears = tutor.yearsExperience
    ? formatLocalizedNumber(tutor.yearsExperience, locale)
    : null;

  // Extract initials for modern avatar
  const initials = resolvedDisplayName
    ? resolvedDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TU';

  // Teaching modes localized text
  const modesText = React.useMemo(() => {
    const hasOnline = tutor.teachingModes.includes('online');
    const hasInPerson = tutor.teachingModes.includes('in_person');
    const hasHybrid = tutor.teachingModes.includes('hybrid');

    if (hasOnline && hasInPerson) {
      return isBn ? 'অনলাইন ও হোম' : 'Online & Home';
    }
    if (hasHybrid) {
      return isBn ? 'হাইব্রিড' : 'Hybrid';
    }
    if (hasOnline) {
      return isBn ? 'অনলাইন' : 'Online';
    }
    if (hasInPerson) {
      return isBn ? 'হোম টিউশন' : 'In-person';
    }
    return tutor.teachingModes.map((m) => m.replace('_', ' ')).join(', ');
  }, [tutor.teachingModes, isBn]);

  // Primary subjects preview
  const subjectsPreview = React.useMemo(() => {
    if (tutor.subjects.length === 0) return null;
    const names = tutor.subjects.slice(0, 3).map((s) => (isBn ? s.subjectNameBn : s.subjectNameEn));
    return names.join(', ');
  }, [tutor.subjects, isBn]);

  return (
    <div
      className="group relative rounded-xl bg-card border border-border hover:border-primary/40 p-5 sm:p-6 transition-colors text-left w-full overflow-hidden"
      data-testid={`tutor-card-${tutor.id}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
        {/* Left Section: Avatar + Comprehensive Tutor Info */}
        <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
          {/* Avatar Capsule with Online Status */}
          <Link href={`/${locale}/tutors/${tutor.id}`} className="relative shrink-0 block">
            {tutor.avatarUrl ? (
              <img
                src={tutor.avatarUrl}
                alt={resolvedDisplayName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-lg sm:text-2xl">
                {initials}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-emerald-500 ring-2 ring-emerald-500/20"
              title={isBn ? 'সক্রিয় শিক্ষক' : 'Active Tutor'}
            />
          </Link>

          {/* Details */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Name + Match Score */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/${locale}/tutors/${tutor.id}`}
                  className="text-base sm:text-lg xl:text-xl font-black text-foreground hover:text-primary transition-colors tracking-tight line-clamp-2 leading-tight"
                >
                  {resolvedDisplayName}
                </Link>

                {headline && (
                  <p className="text-xs sm:text-sm text-primary font-bold line-clamp-2 mt-0.5 leading-snug">
                    {headline}
                  </p>
                )}
              </div>

              {/* Match Score Badge */}
              <button
                type="button"
                onClick={() => onShowScore(tutor)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors shrink-0 cursor-pointer"
                title={
                  locale === 'bn'
                    ? 'ম্যাচ স্কোরের ব্যাখ্যা দেখতে ক্লিক করুন'
                    : 'Click to view explainable match breakdown'
                }
                data-testid={`match-score-badge-${tutor.id}`}
              >
                <Sparkles
                  className="w-3.5 h-3.5 text-primary"
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {formatLocalizedNumber(tutor.matchScore, locale)} pts
                </span>
              </button>
            </div>

            {/* Ratings & Verification Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Rating */}
              {tutor.totalReviews && tutor.totalReviews > 0 && tutor.ratingAverage != null ? (
                <div
                  className="flex items-center gap-1 text-xs text-star font-bold tabular-nums bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full"
                  data-testid={`tutor-rating-${tutor.id}`}
                >
                  <Star className="h-3.5 w-3.5 fill-star text-star" aria-hidden="true" />
                  <span className="text-foreground font-black">
                    {formatLocalizedNumber(tutor.ratingAverage, locale)}
                  </span>
                  <span className="text-muted-foreground font-medium text-[11px]">
                    ({formatLocalizedNumber(tutor.totalReviews, locale)}{' '}
                    {locale === 'bn' ? 'রিভিউ' : 'reviews'})
                  </span>
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border px-2.5 py-0.5 rounded-full"
                  data-testid={`tutor-no-rating-${tutor.id}`}
                >
                  {locale === 'bn' ? 'নতুন শিক্ষক — এখনো রিভিউ নেই' : 'New tutor — no reviews yet'}
                </span>
              )}

              {/* Verification Pills */}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]"
                  aria-hidden="true"
                />
                <span>
                  {dict.tutor?.badgeVerifiedTutor || (isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor')}
                </span>
              </span>

              {tutor.badges.includes('verified_identity') && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Award className="w-3.5 h-3.5 text-primary stroke-[2.5]" aria-hidden="true" />
                  <span>
                    {dict.tutor?.badgeVerifiedIdentity ||
                      (isBn ? 'এনআইডি যাচাইকৃত' : 'NID Verified')}
                  </span>
                </span>
              )}

              {(tutor.badges.includes('verified_academic') ||
                tutor.badges.includes('verified_degree')) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <GraduationCap
                    className="w-3.5 h-3.5 text-primary stroke-[2.5]"
                    aria-hidden="true"
                  />
                  <span>
                    {dict.tutor?.badgeVerifiedAcademic ||
                      (isBn ? 'সনদপত্র যাচাইকৃত' : 'Degree Verified')}
                  </span>
                </span>
              )}
            </div>

            {/* Clean Highlights Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-muted-foreground">
              {/* Teaching Mode */}
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border text-foreground">
                <Video className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>{modesText}</span>
              </div>

              {/* Subjects Preview */}
              {subjectsPreview && (
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border text-foreground">
                  <span className="truncate max-w-xs">{subjectsPreview}</span>
                </div>
              )}

              {/* Experience */}
              {expYears && (
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border text-foreground">
                  <GraduationCap
                    className="h-3.5 w-3.5 text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">
                    {dict.discovery?.yearsExperience
                      ? dict.discovery.yearsExperience.replace('{count}', expYears)
                      : `${expYears} yrs experience`}
                  </span>
                </div>
              )}

              {/* Distance */}
              {tutor.distanceKm != null && (
                <div
                  className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border text-foreground"
                  data-testid={`tutor-distance-${tutor.id}`}
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">
                    {formatLocalizedNumber(tutor.distanceKm, locale)} km {isBn ? 'দূরত্ব' : 'away'}
                  </span>
                </div>
              )}

              {/* Next Available Day */}
              {tutor.nextAvailableWeekday != null && (
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1 border border-border text-foreground">
                  <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span>
                    {locale === 'bn' ? 'পরবর্তী ক্লাস: ' : 'Next: '}
                    {locale === 'bn'
                      ? WEEKDAY_LABELS[tutor.nextAvailableWeekday]?.bn
                      : WEEKDAY_LABELS[tutor.nextAvailableWeekday]?.en}
                  </span>
                </div>
              )}
            </div>

            {/* Clean Bio Snippet */}
            {bio && !bio.toLowerCase().includes('live probe') && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Pricing & Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 shrink-0 lg:w-52">
          {/* Hourly Rate Display */}
          <div className="text-left lg:text-right w-full">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'সম্মানী / ফি' : 'Hourly Rate'}
            </span>
            {hourlyRate ? (
              <div className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight">
                ৳ {hourlyRate}
                <span className="text-xs font-semibold text-muted-foreground ml-1">
                  {isBn ? '/ ঘণ্টা' : '/ hr'}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground font-semibold">
                {dict.discovery.contactForFee}
              </span>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col w-full gap-2 pt-1">
            {/* Primary Request Tutoring CTA */}
            <button
              type="button"
              onClick={() => onRequestBooking(tutor)}
              data-testid={`request-tutoring-btn-${tutor.id}`}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2.5 transition-colors cursor-pointer group"
            >
              <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              <span>
                {dict.discovery?.requestSession || (isBn ? 'অনুরোধ পাঠান' : 'Request Tutoring')}
              </span>
            </button>

            {/* Secondary Row: Details Link + Bookmark */}
            <div className="flex items-center gap-2 w-full">
              <Link
                href={`/${locale}/tutors/${tutor.id}`}
                className="inline-flex items-center justify-center gap-1 flex-1 rounded-xl bg-muted/50 hover:bg-muted border border-border text-foreground hover:text-primary font-semibold text-xs px-3 py-2 transition-colors text-center"
                title={
                  locale === 'bn'
                    ? 'সম্পূর্ণ প্রোফাইল ও যোগ্যতা দেখুন'
                    : 'View Full Profile & Credentials'
                }
              >
                <span>{locale === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>

              {canSave && onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(tutor)}
                  data-testid={`save-tutor-btn-${tutor.id}`}
                  aria-pressed={isSaved}
                  aria-label={
                    isSaved
                      ? locale === 'bn'
                        ? 'সংরক্ষিত থেকে সরান'
                        : 'Remove from saved'
                      : locale === 'bn'
                        ? 'শিক্ষক সংরক্ষণ করুন'
                        : 'Save tutor'
                  }
                  className="inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <Bookmark
                    className={`w-4 h-4 ${isSaved ? 'fill-primary text-primary' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
