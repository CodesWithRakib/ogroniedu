'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Users,
  CalendarDays,
  BookOpen,
  ArrowRight,
  Search,
  Award,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Atom,
  FlaskConical,
  Binary,
  Compass,
  Star,
  MapPin,
} from 'lucide-react';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchTutorsQuery } from '@/store/services/tutors-api';
import { localizedTutorFields } from '@/features/tutor-discovery/utils/localized-tutor-text';
import { usePlatformStats } from '../hooks/use-platform-stats';
import { HeroSearchBar } from '../components/HeroSearchBar';
import { HeroTutorCard } from '../components/HeroTutorCard';
import { StudentAvatar } from '../components/StudentAvatar';

export function HomePage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const { stats, isLoading: statsLoading } = usePlatformStats();
  const { data: tutorsData, isLoading: tutorsLoading } = useSearchTutorsQuery({
    pageSize: 4,
    sort: 'rating_desc',
  });

  const subjectCategories = [
    {
      id: 'math',
      query: 'Mathematics',
      icon: Compass,
      titleBn: 'সাধারণ ও উচ্চতর গণিত',
      titleEn: 'General & Higher Math',
      accentColor: 'text-blue-600 bg-blue-50 border-blue-200/60',
    },
    {
      id: 'physics',
      query: 'Physics',
      icon: Atom,
      titleBn: 'পদার্থবিজ্ঞান',
      titleEn: 'Physics',
      accentColor: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
    },
    {
      id: 'chemistry',
      query: 'Chemistry',
      icon: FlaskConical,
      titleBn: 'রসায়ন ও জীববিজ্ঞান',
      titleEn: 'Chemistry & Biology',
      accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    },
    {
      id: 'english',
      query: 'English',
      icon: BookOpen,
      titleBn: 'ইংরেজি ভাষা ও সাহিত্য',
      titleEn: 'English Language & Lit',
      accentColor: 'text-amber-600 bg-amber-50 border-amber-200/60',
    },
    {
      id: 'ict',
      query: 'ICT',
      icon: Binary,
      titleBn: 'আইসিটি ও কম্পিউটার',
      titleEn: 'ICT & Computer Science',
      accentColor: 'text-sky-600 bg-sky-50 border-sky-200/60',
    },
    {
      id: 'admission',
      query: 'University Admission Prep',
      icon: GraduationCap,
      titleBn: 'বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি',
      titleEn: 'University Admission Prep',
      accentColor: 'text-rose-600 bg-rose-50 border-rose-200/60',
    },
  ];

  const apiTutors = Array.isArray(tutorsData?.data) ? tutorsData.data : [];

  const displayedTutors = apiTutors.slice(0, 4).map((t) => {
    const copy = localizedTutorFields(locale, t);
    return {
      id: t.id,
      name:
        (isBn ? t.displayNameBn || t.displayNameEn : t.displayNameEn || t.displayNameBn) ||
        t.displayName ||
        (isBn ? 'শিক্ষক' : 'Tutor'),
      institution: copy.headline,
      rating: t.ratingAverage,
      reviewsCount: t.totalReviews,
      subjects: t.subjects.slice(0, 2).map((s) => (isBn ? s.subjectNameBn : s.subjectNameEn)),
      rate: t.hourlyRateMinor ? Math.round(Number(t.hourlyRateMinor) / 100) : null,
      experience:
        t.yearsExperience != null
          ? `${formatLocalizedNumber(t.yearsExperience, locale)}+ ${isBn ? 'বছর' : 'yrs'}`
          : null,
      modes:
        t.teachingModes && t.teachingModes.length > 0
          ? t.teachingModes
              .map((m) =>
                m === 'in_person'
                  ? isBn
                    ? 'অফলাইন'
                    : 'In-person'
                  : m === 'online'
                    ? isBn
                      ? 'অনলাইন'
                      : 'Online'
                    : m,
              )
              .join(isBn ? ' ও ' : ' & ')
          : null,
    };
  });

  // Only live aggregates are rendered. A missing stats response shows an em
  // dash instead of a fabricated platform count.
  const displayedStudents = stats ? formatLocalizedNumber(stats.activeStudents, locale) : '—';
  const displayedTutorsCount = stats ? formatLocalizedNumber(stats.verifiedTutors, locale) : '—';
  const displayedSessions = stats ? formatLocalizedNumber(stats.completedSessions, locale) : '—';

  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      {/* Subtle, Sophisticated Ambient Lighting & Micro-Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] opacity-35 dark:opacity-10 pointer-events-none -z-10" />
      <div className="absolute top-0 right-1/4 w-[650px] h-[380px] bg-blue-100/60 dark:bg-blue-900/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-28 left-8 w-[450px] h-[320px] bg-indigo-50/70 dark:bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* ====================================================================
       * HERO SECTION: Clean, High-Trust, Prestige Visual Experience
       * ==================================================================== */}
      <section className="relative pt-4 pb-8 lg:pt-8 lg:pb-12 overflow-visible">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Trust Pill, Bengali Headline, Subtitle & Search */}
            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5 text-left z-10">
              {/* Trust Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 py-1.5 px-3.5 shadow-xs max-w-full overflow-hidden text-xs backdrop-blur-md">
                <div className="flex items-center gap-1.5 font-bold text-foreground shrink-0">
                  <ShieldCheck
                    className="h-4 w-4 text-primary shrink-0 stroke-[2.5]"
                    aria-hidden="true"
                  />
                  <span className="sm:hidden">
                    {isBn ? 'শিক্ষার্থীদের আস্থা' : 'Trusted by students'}
                  </span>
                  <span className="hidden sm:inline">
                    {isBn ? 'অভিভাবক ও শিক্ষার্থীদের আস্থা' : 'Trusted by parents & students'}
                  </span>
                </div>

                {/* Overlapping Student Avatars */}
                <div className="flex items-center -space-x-1.5 shrink-0" aria-hidden="true">
                  <StudentAvatar index={1} size="sm" />
                  <StudentAvatar index={2} size="sm" />
                  <StudentAvatar index={3} size="sm" />
                </div>

                {/* Live average rating — omitted when the platform has no published reviews. */}
                {stats?.averageRating != null && (
                  <div
                    className="flex items-center gap-1 pl-0.5 text-[11px] font-bold text-star shrink-0"
                    role="img"
                    aria-label={`${stats.averageRating.toFixed(1)} out of 5`}
                  >
                    <span className="tracking-tighter hidden xs:inline" aria-hidden="true">
                      ★★★★★
                    </span>
                    <span className="xs:hidden">★</span>
                    <span className="text-foreground font-black tabular-nums">
                      {stats.averageRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[44px] xl:text-[52px] font-black tracking-tight text-foreground leading-[1.14]">
                {isBn ? 'সঠিক শিক্ষক খুঁজুন।' : 'Find the Right Tutor.'}
                <br />
                <span className="text-primary">
                  {isBn ? 'সুপ্ত মেধার শ্রেষ্ঠ বিকাশ।' : 'Unlock Their Potential.'}
                </span>
              </h1>

              {/* Subtitle Description */}
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                {isBn
                  ? 'বুয়েট, ঢাবি ও মেডিকেলসহ শীর্ষ প্রতিষ্ঠানের অভিজ্ঞ ও যাচাইকৃত শিক্ষকদের সাথে ১:১ ও অনলাইন ক্লাসের মাধ্যমে পড়ালেখায় সেরা প্রস্তুতি নিন।'
                  : 'Connect with verified top-tier tutors from BUET, DU & Medical for personalized 1:1 and online classes across Bangladesh.'}
              </p>

              {/* Multi-Filter Search Bar Capsule */}
              <div className="pt-1">
                <HeroSearchBar locale={locale} />
              </div>
            </div>

            {/* Right Column: Hero Visual Stage Focused on Verified Educators */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex flex-col items-center lg:items-end">
              <div className="relative w-full max-w-[430px]">
                {/* Primary Featured Tutor Spotlight Card */}
                <HeroTutorCard locale={locale} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * STATS & SOCIAL PROOF STRIP (Directly Below Hero)
       * ==================================================================== */}
      <section
        className="relative py-8 sm:py-10 border-y border-border bg-muted/20"
        data-testid="platform-metrics-band"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Stat 1: Happy Students */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-colors hover:border-primary/40">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                {statsLoading ? (
                  <div className="flex flex-col gap-1.5" aria-hidden="true">
                    <Skeleton className="h-7 w-20 rounded-lg" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums truncate">
                      {displayedStudents}
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-bold mt-0.5 truncate">
                      {isBn ? 'সন্তুষ্ট শিক্ষার্থী' : 'Happy Students'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stat 2: Verified Tutors */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-colors hover:border-primary/40">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                {statsLoading ? (
                  <div className="flex flex-col gap-1.5" aria-hidden="true">
                    <Skeleton className="h-7 w-20 rounded-lg" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums truncate">
                      {displayedTutorsCount}
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-bold mt-0.5 truncate">
                      {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutors'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stat 3: Completed sessions (live aggregate) */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-colors hover:border-primary/40">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                {statsLoading ? (
                  <div className="flex flex-col gap-1.5" aria-hidden="true">
                    <Skeleton className="h-7 w-20 rounded-lg" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums truncate">
                      {displayedSessions}
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5 truncate">
                      {isBn ? 'সম্পন্ন ক্লাস' : 'Completed Sessions'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stat 4: 100% Escrow Protection */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 transition-colors hover:border-primary/40">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                {statsLoading ? (
                  <div className="flex flex-col gap-1.5" aria-hidden="true">
                    <Skeleton className="h-7 w-20 rounded-lg" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                ) : (
                  <>
                    <div className="text-xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums truncate">
                      100%
                    </div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5 truncate">
                      {isBn ? 'এসক্রো সুরক্ষা' : 'Escrow Security'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * POPULAR SUBJECT CATEGORIES GRID
       * ==================================================================== */}
      <section className="py-14 sm:py-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div className="text-left flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBn ? 'জনপ্রিয় বিষয় ও কারিকুলাম' : 'Popular Subjects & Curriculums'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn
                  ? 'আপনার প্রয়োজনীয় বিষয়ে সেরা শিক্ষক খুঁজুন'
                  : 'Find the Best Tutors for Every Subject'}
              </h2>
            </div>

            <Link
              href={`/${locale}/tutors`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
            >
              <span>{isBn ? 'সকল বিষয় ও শিক্ষক দেখুন' : 'Explore All Subjects'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {subjectCategories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/tutors?q=${encodeURIComponent(cat.query)}`}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 transition-colors group text-left flex flex-col justify-between min-h-[140px]"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center border border-primary/20 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105"
                  >
                    <IconComp className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="mt-3">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {isBn ? cat.titleBn : cat.titleEn}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {isBn ? 'শিক্ষক দেখুন' : 'Explore tutors'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
       * TOP VERIFIED EDUCATORS DYNAMIC SPOTLIGHT SECTION
       * ==================================================================== */}
      <section className="py-14 sm:py-20 border-t border-border bg-muted/20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div className="text-left flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBn ? 'শীর্ষ যাচাইকৃত শিক্ষকবৃন্দ' : 'Featured Verified Educators'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn
                  ? 'অভিজ্ঞ ও সেরা রেটেড শিক্ষকমণ্ডলী'
                  : 'Learn from Top-Rated University Tutors'}
              </h2>
            </div>

            <Link
              href={`/${locale}/tutors`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <span>{isBn ? 'সকল শিক্ষক খুঁজুন' : 'View All Tutors'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {tutorsLoading ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
              data-testid="tutors-grid-loading"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  data-testid="tutor-skeleton-card"
                  className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-4/5 rounded" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-8 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedTutors.length === 0 ? (
            <div
              className="rounded-xl border border-border bg-card p-8 text-center"
              data-testid="home-tutors-empty"
            >
              <p className="text-sm font-bold text-foreground">
                {isBn
                  ? 'এখন কোনো যাচাইকৃত শিক্ষক তালিকাভুক্ত নেই।'
                  : 'No verified tutors are listed yet.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isBn
                  ? 'শিক্ষক তালিকা দেখে ফিল্টার করুন অথবা একটু পরে আবার দেখুন।'
                  : 'Browse the tutor directory or check back shortly.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {displayedTutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors flex flex-col justify-between group text-left"
                >
                  <div>
                    {/* Top row: Avatar & Verified Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div
                            className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold text-sm flex items-center justify-center"
                          >
                            {tutor.name.charAt(0)}
                          </div>
                          <div
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card"
                            title={isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor'}
                          >
                            <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {tutor.name}
                          </h3>
                          {tutor.institution && (
                            <p className="text-[11px] font-semibold text-primary truncate">
                              {tutor.institution}
                            </p>
                          )}
                        </div>
                      </div>

                      {tutor.rating != null && (
                        <div
                          className="flex items-center gap-1 text-[11px] font-bold text-star shrink-0"
                          role="img"
                          aria-label={`${formatLocalizedNumber(tutor.rating, locale)} / 5`}
                        >
                          <Star className="h-3.5 w-3.5 fill-star text-star" />
                          <span className="text-foreground tabular-nums">
                            {tutor.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Subjects Row */}
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {tutor.subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted/60 border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground truncate"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>

                    {/* Highlights Row */}
                    <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{tutor.experience}</span>
                      <span className="font-medium text-foreground">{tutor.modes}</span>
                    </div>
                  </div>

                  {/* Rate & Book CTA */}
                  <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        {isBn ? 'পারিশ্রমিক' : 'Rate'}
                      </span>
                      <span className="text-xs font-black text-foreground tabular-nums">
                        {tutor.rate != null ? (
                          <>
                            {formatLocalizedNumber(tutor.rate, locale)}
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {isBn ? ' /ঘণ্টা' : ' /hr'}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {isBn ? 'আলোচনা সাপেক্ষে' : 'Negotiable'}
                          </span>
                        )}
                      </span>
                    </div>

                    <Link
                      href={
                        tutor.id.includes('-')
                          ? `/${locale}/tutors/${tutor.id}`
                          : `/${locale}/tutors`
                      }
                      className="rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>{isBn ? 'প্রোফাইল' : 'Profile'}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
       * "WHY CHOOSE OGRONIEDU" FEATURES SECTION
       * ==================================================================== */}
      <section className="py-14 sm:py-20 border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {isBn ? 'অগ্রণী এডুর বিশেষত্ব' : 'Why Choose OgroniEdu'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isBn
                ? 'উন্নত ও নিরাপদ শিক্ষার জন্য যা প্রয়োজন'
                : 'Everything You Need for Safe & Better Learning'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors flex flex-col gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Award className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? '৩ স্তরের শিক্ষক যাচাইকরণ' : '3-Tier Educator Verification'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'এনআইডি, একাডেমিক সার্টিফিকেট ও ব্যাকগ্রাউন্ড পুঙ্খানুপুঙ্খভাবে যাচাই করে তবেই শিক্ষক তালিকাভুক্ত করা হয়।'
                  : 'NID, academic degrees, and criminal background are rigorously verified before onboarding.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors flex flex-col gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'নিরাপদ এসক্রো পেমেন্ট' : '100% Escrow Protection'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'টাকা থাকবে সুরক্ষিত এসক্রোতে। প্রতি মাসের ক্লাস সন্তোষজনকভাবে সম্পন্ন হলে শিক্ষক পারিশ্রমিক পাবেন।'
                  : 'Your funds remain held in secure escrow. Tutors receive payment only after verified session completion.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors flex flex-col gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <TrendingUp className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'অভিভাবক ড্যাশবোর্ড ও ট্র্যাকিং' : 'Guardian Progress Dashboard'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'ক্লাসের উপস্থিতি, সিলেবাস অগ্রগতি ও নিয়মিত পারফরম্যান্স রিপোর্ট সরাসরি ড্যাশবোর্ডে পর্যবেক্ষণ করুন।'
                  : 'Real-time attendance logs, syllabus completion tracking, and weekly progress updates.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors flex flex-col gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'ফ্রি রিপ্লেসমেন্ট গ্যারান্টি' : 'Free Replacement Guarantee'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'শিক্ষকের পাঠদানে সন্তুষ্ট না হলে যেকোনো সময় কোনো অতিরিক্ত চার্জ ছাড়াই বিকল্প শিক্ষক প্রদান করা হবে।'
                  : 'If you are not satisfied with the tutor, get a free replacement or complete refund anytime.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * 3-STEP JOURNEY SECTION
       * ==================================================================== */}
      <section className="py-14 sm:py-20 border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {isBn ? 'সহজ ৩টি ধাপ' : 'Simple 3-Step Journey'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isBn ? 'যেভাবে সেরা শিক্ষক পাবেন' : 'How You Connect With Top Educators'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono tabular-nums">
                  01
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Search className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'বিষয় ও এলাকা অনুযায়ী খুঁজুন' : 'Filter by Subject & Location'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'বুয়েট, ঢাবি বা মেডিকেল শিক্ষার্থীদের প্রোফাইল, অভিভাবক রিভিউ ও পারিশ্রমিক দেখে বাছাই করুন।'
                  : 'Browse verified profiles with university credentials, parent reviews, hourly rates, and subject experience.'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono tabular-nums">
                  02
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <CalendarDays className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'ফ্রি ট্রায়াল ও শিডিউল নিশ্চিত করুন' : 'Book Trial & Lock Schedule'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'প্রথম ট্রায়াল ক্লাসে শিক্ষকের সাথে কথা বলে উভয়ের সুবিধাজনক সময় ও দিন চূড়ান্ত করুন।'
                  : 'Take a direct introductory session, assess compatibility, and lock non-conflicting time slots.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-muted-foreground/30 font-mono tabular-nums">
                  03
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'এসক্রো সুরক্ষা ও নিয়মিত পাঠদান' : 'Learn with Escrow Protection'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'টাকা থাকবে সুরক্ষিত এসক্রোতে। প্রতি মাসের ক্লাস সন্তোষজনকভাবে সম্পন্ন হলে শিক্ষক পারিশ্রমিক পাবেন।'
                  : 'Funds remain held securely in escrow until parent and student sign off on delivered classes.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
       * CTA BANNER: Clean & Unified Card
       * ==================================================================== */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl bg-card text-foreground p-8 sm:p-12 border border-border">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex flex-col gap-3.5 max-w-xl text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>{isBn ? 'অগ্রণী এডু প্ল্যাটফর্ম' : 'OgroniEdu Platform'}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
                  {isBn
                    ? 'আজই আপনার সন্তানের জন্য সেরা গৃহশিক্ষক নিশ্চিত করুন'
                    : 'Find the ideal verified tutor for your child today'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'বিনামূল্যে অ্যাকাউন্ট তৈরি করুন এবং ঢাকা ও সারা বাংলাদেশের শীর্ষ বিশ্ববিদ্যালয়ের মেধাবী শিক্ষকদের সাথে কথা বলুন।'
                    : 'Create a free account and directly connect with brilliant university tutors across Dhaka and Bangladesh.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-6 py-2.5 h-auto text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Link href={`/${locale}/register`} className="flex items-center gap-2">
                    <span>{isBn ? 'নিবন্ধন করুন' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-6 py-2.5 h-auto text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  <Link href={`/${locale}/tutors`} className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>{isBn ? 'সকল শিক্ষক দেখুন' : 'Browse All Tutors'}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
