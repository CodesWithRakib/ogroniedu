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
  Lock,
} from 'lucide-react';
import { Button, Textarea, Label, NativeSelect, Alert, AlertDescription } from '@/components/ui';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
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
import { WEEKDAY_LABELS, type TutorCardData } from '@/features/tutor-discovery/types/tutor-discovery.types';
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
    <div className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 lg:p-8 space-y-5 shadow-xs hover:border-blue-500/30 transition-all duration-300">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs shrink-0">
            {icon}
          </div>
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
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
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse" aria-hidden="true">
          <div className="h-56 rounded-3xl bg-white border border-slate-200" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-44 rounded-3xl bg-white border border-slate-200" />
              <div className="h-60 rounded-3xl bg-white border border-slate-200" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-80 rounded-3xl bg-white border border-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50/60 py-16 px-4" data-testid="profile-unavailable">
        <div className="max-w-xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-700 border border-amber-300 mx-auto">
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {isBn ? 'এই প্রোফাইলটি পাওয়া যায়নি' : 'This tutor profile is unavailable'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isBn
              ? 'শিক্ষকটি বর্তমানে প্ল্যাটফর্মে সক্রিয় নাও হতে পারেন অথবা প্রোফাইলটি পুনঃযাচাইাধীন রয়েছে।'
              : 'The tutor may no longer be publicly verified or bookable at this moment.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => profileQuery.refetch()}
              className="rounded-xl font-semibold border-slate-300 text-slate-800"
            >
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
            <Link
              href={withLocale('/tutors', locale)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-8">
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
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
              isSaved
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-slate-900'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isSaved ? 'fill-blue-700 text-blue-700' : 'text-slate-500'}`}
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
        <Alert variant="destructive" className="max-w-7xl mx-auto rounded-2xl">
          <AlertDescription role="alert">{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Hero Profile Banner */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
          {/* Avatar and Main Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 flex-1 min-w-0 w-full sm:w-auto">
            {/* High-res Avatar with Active Pulse */}
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-3xl object-cover ring-4 ring-blue-100 shadow-xs"
                />
              ) : (
                <div className="flex h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl sm:text-3xl lg:text-4xl shadow-xs">
                  {initials}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white bg-emerald-600 shadow-xs ring-2 ring-emerald-500/30"
                title={isBn ? 'সক্রিয় ও যাচাইকৃত শিক্ষক' : 'Active Verified Tutor'}
              />
            </div>

            {/* Title, Headline & Badges */}
            <div className="space-y-2.5 flex-1 min-w-0 w-full">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
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
                    className="inline-flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border-2 border-amber-300 shadow-2xs"
                    data-testid="profile-rating"
                  >
                    <Star className="w-4 h-4 fill-amber-500 text-amber-600" aria-hidden="true" />
                    <span>{formatLocalizedNumber(profile.ratingAverage, locale)}</span>
                    <span className="text-slate-700 font-medium">
                      ({formatLocalizedNumber(profile.totalReviews, locale)}{' '}
                      {isBn ? 'রিভিউ' : 'reviews'})
                    </span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-300 shadow-2xs"
                    data-testid="profile-no-rating"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    {isBn ? 'নতুন শিক্ষক — এখনো কোনো রিভিউ নেই' : 'New educator — no reviews yet'}
                  </span>
                )}

                {expYears && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-300 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                    <span>
                      {expYears} {isBn ? 'বছরের অভিজ্ঞতা' : 'yrs experience'}
                    </span>
                  </span>
                )}

                {profile.completedSessions > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border-2 border-emerald-300 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor'}
                </span>

                {profile.badges.includes('verified_identity') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border-2 border-blue-300 shadow-2xs">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    {isBn ? 'এনআইডি ভেরিফাইড' : 'NID Verified'}
                  </span>
                )}

                {profile.badges.includes('verified_academic') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border-2 border-indigo-300 shadow-2xs">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-700" aria-hidden="true" />
                    {isBn ? 'শিক্ষাগত সনদ অনুমোদিত' : 'Academic Verified'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Quick Booking Action Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-center lg:items-end justify-between gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200">
            <div className="text-center sm:text-left lg:text-right">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">
                {isBn ? 'ঘণ্টাপ্রতি টিউশন ফি' : 'Hourly rate'}
              </span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tabular-nums tracking-tight">
                {hourlyRate ? `৳${hourlyRate}` : isBn ? 'আলোচনা সাপেক্ষে' : 'Negotiable'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenRequestModal}
              data-testid="request-tutoring-btn"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3.5 text-sm shadow-xs shadow-blue-500/20 hover:shadow-xs hover:shadow-blue-500/30 transition-all duration-200 w-full sm:w-auto cursor-pointer active:scale-[0.98]"
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
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* About Section */}
          {bio && (
            <SectionCard
              title={isBn ? 'শিক্ষক পরিচিতি ও পাঠদান পদ্ধতি' : 'About the Educator'}
              icon={<BookOpen className="w-5 h-5 text-blue-700" aria-hidden="true" />}
            >
              <div className="relative pl-4 border-l-3 border-blue-500/40">
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-line font-normal">
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
              <p className="text-sm text-slate-500" data-testid="no-qualifications">
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
                      className="flex items-start gap-3.5 sm:gap-4 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 hover:border-blue-500/40 transition-colors shadow-2xs"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                            {qTitle}
                          </p>
                          <span className="inline-flex shrink-0 items-center text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                            {isBn ? 'যাচাইকৃত' : 'Verified'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                          {[qInstitution, q.issuedYear ? formatLocalizedNumber(q.issuedYear, locale) : null]
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
              <p className="text-sm text-slate-500">
                {isBn ? 'কোনো বিষয় যোগ করা হয়নি।' : 'No subject configured.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 hover:border-blue-500/40 transition-colors shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {isBn ? s.subjectNameBn : s.subjectNameEn}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 truncate font-medium">
                        {isBn ? s.educationLevelNameBn : s.educationLevelNameEn}
                      </p>
                    </div>
                    {s.rateMinor && (
                      <span className="shrink-0 text-xs font-black text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                        ৳{formatLocalizedNumber(Number(s.rateMinor) / 100, locale)}/{isBn ? 'ঘণ্টা' : 'hr'}
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
                  {formatLocalizedNumber(profile.ratingAverage ?? 5, locale)} / {isBn ? '৫.০' : '5.0'}
                </span>
              ) : undefined
            }
          >
            {reviewsQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-slate-500 animate-pulse">
                {isBn ? 'রিভিউ লোড হচ্ছে...' : 'Loading reviews...'}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center space-y-2" data-testid="no-reviews">
                <p className="text-sm font-bold text-slate-900">
                  {isBn ? 'এখনো কোনো রিভিউ প্রকাশিত হয়নি।' : 'No published reviews yet.'}
                </p>
                <p className="text-xs text-slate-600">
                  {isBn
                    ? 'শিক্ষার্থীর ক্লাস সম্পন্ন হওয়ার পর তাঁর দেওয়া সত্যানুসন্ধানী মতামত এখানে প্রকাশ পাবে।'
                    : 'Reviews will appear here once students complete their tutoring sessions.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="tutor-review-list">
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
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-black text-xs border border-blue-200">
                            {reviewerName ? reviewerName[0] : 'S'}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
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

                      <p className="text-sm text-slate-800 leading-relaxed font-normal">
                        "{commentText}"
                      </p>

                      {replyText && (
                        <div className="rounded-2xl bg-blue-50/80 border border-blue-200 p-3.5 text-xs text-slate-800 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                            <span>{isBn ? 'শিক্ষকের উত্তর' : 'Tutor Reply'}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{replyText}</p>
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
        <div className="lg:col-span-4 space-y-6" id="booking-section">
          {/* Service Areas & Availability Schedule */}
          <SectionCard
            title={isBn ? 'সেবা এলাকা ও সময়সূচি' : 'Service Areas & Schedule'}
            icon={<MapPin className="w-5 h-5 text-blue-700" aria-hidden="true" />}
          >
            <div className="space-y-4 text-sm">
              {/* Service Areas */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  {isBn ? 'কভারেজ এলাকা' : 'Service Locations'}
                </span>
                {profile.serviceAreas.length === 0 ? (
                  <p className="text-xs text-slate-500">
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span>
                            {areaLocality}
                            {area.radiusKm ? ` · ${formatLocalizedNumber(area.radiusKm, locale)} ${isBn ? 'কিমি' : 'km'}` : ''}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Teaching Modes */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  {isBn ? 'পাঠদানের মাধ্যম' : 'Teaching Modes'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.teachingModes.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-xl border border-blue-300 bg-blue-50 text-blue-800 px-3 py-1 text-xs font-bold shadow-2xs"
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

              {/* Weekly Time Slots */}
              <div className="border-t border-slate-200 pt-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  {isBn ? 'সাপ্তাহিক ক্লাসের সময়' : 'Available Days & Hours'}
                </span>

                {(profile.availability?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500">
                    {isBn ? 'সময়সূচি নির্ধারিত নয়' : 'No availability published'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(profile.availability ?? []).map((slot) => {
                      const dayName = isBn
                        ? WEEKDAY_LABELS[slot.weekday]?.bn
                        : WEEKDAY_LABELS[slot.weekday]?.en;
                      const start = slot.startLocal.slice(0, 5);
                      const end = slot.endLocal.slice(0, 5);
                      return (
                        <div
                          key={`${slot.weekday}-${slot.startLocal}-${slot.endLocal}`}
                          className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
                        >
                          <span className="font-bold text-slate-900">{dayName}</span>
                          <span className="text-slate-700 font-mono font-medium">
                            {start} — {end}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Tutoring Booking Request Card */}
          <SectionCard
            title={isBn ? 'টিউশন বুকিং অনুরোধ' : 'Request Tutoring Session'}
            icon={<Send className="w-5 h-5 text-blue-700" aria-hidden="true" />}
          >
            {!currentUser ? (
              <div className="space-y-4" data-testid="profile-login-required">
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {isBn
                    ? 'শিক্ষককে সরাসরি টিউশন অনুরোধ পাঠাতে অনুগ্রহ করে আপনার অভিভাবক বা শিক্ষার্থী অ্যাকাউন্টে লগইন করুন।'
                    : 'Sign in to send a direct tutoring booking request to this educator.'}
                </p>
                <Link href={withLocale('/login', locale)} className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-xs">
                    {isBn ? 'লগইন করুন' : 'Sign in'}
                  </Button>
                </Link>
              </div>
            ) : studentOptions.length === 0 ? (
              <p className="text-sm text-slate-500">
                {isBn
                  ? 'অনুরোধ পাঠাতে একজন শিক্ষার্থী প্রোফাইল প্রয়োজন।'
                  : 'A student profile is required to request tutoring.'}
              </p>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="student-select" className="text-xs font-bold text-slate-800">
                    {isBn ? 'শিক্ষার্থী নির্বাচন করুন' : 'Select Student'}
                  </Label>
                  <NativeSelect
                    id="student-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="text-xs rounded-xl border-slate-300 text-slate-900"
                  >
                    {studentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject-select" className="text-xs font-bold text-slate-800">
                    {isBn ? 'বিষয় ও শ্রেণি' : 'Subject & Level'}
                  </Label>
                  <NativeSelect
                    id="subject-select"
                    value={selectedSubject?.id ?? ''}
                    onChange={(e) => setSelectedSubjectEntryId(e.target.value)}
                    className="text-xs rounded-xl border-slate-300 text-slate-900"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(isBn ? s.subjectNameBn : s.subjectNameEn) +
                          ' — ' +
                          (isBn ? s.educationLevelNameBn : s.educationLevelNameEn)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mode-select" className="text-xs font-bold text-slate-800">
                    {isBn ? 'পাঠদানের পদ্ধতি' : 'Teaching Mode'}
                  </Label>
                  <NativeSelect
                    id="mode-select"
                    value={selectedMode}
                    onChange={(e) =>
                      setSelectedMode(e.target.value as 'online' | 'in_person' | 'hybrid')
                    }
                    className="text-xs rounded-xl border-slate-300 text-slate-900"
                  >
                    {profile.teachingModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode === 'online'
                          ? isBn
                            ? 'অনলাইন'
                            : 'Online'
                          : mode === 'in_person'
                            ? isBn
                              ? 'হোম টিউশন'
                              : 'In-person'
                            : isBn
                              ? 'হাইব্রিড'
                              : 'Hybrid'}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    {isBn ? 'পছন্দের দিনসমূহ' : 'Preferred Days'}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(DAY_MAP).map(([key, index]) => {
                      const isSelected = selectedDays.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleDay(key)}
                          aria-pressed={isSelected}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-slate-900'
                          }`}
                        >
                          {isBn ? WEEKDAY_LABELS[index]?.bn : WEEKDAY_LABELS[index]?.en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="booking-notes" className="text-xs font-bold text-slate-800">
                    {isBn
                      ? 'শিক্ষকের জন্য কোনো বিশেষ বার্তা (ঐচ্ছিক)'
                      : 'Message for tutor (optional)'}
                  </Label>
                  <Textarea
                    id="booking-notes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    placeholder={
                      isBn
                        ? 'আপনার শিক্ষার্থীর বর্তমান অবস্থা বা বিশেষ কোনো প্রয়োজনীয়তা লিখুন...'
                        : 'Mention student current topics or specific requirements...'
                    }
                    className="text-xs rounded-xl border-slate-300 text-slate-900 placeholder:text-slate-400"
                  ></Textarea>
                </div>

                {bookingError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription role="alert">{bookingError}</AlertDescription>
                  </Alert>
                )}
                {bookingSuccess && (
                  <Alert
                    className="rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-900"
                    data-testid="booking-success"
                  >
                    <AlertDescription className="font-bold">{bookingSuccess}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isBookingSubmitting || !selectedSubject}
                  className="w-full gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 shadow-xs shadow-blue-500/20 hover:shadow-xs transition-all"
                  data-testid="submit-booking-request"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {isBookingSubmitting
                    ? isBn
                      ? 'অনুরোধ পাঠানো হচ্ছে...'
                      : 'Sending request...'
                    : isBn
                      ? 'টিউশন অনুরোধ পাঠান'
                      : 'Send Tutoring Request'}
                </Button>

                {/* Trust and Escrow Notice */}
                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1.5 text-[11px] text-slate-600 border border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-blue-700" />
                    <span>{isBn ? 'অগ্রণী এসক্রো পেমেন্ট সুরক্ষা' : 'Ogroni Escrow Security Guarantee'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {isBn
                      ? 'শিক্ষক অনুরোধ গ্রহণ করার পর প্রথম ক্লাস শুরু হবে। সন্তোষজনক ক্লাসের পর পেমেন্ট শিক্ষকদের কাছে পৌঁছাবে।'
                      : 'Tutoring starts after tutor acceptance. Payment is safely held in escrow until session completion.'}
                  </p>
                </div>
              </form>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Global Interactive Booking Modal on Details Page */}
      {isModalOpen && tutorCardData && (
        <BookingRequestModal
          tutor={tutorCardData}
          locale={locale}
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
