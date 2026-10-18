'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
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
import { WEEKDAY_LABELS } from '@/features/tutor-discovery/types/tutor-discovery.types';

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
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card/80 border border-border p-6 sm:p-8 space-y-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-lg font-bold text-foreground border-b border-border pb-3">
        {icon}
        <h2>{title}</h2>
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

  const studentOptions = React.useMemo(() => {
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
          ? 'টিউশন অনুরোধ পাঠানো হয়েছে। শিক্ষক উত্তর দিলে আপনি জানতে পারবেন।'
          : 'Booking request sent. You will be notified when the tutor responds.',
      );
    } catch (err: unknown) {
      setBookingError(normalizeUnknownError(err, locale).message);
    }
  };

  const toggleDay = (day: string) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  if (profileQuery.isLoading || profileQuery.isFetching) {
    return (
      <div
        className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8"
        data-testid="profile-loading"
      >
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse" aria-hidden="true">
          <div className="h-48 rounded-2xl bg-card/70 border border-border" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-2xl bg-card/70 border border-border" />
            <div className="h-72 rounded-2xl bg-card/70 border border-border" />
          </div>
        </div>
      </div>
    );
  }

  if (profileQuery.error || !profile) {
    return (
      <div className="min-h-screen bg-background py-16 px-4" data-testid="profile-unavailable">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-warning mx-auto" aria-hidden="true" />
          <h1 className="text-xl font-bold text-foreground">
            {isBn ? 'এই প্রোফাইল পাওয়া যায়নি' : 'This tutor profile is unavailable'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isBn
              ? 'শিক্ষকটি বর্তমানে প্রকাশ্যে যাচাইকৃত বা বুকযোগ্য নাও হতে পারেন।'
              : 'The tutor may no longer be publicly verified or bookable.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => profileQuery.refetch()}>
              {isBn ? 'আবার চেষ্টা করুন' : 'Retry'}
            </Button>
            <Link
              href={withLocale('/tutors', locale)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {isBn ? 'শিক্ষক তালিকায় ফিরুন' : 'Back to tutors'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hourlyRate = profile.hourlyRateMinor
    ? formatLocalizedNumber(Number(profile.hourlyRateMinor) / 100, locale)
    : null;
  const weekdays = Array.from(new Set((profile.availability ?? []).map((a) => a.weekday))).sort(
    (a, b) => a - b,
  );

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm">
        <Link
          href={withLocale('/tutors', locale)}
          className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{isBn ? 'শিক্ষক তালিকায় ফিরুন' : 'Back to tutors'}</span>
        </Link>
        {currentUser && (
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isSaving || isUnsaving}
            data-testid="profile-save-toggle"
            aria-pressed={isSaved}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/40 disabled:opacity-50"
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isSaved ? 'fill-primary text-primary' : 'text-primary'}`}
              aria-hidden="true"
            />
            <span>
              {isSaved ? (isBn ? 'সংরক্ষিত' : 'Saved') : isBn ? 'সংরক্ষণ করুন' : 'Save tutor'}
            </span>
          </button>
        )}
      </div>

      {saveError && (
        <Alert variant="destructive" className="max-w-7xl mx-auto rounded-2xl">
          <AlertDescription role="alert">{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-7xl mx-auto rounded-2xl bg-card/90 border border-border p-6 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl bg-brand-soft text-primary font-extrabold text-2xl sm:text-3xl ring-4 ring-brand/40">
              {initials}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {profile.displayName}
              </h1>
              {profile.headline && (
                <p className="text-sm sm:text-base font-semibold text-primary-soft-foreground">
                  {profile.headline}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs sm:text-sm pt-0.5">
                {profile.totalReviews > 0 && profile.ratingAverage != null ? (
                  <span
                    className="flex items-center gap-1 font-bold text-warning-soft-foreground"
                    data-testid="profile-rating"
                  >
                    <Star className="w-4 h-4 fill-warning" aria-hidden="true" />
                    <span className="text-foreground">
                      {formatLocalizedNumber(profile.ratingAverage, locale)}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      ({formatLocalizedNumber(profile.totalReviews, locale)}{' '}
                      {isBn ? 'রিভিউ' : 'reviews'})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground" data-testid="profile-no-rating">
                    {isBn ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet'}
                  </span>
                )}
                {profile.completedSessions > 0 && (
                  <span className="text-success-soft-foreground font-semibold">
                    {formatLocalizedNumber(profile.completedSessions, locale)}{' '}
                    {isBn ? 'সফল ক্লাস' : 'completed sessions'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-soft text-success-soft-foreground border border-success/30">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified tutor'}
                </span>
                {profile.badges.includes('verified_identity') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-soft text-primary border border-border">
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    {isBn ? 'এনআইডি যাচাইকৃত' : 'NID verified'}
                  </span>
                )}
                {profile.badges.includes('verified_academic') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-interactive/15 text-info-soft-foreground border border-info/40">
                    <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                    {isBn ? 'শিক্ষাগত সনদ যাচাইকৃত' : 'Academic credentials verified'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
            <div className="text-left md:text-right">
              <span className="text-xs text-muted-foreground uppercase font-semibold block">
                {isBn ? 'ঘণ্টাপ্রতি ফি' : 'Hourly rate'}
              </span>
              <span className="text-3xl font-black tabular-nums tracking-tight">
                {hourlyRate ? `৳${hourlyRate}` : isBn ? 'যোগাযোগ করুন' : 'Contact for fee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {profile.bio && (
            <SectionCard
              title={isBn ? 'শিক্ষক পরিচিতি' : 'About the educator'}
              icon={<BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />}
            >
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </SectionCard>
          )}

          <SectionCard
            title={isBn ? 'যোগ্যতা ও সনদ' : 'Qualifications'}
            icon={<GraduationCap className="w-5 h-5 text-primary" aria-hidden="true" />}
          >
            {(profile.qualifications ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="no-qualifications">
                {isBn ? 'কোনো যাচাইকৃত যোগ্যতা নেই।' : 'No approved qualification recorded.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {(profile.qualifications ?? []).map((q) => (
                  <li key={q.id} className="flex items-start gap-3 text-sm">
                    <CheckCircle2
                      className="w-4 h-4 text-success mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[q.institution, q.issuedYear].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={isBn ? 'বিষয় ও শ্রেণি' : 'Subjects & levels'}
            icon={<Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />}
          >
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isBn ? 'কোনো বিষয় যোগ করা হয়নি।' : 'No subject configured.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {isBn ? s.subjectNameBn : s.subjectNameEn}
                    </span>
                    <span className="text-muted-foreground">
                      {' · '}
                      {isBn ? s.educationLevelNameBn : s.educationLevelNameEn}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={isBn ? 'শিক্ষার্থীদের রিভিউ' : 'Student reviews'}
            icon={<Star className="w-5 h-5 text-primary" aria-hidden="true" />}
          >
            {reviewsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                {isBn ? 'লোড হচ্ছে...' : 'Loading...'}
              </p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="no-reviews">
                {isBn ? 'এখনো কোনো রিভিউ প্রকাশিত হয়নি।' : 'No published reviews yet.'}
              </p>
            ) : (
              <ul className="space-y-4" data-testid="tutor-review-list">
                {reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {review.reviewerDisplayName ?? (isBn ? 'শিক্ষার্থী' : 'Student')}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Star
                          className="w-3.5 h-3.5 fill-warning text-warning"
                          aria-hidden="true"
                        />
                        {formatLocalizedNumber(review.rating, locale)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                    {review.tutorResponse && (
                      <p className="text-xs rounded-lg bg-muted/40 p-2 text-foreground">
                        <span className="font-semibold">
                          {isBn ? 'শিক্ষকের উত্তর: ' : 'Tutor reply: '}
                        </span>
                        {review.tutorResponse}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-4 space-y-6" id="booking-section">
          <SectionCard
            title={isBn ? 'সেবা এলাকা ও সময়' : 'Service areas & availability'}
            icon={<MapPin className="w-5 h-5 text-primary" aria-hidden="true" />}
          >
            <div className="space-y-2 text-sm">
              {profile.serviceAreas.length === 0 ? (
                <p className="text-muted-foreground">
                  {isBn ? 'সেবা এলাকা নির্ধারিত নয়।' : 'No service area listed.'}
                </p>
              ) : (
                profile.serviceAreas.map((area) => (
                  <p
                    key={area.id ?? `${area.districtCode}-${area.localityName}`}
                    className="text-foreground"
                  >
                    {area.localityName ||
                      (isBn ? area.districtNameBn : area.districtNameEn) ||
                      area.districtCode}
                    {area.radiusKm ? ` · ${area.radiusKm} km` : ''}
                  </p>
                ))
              )}
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
                {weekdays.length === 0
                  ? isBn
                    ? 'সময়সূচি নির্ধারিত নয়'
                    : 'No availability published'
                  : weekdays
                      .map((d) => (isBn ? WEEKDAY_LABELS[d]?.bn : WEEKDAY_LABELS[d]?.en))
                      .join(', ')}
              </div>
              {(profile.availability?.length ?? 0) > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                  {(profile.availability ?? []).map((slot) => (
                    <li key={`${slot.weekday}-${slot.startLocal}-${slot.endLocal}`}>
                      {isBn ? WEEKDAY_LABELS[slot.weekday]?.bn : WEEKDAY_LABELS[slot.weekday]?.en}:{' '}
                      {slot.startLocal}–{slot.endLocal}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={isBn ? 'টিউশন অনুরোধ' : 'Request tutoring'}
            icon={<Send className="w-5 h-5 text-primary" aria-hidden="true" />}
          >
            {!currentUser ? (
              <div className="space-y-3" data-testid="profile-login-required">
                <p className="text-sm text-muted-foreground">
                  {isBn
                    ? 'অনুরোধ পাঠাতে লগইন করুন বা অ্যাকাউন্ট খুলুন।'
                    : 'Sign in or create an account to send a tutoring request.'}
                </p>
                <Link href={withLocale('/login', locale)}>
                  <Button size="sm" className="w-full">
                    {isBn ? 'লগইন করুন' : 'Sign in'}
                  </Button>
                </Link>
              </div>
            ) : studentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isBn
                  ? 'অনুরোধ পাঠাতে একজন শিক্ষার্থী অ্যাকাউন্ট প্রয়োজন।'
                  : 'A student profile is required to request tutoring.'}
              </p>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student-select" className="text-xs font-semibold">
                    {isBn ? 'শিক্ষার্থী' : 'Student'}
                  </Label>
                  <NativeSelect
                    id="student-select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="text-xs"
                  >
                    {studentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject-select" className="text-xs font-semibold">
                    {isBn ? 'বিষয় ও শ্রেণি' : 'Subject & level'}
                  </Label>
                  <NativeSelect
                    id="subject-select"
                    value={selectedSubject?.id ?? ''}
                    onChange={(e) => setSelectedSubjectEntryId(e.target.value)}
                    className="text-xs"
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
                  <Label htmlFor="mode-select" className="text-xs font-semibold">
                    {isBn ? 'পাঠদানের পদ্ধতি' : 'Teaching mode'}
                  </Label>
                  <NativeSelect
                    id="mode-select"
                    value={selectedMode}
                    onChange={(e) =>
                      setSelectedMode(e.target.value as 'online' | 'in_person' | 'hybrid')
                    }
                    className="text-xs"
                  >
                    {profile.teachingModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.replace('_', ' ')}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {isBn ? 'পছন্দের দিন' : 'Preferred days'}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(DAY_MAP).map(([key, index]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDay(key)}
                        aria-pressed={selectedDays.includes(key)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                          selectedDays.includes(key)
                            ? 'border-primary bg-brand-soft text-primary'
                            : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {isBn ? WEEKDAY_LABELS[index]?.bn : WEEKDAY_LABELS[index]?.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="booking-notes" className="text-xs font-semibold">
                    {isBn ? 'অতিরিক্ত তথ্য (ঐচ্ছিক)' : 'Additional notes (optional)'}
                  </Label>
                  <Textarea
                    id="booking-notes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                {bookingError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription role="alert">{bookingError}</AlertDescription>
                  </Alert>
                )}
                {bookingSuccess && (
                  <Alert className="rounded-xl" data-testid="booking-success">
                    <AlertDescription>{bookingSuccess}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isBookingSubmitting || !selectedSubject}
                  className="w-full gap-1.5"
                  data-testid="submit-booking-request"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  {isBookingSubmitting
                    ? isBn
                      ? 'পাঠানো হচ্ছে...'
                      : 'Sending...'
                    : isBn
                      ? 'অনুরোধ পাঠান'
                      : 'Send request'}
                </Button>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {isBn
                    ? 'শিক্ষক গৃহীত করলে পেমেন্ট ধাপ শুরু হবে।'
                    : 'Payment starts only after the tutor accepts.'}
                </p>
              </form>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
