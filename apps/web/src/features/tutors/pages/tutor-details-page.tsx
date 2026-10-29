'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  Send,
  Sparkles,
  Star,
  ShieldCheck,
  Check,
  MessageSquare,
  UserCheck,
  Award,
  Lock,
} from 'lucide-react';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatTimeString12h } from '@/lib/format';
import {
  useGetTutorPublicProfileQuery,
  useGetSavedTutorsQuery,
  useSaveTutorMutation,
  useUnsaveTutorMutation,
} from '@/store/services/tutors-api';
import { useGetTutorReviewsQuery } from '@/store/services/trust-api';
import { useCreateBookingRequestMutation } from '@/store/services/bookings-api';
import { useGetLinkedChildrenQuery } from '@/store/services/guardians-api';
import { useAppSelector } from '@/store';
import { normalizeUnknownError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import {
  WEEKDAY_LABELS,
  type TutorCardData,
} from '@/features/tutor-discovery/types/tutor-discovery.types';
import { BookingRequestModal } from '@/features/tutor-discovery/components/bookingRequestModal';

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getShiftLabel(startLocal: string, isBn: boolean): string {
  const hour = parseInt(startLocal.split(':')[0] || '0', 10);
  if (hour >= 17) return isBn ? 'সন্ধ্যা সেশন' : 'Evening Session';
  if (hour >= 12) return isBn ? 'দুপুর/বিকাল' : 'Afternoon Session';
  return isBn ? 'সকাল সেশন' : 'Morning Session';
}

function getDurationHours(startLocal: string, endLocal: string, locale: Locale): string {
  const startHour = parseInt(startLocal.split(':')[0] || '0', 10);
  const startMin = parseInt(startLocal.split(':')[1] || '0', 10);
  const endHour = parseInt(endLocal.split(':')[0] || '0', 10);
  const endMin = parseInt(endLocal.split(':')[1] || '0', 10);

  const totalMin = endHour * 60 + endMin - (startHour * 60 + startMin);
  if (totalMin <= 0) return '';
  const hrs = totalMin / 60;
  const isBn = locale === 'bn';
  return `${formatLocalizedNumber(hrs % 1 === 0 ? hrs : hrs.toFixed(1), locale)} ${isBn ? 'ঘণ্টা' : 'hrs'}`;
}

function SectionCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-5 sm:p-6 lg:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            {icon}
          </div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground tracking-tight">
            {title}
          </h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function TutorDetailsPage({ tutorId, locale }: { tutorId: string; locale: Locale }) {
  const isBn = locale === 'bn';
  const currentUser = useAppSelector((state) => state.auth.user);

  const profileQuery = useGetTutorPublicProfileQuery(tutorId);
  const profile = profileQuery.data?.data;

  const displayName = profile
    ? isBn
      ? profile.displayNameBn || profile.displayNameEn || ''
      : profile.displayNameEn || profile.displayNameBn || ''
    : '';

  const headline = profile
    ? isBn
      ? profile.headlineBn || profile.headlineEn
      : profile.headlineEn || profile.headlineBn
    : null;

  const bio = profile
    ? isBn
      ? profile.bioBn || profile.bioEn
      : profile.bioEn || profile.bioBn
    : null;

  const reviewsQuery = useGetTutorReviewsQuery({ tutorId }, { skip: !profile });
  const reviews = reviewsQuery.data?.data ?? [];

  const savedQuery = useGetSavedTutorsQuery(undefined, { skip: !currentUser });
  const isSaved = (savedQuery.data?.data ?? []).some((item) => item.tutorId === tutorId);
  const [saveTutor, { isLoading: isSaving }] = useSaveTutorMutation();
  const [unsaveTutor, { isLoading: isUnsaving }] = useUnsaveTutorMutation();

  const childrenQuery = useGetLinkedChildrenQuery(undefined, {
    skip: !currentUser?.roles?.includes('guardian'),
  });
  const [createBookingRequest, { isLoading: isBookingSubmitting }] =
    useCreateBookingRequestMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectEntryId, setSelectedSubjectEntryId] = useState('');
  const [selectedMode, setSelectedMode] = useState<'online' | 'in_person' | 'hybrid'>('online');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const subjects = profile?.subjects ?? [];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectEntryId) ?? subjects[0];

  const studentOptions = useMemo(() => {
    if (currentUser?.roles?.includes('guardian')) {
      return (childrenQuery.data ?? [])
        .filter((c) => c.status === 'active')
        .map((c) => ({ id: c.studentId, label: c.displayName }));
    }
    if (currentUser?.roles?.includes('student') && currentUser) {
      return [{ id: currentUser.id, label: currentUser.displayName }];
    }
    return [];
  }, [currentUser, childrenQuery.data]);

  const levelOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjects) {
      if (s.educationLevelId) {
        const name = isBn ? s.educationLevelNameBn : s.educationLevelNameEn;
        map.set(s.educationLevelId, name || s.educationLevelId);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [subjects, isBn]);

  React.useEffect(() => {
    if (studentOptions.length > 0 && !selectedStudentId) setSelectedStudentId(studentOptions[0].id);
  }, [studentOptions, selectedStudentId]);

  React.useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectEntryId) {
      setSelectedSubjectEntryId(subjects[0].id);
      setSelectedMode(
        profile?.teachingModes?.includes('online')
          ? 'online'
          : ((profile?.teachingModes?.[0] as 'in_person' | 'hybrid') ?? 'in_person'),
      );
    }
  }, [subjects, selectedSubjectEntryId, profile?.teachingModes]);

  const tutorCardData: TutorCardData | null = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      displayName: displayName,
      avatarUrl: profile.avatarUrl,
      headline: headline,
      bio: bio,
      headlineEn: profile.headlineEn,
      headlineBn: profile.headlineBn,
      bioEn: profile.bioEn,
      bioBn: profile.bioBn,
      yearsExperience: profile.yearsExperience,
      teachingModes: profile.teachingModes,
      hourlyRateMinor: profile.hourlyRateMinor,
      currency: profile.currency,
      responseTimeMinutes: profile.responseTimeMinutes,
      badges: profile.badges,
      matchScore: 100,
      rankingReasons: [],
      subjects: profile.subjects.map((s) => ({
        id: s.id,
        subjectId: s.subjectId,
        subjectNameEn: s.subjectNameEn,
        subjectNameBn: s.subjectNameBn,
        educationLevelNameEn: s.educationLevelNameEn,
        educationLevelNameBn: s.educationLevelNameBn,
        rateMinor: s.rateMinor,
      })),
      serviceAreas: profile.serviceAreas.map((a) => ({
        districtCode: a.districtCode,
        districtNameEn: a.districtNameEn,
        districtNameBn: a.districtNameBn,
        localityNameEn: a.localityNameEn,
        localityNameBn: a.localityNameBn,
      })),
      ratingAverage: profile.ratingAverage,
      totalReviews: profile.totalReviews,
      nextAvailableWeekday: profile.nextAvailableWeekday,
    };
  }, [profile, displayName, headline, bio]);

  const handleToggleSave = async () => {
    if (!currentUser) return;
    setSaveError(null);
    try {
      if (isSaved) await unsaveTutor(tutorId).unwrap();
      else await saveTutor(tutorId).unwrap();
    } catch (err) {
      setSaveError(normalizeUnknownError(err, locale).message);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    if (!currentUser) {
      setBookingError(
        isBn
          ? 'অনুরোধ পাঠাতে অনুগ্রহ করে লগইন করুন।'
          : 'Please sign in to send a tutoring request.',
      );
      return;
    }

    const studentId = selectedStudentId || currentUser?.id;
    if (!studentId || !selectedSubject) {
      setBookingError(
        isBn
          ? 'অনুগ্রহ করে শিক্ষার্থী ও বিষয় নির্বাচন করুন।'
          : 'Please select a student and a subject.',
      );
      return;
    }

    try {
      await createBookingRequest({
        tutorId,
        studentId,
        subjectId: selectedSubject.subjectId,
        educationLevelId: selectedSubject.educationLevelId ?? '',
        mode: selectedMode,
        messageNotes: bookingNotes,
        preferredDays: selectedDays.map((d) => DAY_MAP[d] ?? 0),
      }).unwrap();

      setBookingSuccess(
        isBn
          ? 'টিউশন অনুরোধ সফলভাবে পাঠানো হয়েছে! শিক্ষক দ্রুত উত্তর দেবেন।'
          : 'Booking request sent successfully! The tutor will respond soon.',
      );
    } catch (err: unknown) {
      setBookingError(normalizeUnknownError(err, locale).message);
    }
  };

  const toggleDay = (day: string) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleOpenRequestModal = () => {
    setBookingError(null);
    setBookingSuccess(null);
    setIsModalOpen(true);
  };

  if (profileQuery.isLoading || profileQuery.isFetching) {
    return (
      <div
        className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8"
        data-testid="profile-loading"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-pulse" aria-hidden="true">
          <div className="h-56 rounded-xl bg-card border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="h-44 rounded-xl bg-card border border-border" />
              <div className="h-60 rounded-xl bg-card border border-border" />
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="h-80 rounded-xl bg-card border border-border" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50/60 py-16 px-4" data-testid="profile-unavailable">
        <div className="max-w-xl mx-auto rounded-xl border border-border bg-card p-6 sm:p-10 text-center flex flex-col gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-300 mx-auto">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground">
            {isBn ? 'এই প্রোফাইলটি পাওয়া যায়নি' : 'This tutor profile is unavailable'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isBn
              ? 'শিক্ষকটি বর্তমানে প্ল্যাটফর্মে সক্রিয় নাও হতে পারেন অথবা প্রোফাইলটি পুনঃযাচাইাধীন রয়েছে।'
              : 'The tutor may no longer be publicly verified or bookable at this moment.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => profileQuery.refetch()}
              className="rounded-xl font-semibold border-slate-300 text-foreground"
            >
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
            <Link
              href={withLocale('/tutors', locale)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {isBn ? 'শিক্ষক তালিকায় ফিরুন' : 'Back to tutors'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = displayName
    ? displayName
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

  const expYears = profile.yearsExperience
    ? formatLocalizedNumber(profile.yearsExperience, locale)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground py-4 sm:py-8 px-3 sm:px-6 lg:px-8 flex flex-col gap-5 sm:gap-8">
      {/* Navigation & Action Bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
        <Link
          href={withLocale('/tutors', locale)}
          className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 font-bold group transition-colors"
        >
          <ArrowLeft
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
            aria-hidden="true"
          />
          <span>{isBn ? 'শিক্ষক তালিকায় ফিরুন' : 'Back to tutors'}</span>
        </Link>

        {currentUser && (
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isSaving || isUnsaving}
            data-testid="profile-save-toggle"
            aria-pressed={isSaved}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
              isSaved
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-300 bg-white text-muted-foreground hover:border-blue-500 hover:text-foreground'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isSaved ? 'fill-blue-700 text-blue-700' : 'text-muted-foreground'}`}
              aria-hidden="true"
            />
            <span>
              {isSaved
                ? isBn
                  ? 'সংরক্ষিত শিক্ষক'
                  : 'Saved Tutor'
                : isBn
                  ? 'বুকমার্কে রাখুন'
                  : 'Save tutor'}
            </span>
          </button>
        )}
      </div>

      {saveError && (
        <Alert variant="destructive" className="max-w-7xl mx-auto rounded-xl">
          <AlertDescription role="alert">{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Hero Profile Banner */}
      <div className="max-w-7xl mx-auto rounded-xl bg-card border border-border p-5 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
          {/* Avatar and Main Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 flex-1 min-w-0 w-full sm:w-auto">
            {/* High-res Avatar with Active Pulse */}
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-xl object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-2xl sm:text-3xl lg:text-4xl">
                  {initials}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-500/30"
                title={isBn ? 'সক্রিয় ও যাচাইকৃত শিক্ষক' : 'Active Verified Tutor'}
              />
            </div>

            {/* Title, Headline & Badges */}
            <div className="flex flex-col gap-2.5 flex-1 min-w-0 w-full">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                  {displayName}
                </h1>
                {headline && (
                  <p className="text-xs sm:text-sm lg:text-base font-bold text-blue-700 mt-1 leading-snug">
                    {headline}
                  </p>
                )}
              </div>

              {/* Rating, Experience, & Stats Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs sm:text-sm">
                {profile.totalReviews > 0 && profile.ratingAverage != null ? (
                  <span
                    className="inline-flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-300"
                    data-testid="profile-rating"
                  >
                    <Star className="w-4 h-4 fill-amber-500 text-amber-600" aria-hidden="true" />
                    <span>{formatLocalizedNumber(profile.ratingAverage, locale)}</span>
                    <span className="text-muted-foreground font-medium">
                      ({formatLocalizedNumber(profile.totalReviews, locale)}{' '}
                      {isBn ? 'রিভিউ' : 'reviews'})
                    </span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-slate-100 px-3 py-1 rounded-full border border-slate-300"
                    data-testid="profile-no-rating"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    {isBn ? 'নতুন শিক্ষক — এখনো কোনো রিভিউ নেই' : 'New educator — no reviews yet'}
                  </span>
                )}

                {expYears && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <span>
                      {expYears} {isBn ? 'বছরের অভিজ্ঞতা' : 'yrs experience'}
                    </span>
                  </span>
                )}

                {profile.completedSessions > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>
                      {formatLocalizedNumber(profile.completedSessions, locale)}{' '}
                      {isBn ? 'সফল ক্লাস' : 'completed sessions'}
                    </span>
                  </span>
                )}
              </div>

              {/* Trust & Verification Badges with Strong Contrast */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor'}
                </span>

                {profile.badges.includes('verified_identity') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    {isBn ? 'এনআইডি ভেরিফাইড' : 'NID Verified'}
                  </span>
                )}

                {profile.badges.includes('verified_academic') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-700" aria-hidden="true" />
                    {isBn ? 'শিক্ষাগত সনদ অনুমোদিত' : 'Academic Verified'}
                  </span>
                )}

                {profile.badges.includes('verified_institutional') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-300">
                    <Award className="w-3.5 h-3.5 text-purple-700" aria-hidden="true" />
                    {isBn ? 'প্রাতিষ্ঠানিক সনদ অনুমোদিত' : 'Institutional Verified'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Quick Booking Action Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-center lg:items-end justify-between gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
            <div className="text-center sm:text-left lg:text-right">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block">
                {isBn ? 'ঘণ্টাপ্রতি টিউশন ফি' : 'Hourly rate'}
              </span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tabular-nums tracking-tight">
                {hourlyRate ? `৳${hourlyRate}` : isBn ? 'আলোচনা সাপেক্ষে' : 'Negotiable'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenRequestModal}
              data-testid="request-tutoring-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 text-sm transition-colors w-full sm:w-auto cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{isBn ? 'টিউশন অনুরোধ পাঠান' : 'Request Tutoring'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Bio, Qualifications, Subjects, Reviews */}
        <div className="lg:col-span-8 flex flex-col gap-6 sm:gap-8">
          {/* About Section */}
          {bio && (
            <SectionCard
              title={isBn ? 'শিক্ষক পরিচিতি ও পাঠদান পদ্ধতি' : 'About the Educator'}
              icon={<BookOpen className="w-5 h-5 text-blue-700" aria-hidden="true" />}
            >
              <div className="relative pl-4 border-l-3 border-blue-500/40">
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line font-normal">
                  {bio}
                </p>
              </div>
            </SectionCard>
          )}

          {/* Qualifications & Degrees */}
          <SectionCard
            title={isBn ? 'শিক্ষাগত যোগ্যতা ও সনদ' : 'Educational Qualifications & Credentials'}
            icon={<GraduationCap className="w-5 h-5 text-blue-700" aria-hidden="true" />}
            badge={
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                {isBn ? 'অগ্রণী দ্বারা যাচাইকৃত' : 'Ogroni Verified'}
              </span>
            }
          >
            {(profile.qualifications ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="no-qualifications">
                {isBn ? 'কোনো যাচাইকৃত যোগ্যতা নেই।' : 'No approved qualification recorded.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(profile.qualifications ?? []).map((q) => {
                  const qTitle = isBn ? q.titleBn || q.titleEn : q.titleEn || q.titleBn;
                  const qInstitution = isBn
                    ? q.institutionBn || q.institutionEn
                    : q.institutionEn || q.institutionBn;
                  return (
                    <div
                      key={q.id}
                      className="flex items-start gap-3.5 sm:gap-4 rounded-xl border border-border bg-card p-3.5 sm:p-5 hover:border-blue-500/40 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-foreground text-sm sm:text-base leading-snug">
                            {qTitle}
                          </p>
                          <span className="inline-flex shrink-0 items-center text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                            {isBn ? 'যাচাইকৃত' : 'Verified'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                          {[
                            qInstitution,
                            q.issuedYear ? formatLocalizedNumber(q.issuedYear, locale) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Subjects & Levels */}
          <SectionCard
            title={isBn ? 'বিষয় ও পাঠদানের শ্রেণি' : 'Subjects & Levels Offered'}
            icon={<Sparkles className="w-5 h-5 text-blue-700" aria-hidden="true" />}
          >
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isBn ? 'কোনো বিষয় যোগ করা হয়নি।' : 'No subject configured.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:border-blue-500/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm sm:text-base truncate">
                        {isBn ? s.subjectNameBn : s.subjectNameEn}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
                        {isBn ? s.educationLevelNameBn : s.educationLevelNameEn}
                      </p>
                    </div>
                    {s.rateMinor && (
                      <span className="shrink-0 text-xs font-black text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                        ৳{formatLocalizedNumber(Number(s.rateMinor) / 100, locale)}/
                        {isBn ? 'ঘণ্টা' : 'hr'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Student Reviews & Testimonials */}
          <SectionCard
            title={isBn ? 'শিক্ষার্থীদের রিভিউ ও মতামত' : 'Student Reviews & Feedback'}
            icon={<Star className="w-5 h-5 text-amber-500" aria-hidden="true" />}
            badge={
              profile.totalReviews > 0 ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  {formatLocalizedNumber(profile.ratingAverage ?? 5, locale)} /{' '}
                  {isBn ? '৫.০' : '5.0'}
                </span>
              ) : undefined
            }
          >
            {reviewsQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                {isBn ? 'রিভিউ লোড হচ্ছে...' : 'Loading reviews...'}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center flex flex-col gap-2" data-testid="no-reviews">
                <p className="text-sm font-bold text-foreground">
                  {isBn ? 'এখনো কোনো রিভিউ প্রকাশিত হয়নি।' : 'No published reviews yet.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'শিক্ষার্থীর ক্লাস সম্পন্ন হওয়ার পর তাঁর দেওয়া সত্যানুসন্ধানী মতামত এখানে প্রকাশ পাবে।'
                    : 'Reviews will appear here once students complete their tutoring sessions.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4" data-testid="tutor-review-list">
                {reviews.map((review) => {
                  const reviewerName = isBn
                    ? review.reviewerDisplayNameBn || review.reviewerDisplayName || 'শিক্ষার্থী'
                    : review.reviewerDisplayNameEn || review.reviewerDisplayName || 'Student';
                  const commentText = isBn
                    ? review.commentBn || review.comment
                    : review.commentEn || review.comment;
                  const replyText = isBn
                    ? review.tutorResponseBn || review.tutorResponse
                    : review.tutorResponseEn || review.tutorResponse;

                  return (
                    <div
                      key={review.id}
                      className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-black text-xs border border-blue-200">
                            {reviewerName ? reviewerName[0] : 'S'}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-foreground">
                              {reviewerName}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <Check className="w-3.5 h-3.5" />
                              {isBn ? 'ভেরিফাইড শিক্ষার্থী' : 'Verified Student'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                          <Star
                            className="w-3.5 h-3.5 fill-amber-500 text-amber-600"
                            aria-hidden="true"
                          />
                          <span>{formatLocalizedNumber(review.rating, locale)}</span>
                        </div>
                      </div>

                      {/* Multi-Criteria Breakdown Badges */}
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {review.punctualityRating != null && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-foreground border border-border">
                            ⏱ {isBn ? 'সময়নিষ্ঠতা' : 'Punctuality'}:{' '}
                            {formatLocalizedNumber(review.punctualityRating, locale)}/5
                          </span>
                        )}
                        {review.teachingClarityRating != null && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-foreground border border-border">
                            💡 {isBn ? 'পাঠদান স্পষ্টতা' : 'Clarity'}:{' '}
                            {formatLocalizedNumber(review.teachingClarityRating, locale)}/5
                          </span>
                        )}
                        {review.subjectMasteryRating != null && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-foreground border border-border">
                            📚 {isBn ? 'বিষয় দক্ষতা' : 'Mastery'}:{' '}
                            {formatLocalizedNumber(review.subjectMasteryRating, locale)}/5
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-foreground leading-relaxed font-normal">
                        "{commentText}"
                      </p>

                      {replyText && (
                        <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3.5 text-xs text-foreground flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <MessageSquare
                              className="w-3.5 h-3.5 text-blue-700"
                              aria-hidden="true"
                            />
                            <span>{isBn ? 'শিক্ষকের উত্তর' : 'Tutor Reply'}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{replyText}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Sidebar: Service Area, Availability & Booking Form */}
        <div className="lg:col-span-4 flex flex-col gap-6" id="booking-section">
          {/* Service Areas & Availability Schedule */}
          <SectionCard
            title={isBn ? 'সেবা এলাকা ও সময়সূচি' : 'Service Areas & Schedule'}
            icon={<MapPin className="w-5 h-5 text-blue-700" aria-hidden="true" />}
          >
            <div className="flex flex-col gap-4 text-sm">
              {/* Service Areas */}
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  {isBn ? 'কভারেজ এলাকা' : 'Service Locations'}
                </span>
                {profile.serviceAreas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isBn ? 'সেবা এলাকা নির্ধারিত নয়।' : 'No service area listed.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.serviceAreas.map((area) => {
                      const areaLocality = isBn
                        ? area.localityNameBn || area.districtNameBn || area.districtCode
                        : area.localityNameEn || area.districtNameEn || area.districtCode;
                      return (
                        <span
                          key={area.id ?? `${area.districtCode}-${areaLocality}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-foreground"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>
                            {areaLocality}
                            {area.radiusKm
                              ? ` · ${formatLocalizedNumber(area.radiusKm, locale)} ${isBn ? 'কিমি' : 'km'}`
                              : ''}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Teaching Modes */}
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  {isBn ? 'পাঠদানের মাধ্যম' : 'Teaching Modes'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.teachingModes.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-xl border border-blue-300 bg-blue-50 text-blue-800 px-3 py-1 text-xs font-bold"
                    >
                      {mode === 'online'
                        ? isBn
                          ? 'অনলাইন ক্লাস'
                          : 'Online'
                        : mode === 'in_person'
                          ? isBn
                            ? 'হোম টিউশন'
                            : 'In-person'
                          : isBn
                            ? 'হাইব্রিড'
                            : 'Hybrid'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weekly Time Slots - 12-Hour Timeline */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    {isBn ? 'সাপ্তাহিক ক্লাসের সময়সূচি' : 'Weekly Availability'}
                  </span>
                  {(profile.availability?.length ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      {formatLocalizedNumber(profile.availability?.length ?? 0, locale)}{' '}
                      {isBn ? 'দিন উপলব্ধ' : 'days available'}
                    </span>
                  )}
                </div>

                {(profile.availability?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isBn ? 'সময়সূচি নির্ধারিত নয়' : 'No availability published'}
                  </p>
                ) : (
                  <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-blue-300 before:to-muted/40 flex flex-col gap-2.5">
                    {(profile.availability ?? []).map((slot) => {
                      const dayName = isBn
                        ? WEEKDAY_LABELS[slot.weekday]?.bn
                        : WEEKDAY_LABELS[slot.weekday]?.en;
                      const start12 = formatTimeString12h(slot.startLocal, locale);
                      const end12 = formatTimeString12h(slot.endLocal, locale);
                      const shiftLabel = getShiftLabel(slot.startLocal, isBn);
                      const durationStr = getDurationHours(slot.startLocal, slot.endLocal, locale);

                      return (
                        <div
                          key={`${slot.weekday}-${slot.startLocal}-${slot.endLocal}`}
                          className="relative flex items-center justify-between rounded-xl bg-card border border-border p-3 shadow-xs hover:border-primary/40 transition-all"
                        >
                          {/* Timeline node */}
                          <div className="absolute -left-5 mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/20 ring-4 ring-background border-2 border-primary" />

                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-xs">{dayName}</span>
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                {shiftLabel}
                              </span>
                            </div>
                            {durationStr && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {durationStr} {isBn ? 'সেশন উইন্ডো' : 'session window'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 font-bold text-xs bg-slate-50 dark:bg-muted/40 border border-border px-2.5 py-1 rounded-lg text-foreground font-mono">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {start12} — {end12}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Tutoring Booking Journey & Quick CTA Card - NO INLINE FORM */}
          <SectionCard
            title={isBn ? 'বুকিং প্রক্রিয়া ও টিউশন শুরু' : 'How Booking Works'}
            icon={<Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />}
            badge={
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {isBn ? '৩টি সহজ ধাপ' : '3 Easy Steps'}
              </span>
            }
          >
            <div className="flex flex-col gap-5 text-xs">
              {/* 3-Step Visual Process Timeline */}
              <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-blue-300 before:to-muted/40 flex flex-col gap-4">
                {/* Step 1 */}
                <div className="relative flex flex-col gap-1">
                  <div className="absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[10px] ring-4 ring-background shadow-xs">
                    ১
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">
                      {isBn ? 'অনুরোধ পাঠান' : 'Submit Booking Request'}
                    </span>
                    <span className="text-[10px] font-semibold text-primary">
                      {isBn ? 'ধাপ ১' : 'Step 1'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isBn
                      ? 'বিষয়, শ্রেণি, পাঠদান মাধ্যম ও পছন্দের দিন-সময় উল্লেখ করে টিউশন অনুরোধ পাঠান।'
                      : 'Select student, subject, preferred learning mode, and weekly schedule.'}
                  </p>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col gap-1">
                  <div className="absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[10px] ring-4 ring-background shadow-xs">
                    ২
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">
                      {isBn ? 'শিক্ষক পর্যালোচনা ও কনফার্মেশন' : 'Tutor Acceptance'}
                    </span>
                    <span className="text-[10px] font-semibold text-primary">
                      {isBn ? 'ধাপ ২' : 'Step 2'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isBn
                      ? 'শিক্ষক আপনার পাঠ্যসূচি যাচাই করবেন এবং আলোচনার মাধ্যমে ক্লাস সময়সূচি চূড়ান্ত করবেন।'
                      : 'The tutor reviews your requirements and confirms matching schedule slots.'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col gap-1">
                  <div className="absolute -left-6 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-[10px] ring-4 ring-background shadow-xs">
                    ৩
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">
                      {isBn ? 'নিরাপদ এসক্রো ও ক্লাস শুরু' : 'Escrow Protected Learning'}
                    </span>
                    <span className="text-[10px] font-semibold text-primary">
                      {isBn ? 'ধাপ ৩' : 'Step 3'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isBn
                      ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন হওয়ার পরই কেবল শিক্ষকের কাছে ফি ছাড় করা হয়। শতভাগ নিরাপদ।'
                      : 'Classes commence under 100% money-back escrow protection.'}
                  </p>
                </div>
              </div>

              {/* Primary Action Button (Triggers Modal) */}
              <div className="pt-1 flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleOpenRequestModal}
                  data-testid="request-tutoring-sidebar-btn"
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <Send className="w-4 h-4" />
                  <span>{isBn ? 'টিউশন অনুরোধ পাঠান' : 'Request Tutoring Now'}</span>
                </Button>

                {!currentUser && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    {isBn
                      ? 'অনুরোধ পাঠাতে অভিভাবক বা শিক্ষার্থী একাউন্টে লগইন প্রয়োজন।'
                      : 'Sign-in required to submit request.'}
                  </p>
                )}
              </div>

              {/* Escrow Guarantee Pill */}
              <div className="rounded-xl bg-muted/40 p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground border border-border">
                <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-foreground">
                    {isBn ? 'অগ্রণী এসক্রো গ্যারান্টি' : 'Ogroni Escrow Guarantee'}
                  </span>
                  <p className="leading-relaxed">
                    {isBn
                      ? 'শিক্ষক সম্মতি জানানোর পর ক্লাস শুরু হবে। সন্তোষজনক ক্লাসের পর পেমেন্ট শিক্ষকদের কাছে পৌঁছাবে।'
                      : 'Payment is safely held until session completion. Full refund if unsatisfied.'}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Global Interactive Booking Modal on Details Page */}
      {isModalOpen && tutorCardData && (
        <BookingRequestModal
          tutor={tutorCardData}
          locale={locale}
          availability={profile.availability}
          studentOptions={studentOptions}
          levelOptions={levelOptions}
          value={{
            studentId: selectedStudentId || studentOptions[0]?.id || '',
            subjectId: selectedSubject?.subjectId || '',
            levelId: selectedSubject?.educationLevelId || '',
            mode: selectedMode,
            days: selectedDays,
            notes: bookingNotes,
          }}
          isSubmitting={isBookingSubmitting}
          successMessage={bookingSuccess}
          error={bookingError}
          onChange={(patch) => {
            if (patch.studentId !== undefined) setSelectedStudentId(patch.studentId);
            if (patch.mode !== undefined) setSelectedMode(patch.mode);
            if (patch.notes !== undefined) setBookingNotes(patch.notes);
            if (patch.subjectId !== undefined) {
              const found = subjects.find((s) => s.subjectId === patch.subjectId);
              if (found) setSelectedSubjectEntryId(found.id);
            }
          }}
          onToggleDay={toggleDay}
          onSubmit={handleBookingSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
