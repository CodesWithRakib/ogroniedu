'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  CheckCircle2,
  GraduationCap,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Video,
  Award,
  CalendarCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge, Input, NativeSelect } from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import {
  useGetSavedTutorsQuery,
  useUnsaveTutorMutation,
  type SavedTutorItem,
} from '@/store/services/tutors-api';
import { localizedTutorFields } from '@/features/tutor-discovery/utils/localized-tutor-text';

export type SavedTutorsFilterMode = 'all' | 'top_rated' | 'online' | 'in_person';
export type SavedTutorsSortOption = 'recent' | 'rating' | 'experience' | 'price_asc' | 'price_desc';

export interface SavedTutorCardProps {
  item: SavedTutorItem;
  locale: Locale;
  role?: 'student' | 'guardian' | 'admin';
  isRemoving: boolean;
  onRemove: (tutorId: string) => void;
}

export function SavedTutorCard({
  item,
  locale,
  role = 'student',
  isRemoving,
  onRemove,
}: SavedTutorCardProps) {
  const isBn = locale === 'bn';
  const profile = item.profile;
  const { headline, bio } = localizedTutorFields(locale, profile ?? {});

  if (!profile) {
    return (
      <Card
        className="rounded-xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-3"
        data-testid="saved-tutor-unavailable"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-bold"
            >
              {isBn ? 'বর্তমানে অনুপুস্থিত' : 'Currently Unavailable'}
            </Badge>
            <h4 className="text-base font-bold text-foreground">
              {isBn
                ? 'শিক্ষক প্রোফাইলটি বর্তমানে উপলব্ধ নয়'
                : 'Tutor profile is not currently available'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isBn
                ? 'যাচাইকরণ, প্রকাশনা বা অ্যাকাউন্ট পরিবর্তনের কারণে এই প্রোফাইলটি সাময়িকভাবে সক্রিয় নেই।'
                : 'This profile is currently unlisted due to verification, publication or account changes.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isRemoving}
            onClick={() => onRemove(item.tutorId)}
            className="gap-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 shrink-0"
            data-testid={`unsave-tutor-${item.tutorId}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            {isBn ? 'সংরক্ষিত থেকে সরান' : 'Remove'}
          </Button>
        </div>
      </Card>
    );
  }

  const resolvedDisplayName =
    (isBn
      ? profile.displayNameBn || profile.displayNameEn
      : profile.displayNameEn || profile.displayNameBn) || '';

  const initials = resolvedDisplayName
    ? resolvedDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TU';

  const hourlyRate = profile.hourlyRateMinor
    ? formatLocalizedNumber(Number(profile.hourlyRateMinor) / 100, locale)
    : null;

  const expYears =
    profile.yearsExperience != null ? formatLocalizedNumber(profile.yearsExperience, locale) : null;

  const hasOnline = profile.teachingModes?.includes('online');
  const hasInPerson = profile.teachingModes?.includes('in_person');
  const messagePath = withLocale(
    `/dashboard/${role === 'guardian' ? 'guardian' : 'student'}/messages?tutorId=${item.tutorId}`,
    locale,
  );
  const profilePath = withLocale(`/tutors/${item.tutorId}`, locale);
  const bookingPath = withLocale(`/tutors/${item.tutorId}?book=1`, locale);

  return (
    <Card
      className="group rounded-xl border border-border bg-card p-5 sm:p-6 transition-colors hover:border-primary/40 flex flex-col justify-between gap-5 text-left w-full"
      data-testid={`saved-tutor-${item.tutorId}`}
    >
      <div className="flex flex-col gap-4">
        {/* Top: Avatar, Names, Badges & Unsave Action */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Avatar Capsule */}
            <Link href={profilePath} className="relative shrink-0 block">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={resolvedDisplayName}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover ring-1 ring-border group-hover:ring-primary/40 transition-all"
                />
              ) : (
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-lg sm:text-xl">
                  {initials}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500"
                title={isBn ? 'সক্রিয় শিক্ষক' : 'Active Tutor'}
              />
            </Link>

            {/* Name, Headline & Primary Badges */}
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={profilePath}
                  className="text-base sm:text-lg font-black text-foreground hover:text-blue-600 transition-colors tracking-tight line-clamp-1 leading-snug"
                >
                  {resolvedDisplayName}
                </Link>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  {isBn ? 'যাচাইকৃত' : 'Verified'}
                </span>
              </div>

              {headline && (
                <p className="text-xs sm:text-sm font-semibold text-blue-700 line-clamp-1 leading-tight">
                  {headline}
                </p>
              )}

              {/* Rating & Reviews */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {profile.ratingAverage != null && profile.totalReviews > 0 ? (
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Star
                      className="w-3.5 h-3.5 fill-amber-500 text-amber-500"
                      aria-hidden="true"
                    />
                    <span className="font-black text-foreground">
                      {formatLocalizedNumber(profile.ratingAverage, locale)}
                    </span>
                    <span className="text-muted-foreground font-medium text-[11px]">
                      ({formatLocalizedNumber(profile.totalReviews, locale)}{' '}
                      {isBn ? 'রিভিউ' : 'reviews'})
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {isBn ? 'নতুন শিক্ষক — রিভিউ প্রক্রিয়াধীন' : 'New tutor'}
                  </span>
                )}

                {profile.completedSessions > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    <CalendarCheck className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                    {formatLocalizedNumber(profile.completedSessions, locale)}{' '}
                    {isBn ? 'সেশন সম্পন্ন' : 'sessions'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Remove / Unsave Action */}
          <Button
            variant="ghost"
            size="icon"
            disabled={isRemoving}
            onClick={() => onRemove(item.tutorId)}
            aria-label={isBn ? 'সংরক্ষিত থেকে সরান' : 'Remove from saved'}
            title={isBn ? 'সংরক্ষিত থেকে সরান' : 'Remove from saved'}
            className="shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
            data-testid={`unsave-tutor-${item.tutorId}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Subjects Preview Pills */}
        {profile.subjects && profile.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile.subjects.slice(0, 3).map((subj) => (
              <span
                key={subj.id || subj.subjectId}
                className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50/80 text-indigo-900 border border-indigo-200/80"
              >
                {isBn
                  ? subj.subjectNameBn || subj.subjectNameEn
                  : subj.subjectNameEn || subj.subjectNameBn}
              </span>
            ))}
            {profile.subjects.length > 3 && (
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-muted-foreground">
                +{formatLocalizedNumber(profile.subjects.length - 3, locale)}{' '}
                {isBn ? 'টি বিষয়' : 'more'}
              </span>
            )}
          </div>
        )}

        {/* Key Attributes Row: Modes, District, Experience */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
          {hasOnline && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-foreground">
              <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{isBn ? 'অনলাইন ক্লাস' : 'Online'}</span>
            </span>
          )}
          {hasInPerson && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-foreground">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
              <span>{isBn ? 'হোম টিউশন' : 'In-Person'}</span>
            </span>
          )}
          {profile.serviceAreas && profile.serviceAreas[0] && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-foreground">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
              <span>
                {isBn
                  ? profile.serviceAreas[0].districtNameBn
                  : profile.serviceAreas[0].districtNameEn}
              </span>
            </span>
          )}
          {expYears && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-foreground">
              <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                {expYears} {isBn ? 'বছর অভিজ্ঞতা' : 'yrs exp'}
              </span>
            </span>
          )}
        </div>

        {/* Bio Snippet */}
        {bio && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{bio}</p>}
      </div>

      {/* Card Footer: Pricing and Primary CTAs */}
      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Rate Display */}
        <div className="shrink-0">
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
              {isBn ? 'আলোচনা সাপেক্ষে' : 'Negotiable'}
            </span>
          )}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Link href={bookingPath} className="flex-1 sm:flex-initial">
            <Button
              size="sm"
              className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-3.5 py-2 rounded-xl"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              {isBn ? 'বুকিং অনুরোধ' : 'Request Tutoring'}
            </Button>
          </Link>

          <Link href={messagePath} className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-foreground font-semibold text-xs px-3 py-2 rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              {isBn ? 'বার্তা' : 'Message'}
            </Button>
          </Link>

          <Link href={profilePath} className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground text-xs px-2.5 py-2 rounded-xl"
              title={isBn ? 'সম্পূর্ণ প্রোফাইল দেখুন' : 'View Full Profile'}
            >
              <span className="hidden lg:inline">{isBn ? 'প্রোফাইল' : 'Profile'}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export interface SavedTutorsPageProps {
  locale: Locale;
  role?: 'student' | 'guardian' | 'admin';
}

export function SavedTutorsPage({ locale, role = 'student' }: SavedTutorsPageProps) {
  const isBn = locale === 'bn';

  const { data, isLoading, isError, refetch } = useGetSavedTutorsQuery();
  const [unsaveTutor, { isLoading: isRemoving }] = useUnsaveTutorMutation();
  const saved = useMemo(() => data?.data ?? [], [data?.data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SavedTutorsFilterMode>('all');
  const [sortBy, setSortBy] = useState<SavedTutorsSortOption>('recent');

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = saved.length;
    const topRated = saved.filter((item) => (item.profile?.ratingAverage ?? 0) >= 4.5).length;
    const online = saved.filter((item) => item.profile?.teachingModes?.includes('online')).length;
    const inPerson = saved.filter((item) =>
      item.profile?.teachingModes?.includes('in_person'),
    ).length;
    return { total, topRated, online, inPerson };
  }, [saved]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...saved];

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const p = item.profile;
        if (!p) return false;
        const nameEn = (p.displayNameEn || '').toLowerCase();
        const nameBn = (p.displayNameBn || '').toLowerCase();
        const headlineEn = (p.headlineEn || '').toLowerCase();
        const headlineBn = (p.headlineBn || '').toLowerCase();
        const subjects = (p.subjects || [])
          .map((s) => `${s.subjectNameEn || ''} ${s.subjectNameBn || ''}`.toLowerCase())
          .join(' ');
        const areas = (p.serviceAreas || [])
          .map((a) => `${a.districtNameEn || ''} ${a.districtNameBn || ''}`.toLowerCase())
          .join(' ');

        return (
          nameEn.includes(q) ||
          nameBn.includes(q) ||
          headlineEn.includes(q) ||
          headlineBn.includes(q) ||
          subjects.includes(q) ||
          areas.includes(q)
        );
      });
    }

    // Filter mode
    if (filterMode === 'top_rated') {
      result = result.filter((item) => (item.profile?.ratingAverage ?? 0) >= 4.5);
    } else if (filterMode === 'online') {
      result = result.filter((item) => item.profile?.teachingModes?.includes('online'));
    } else if (filterMode === 'in_person') {
      result = result.filter((item) => item.profile?.teachingModes?.includes('in_person'));
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === 'rating') {
        const rA = a.profile?.ratingAverage ?? 0;
        const rB = b.profile?.ratingAverage ?? 0;
        return rB - rA;
      }
      if (sortBy === 'experience') {
        const eA = a.profile?.yearsExperience ?? 0;
        const eB = b.profile?.yearsExperience ?? 0;
        return eB - eA;
      }
      if (sortBy === 'price_asc') {
        const pA = Number(a.profile?.hourlyRateMinor ?? 0);
        const pB = Number(b.profile?.hourlyRateMinor ?? 0);
        return pA - pB;
      }
      if (sortBy === 'price_desc') {
        const pA = Number(a.profile?.hourlyRateMinor ?? 0);
        const pB = Number(b.profile?.hourlyRateMinor ?? 0);
        return pB - pA;
      }
      // 'recent' by default
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });

    return result;
  }, [saved, searchQuery, filterMode, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterMode('all');
    setSortBy('recent');
  };

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? 'সংরক্ষিত শিক্ষক' : 'Saved Tutors'}
      subtitle={
        isBn
          ? 'পছন্দের যাচাইকৃত শিক্ষকদের শর্টলিস্ট — সরাসরি বুকিং অনুরোধ পাঠান বা বার্তা বিনিময় করুন'
          : 'Your curated shortlist of verified tutors — request sessions or message directly'
      }
    >
      <div className="w-full flex flex-col gap-6">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Bookmark className="w-5 h-5 fill-blue-600/20" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {isBn ? 'মোট সংরক্ষিত' : 'Total Saved'}
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatLocalizedNumber(metrics.total, locale)} {isBn ? 'জন' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Star className="w-5 h-5 fill-amber-500/20 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {isBn ? 'শীর্ষ রেটেড (৪.৫+)' : 'Top Rated (4.5+)'}
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatLocalizedNumber(metrics.topRated, locale)} {isBn ? 'জন' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Video className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {isBn ? 'অনলাইন ক্লাস' : 'Online Ready'}
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatLocalizedNumber(metrics.online, locale)} {isBn ? 'জন' : ''}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <GraduationCap className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {isBn ? 'হোম টিউশন' : 'In-Person'}
                </p>
                <p className="text-xl font-black text-foreground tabular-nums">
                  {formatLocalizedNumber(metrics.inPerson, locale)} {isBn ? 'জন' : ''}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search, Filter Tabs & Sort Controls */}
        <Card className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder={
                  isBn
                    ? 'শিক্ষকের নাম, বিষয় বা জেলা দিয়ে খুঁজুন...'
                    : 'Search by name, subject, or district...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 text-foreground placeholder:text-slate-400 focus-visible:ring-blue-500"
                data-testid="saved-tutors-search"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-muted-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="w-full md:w-56 shrink-0">
              <NativeSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SavedTutorsSortOption)}
                aria-label={isBn ? 'সাজানোর ক্রম' : 'Sort by'}
                data-testid="saved-tutors-sort"
              >
                <option value="recent">{isBn ? 'সর্বশেষ সংরক্ষিত' : 'Recently Saved'}</option>
                <option value="rating">{isBn ? 'সর্বোচ্চ রেটিং' : 'Highest Rating'}</option>
                <option value="experience">{isBn ? 'সর্বোচ্চ অভিজ্ঞতা' : 'Most Experience'}</option>
                <option value="price_asc">
                  {isBn ? 'ফি: কম থেকে বেশি' : 'Price: Low to High'}
                </option>
                <option value="price_desc">
                  {isBn ? 'ফি: বেশি থেকে কম' : 'Price: High to Low'}
                </option>
              </NativeSelect>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="filter-all"
              >
                {isBn ? 'সকল শিক্ষক' : 'All Tutors'} ({formatLocalizedNumber(metrics.total, locale)}
                )
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('top_rated')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterMode === 'top_rated'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="filter-top-rated"
              >
                {isBn ? 'শীর্ষ রেটেড' : 'Top Rated'} (
                {formatLocalizedNumber(metrics.topRated, locale)})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('online')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterMode === 'online'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="filter-online"
              >
                {isBn ? 'অনলাইন' : 'Online'} ({formatLocalizedNumber(metrics.online, locale)})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('in_person')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                  filterMode === 'in_person'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="filter-in-person"
              >
                {isBn ? 'হোম টিউশন' : 'In-Person'} (
                {formatLocalizedNumber(metrics.inPerson, locale)})
              </button>
            </div>

            {(searchQuery || filterMode !== 'all' || sortBy !== 'recent') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {isBn ? 'ফিল্টার রিসেট' : 'Reset filters'}
              </Button>
            )}
          </div>
        </Card>

        {/* Content Listing Section */}
        {isLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-muted-foreground">
            {isBn ? 'সংরক্ষিত শিক্ষক লোড হচ্ছে...' : 'Loading saved tutors...'}
          </div>
        ) : isError ? (
          <Card className="py-12 text-center rounded-xl border-rose-200 bg-rose-50/30">
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-rose-900">
                {isBn
                  ? 'সংরক্ষিত শিক্ষকের তালিকা লোড করা যায়নি।'
                  : 'Failed to load your saved tutors list.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="border-rose-300 text-rose-800"
              >
                {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        ) : saved.length === 0 ? (
          /* Empty state: No saved tutors in DB */
          <Card className="py-16 text-center rounded-xl border border-border bg-card">
            <CardContent className="max-w-md mx-auto flex flex-col gap-4">
              <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bookmark className="w-8 h-8 fill-blue-600/20" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-black text-foreground">
                  {isBn ? 'কোনো সংরক্ষিত শিক্ষক নেই' : 'No saved tutors yet'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'শিক্ষক ডিরেক্টরি ব্রাউজ করুন এবং আপনার পছন্দের শিক্ষকদের বুকমার্ক করে রাখুন যাতে পরবর্তীতে সহজে বুকিং বা যোগাযোগ করতে পারেন।'
                    : 'Explore the tutor directory and bookmark verified teachers to compare and book later.'}
                </p>
              </div>
              <div className="pt-2">
                <Link href={withLocale('/tutors', locale)}>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl">
                    <Search className="w-4 h-4" aria-hidden="true" />
                    {isBn ? 'শিক্ষক খুঁজুন' : 'Browse Tutors'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          /* Empty state: Search/Filter returned 0 results */
          <Card className="py-16 text-center rounded-xl border border-border bg-card">
            <CardContent className="max-w-md mx-auto flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-muted-foreground flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'কোনো শিক্ষক খুঁজে পাওয়া যায়নি' : 'No matching tutors found'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'আপনার সার্চ কুয়েরি অথবা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।'
                  : 'Try adjusting your search query or reset filters to see your saved tutors.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs font-bold border-slate-300"
              >
                {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Grid of Saved Tutors */
          <div
            className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5"
            data-testid="saved-tutors-list"
          >
            {filteredItems.map((item) => (
              <SavedTutorCard
                key={item.tutorId}
                item={item}
                locale={locale}
                role={role}
                isRemoving={isRemoving}
                onRemove={(tutorId) => {
                  void unsaveTutor(tutorId);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
