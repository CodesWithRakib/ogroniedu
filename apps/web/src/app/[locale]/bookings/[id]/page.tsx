'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Video,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Download,
  CreditCard,
  User,
  GraduationCap,
  Sparkles,
  Star,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  useGetBookingRequestByIdQuery,
  useRespondBookingRequestMutation,
  useWithdrawBookingRequestMutation,
} from '@/store/services/bookings-api';
import { useGetSessionsQuery, useLazyGetIcsCalendarQuery } from '@/store/services/sessions-api';
import { SafetyReportModal, TutorReplacementModal, ReviewModal } from '@/features/trust';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { withLocale } from '@/lib/auth';

interface BookingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const WEEKDAY_NAMES_BN = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];
const WEEKDAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const isBn = locale === 'bn';
  const bookingId = resolved.id;

  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');
  const isGuardian = currentUser?.roles?.includes('guardian');

  const {
    data: bookingData,
    isLoading: loadingBooking,
    refetch: refetchBooking,
  } = useGetBookingRequestByIdQuery(bookingId);
  const { data: sessionsData } = useGetSessionsQuery({ bookingId });

  const [respondBooking, { isLoading: responding }] = useRespondBookingRequestMutation();
  const [withdrawBooking, { isLoading: withdrawing }] = useWithdrawBookingRequestMutation();
  const [getIcsCalendar, { isFetching: downloadingIcs }] = useLazyGetIcsCalendarQuery();

  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const booking = bookingData?.data;
  const sessions = sessionsData?.data || [];

  const status = booking?.status || 'requested';
  const priceBdt = booking?.pricePerSessionMinor
    ? Math.round(Number(booking.pricePerSessionMinor) / 100)
    : 1200;

  const preferredDays = Array.isArray(booking?.preferredDays) ? booking.preferredDays : [];
  const weekdayLabels = isBn ? WEEKDAY_NAMES_BN : WEEKDAY_NAMES_EN;

  const subjectName = isBn
    ? booking?.subject?.nameBn || booking?.subject?.name || 'টিউটরিং বিষয়'
    : booking?.subject?.name || 'Tuition Subject';
  const educationLevelName = isBn
    ? booking?.educationLevel?.nameBn || booking?.educationLevel?.name || 'শ্রেণি'
    : booking?.educationLevel?.name || 'Education Level';

  const tutorName =
    booking?.tutorProfile?.user?.displayName ||
    booking?.tutorProfile?.user?.fullName ||
    (isBn ? 'নির্ধারিত শিক্ষক' : 'Assigned Tutor');
  const studentName =
    booking?.studentUser?.displayName ||
    booking?.studentUser?.fullName ||
    (isBn ? 'শিক্ষার্থী' : 'Student');

  // Generate Google Calendar Link for First Scheduled Session
  const firstSession = sessions[0];
  const googleCalUrl = React.useMemo(() => {
    if (!firstSession) return null;
    const startIso = new Date(firstSession.startsAt).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(firstSession.endsAt).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(`OgroniEdu Class: ${subjectName} with ${tutorName}`);
    const details = encodeURIComponent(
      `OgroniEdu Live Class Session\nSubject: ${subjectName}\nTutor: ${tutorName}\nStudent: ${studentName}\nClass URL: ${firstSession.meetingUrl || 'https://meet.google.com'}`,
    );
    const location = encodeURIComponent(firstSession.meetingUrl || 'Online (Google Meet)');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  }, [firstSession, subjectName, tutorName, studentName]);

  async function handleDownloadIcs() {
    try {
      const res = await getIcsCalendar({ bookingId }).unwrap();
      const ics = res.data.icsContent;
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.filename || `ogroniedu-booking-${bookingId.slice(0, 8)}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playAudioTone('success');
    } catch {
      setErrorMessage(isBn ? 'ক্যালেন্ডার ডাউনলোড ব্যর্থ হয়েছে।' : 'Failed to download calendar.');
    }
  }

  async function handleTutorResponse(action: 'accept' | 'decline') {
    setActionMessage(null);
    setErrorMessage(null);
    try {
      await respondBooking({ id: bookingId, action }).unwrap();
      playAudioTone(action === 'accept' ? 'success' : 'alert');
      setActionMessage(
        action === 'accept'
          ? isBn
            ? 'বুকিং সফলভাবে গ্রহণ করা হয়েছে। শিক্ষার্থী/অভিভাবক এখন ফি পরিশোধ করতে পারবেন।'
            : 'Booking accepted successfully. The student/guardian can now deposit escrow fees.'
          : isBn
            ? 'বুকিং অনুরোধ বাতিল করা হয়েছে।'
            : 'Booking request has been declined.',
      );
      refetchBooking();
    } catch {
      setErrorMessage(isBn ? 'পদক্ষেপ সম্পন্ন করা যায়নি।' : 'Failed to respond to booking.');
    }
  }

  async function handleWithdraw() {
    if (
      !confirm(
        isBn
          ? 'আপনি কি নিশ্চিতভাবে এই বুকিং অনুরোধ প্রত্যাহার করতে চান?'
          : 'Are you sure you want to withdraw this booking request?',
      )
    )
      return;
    setActionMessage(null);
    setErrorMessage(null);
    try {
      await withdrawBooking({ id: bookingId }).unwrap();
      playAudioTone('alert');
      setActionMessage(isBn ? 'বুকিং অনুরোধ প্রত্যাহার করা হয়েছে।' : 'Booking request withdrawn.');
      refetchBooking();
    } catch {
      setErrorMessage(isBn ? 'অনুরোধ প্রত্যাহার করা যায়নি।' : 'Failed to withdraw booking.');
    }
  }

  if (loadingBooking) {
    return (
      <DashboardShell
        locale={locale}
        title={isBn ? 'বুকিং ডসিয়ার' : 'Booking Dossier'}
        subtitle={isBn ? 'তথ্য প্রস্তুত করা হচ্ছে...' : 'Loading booking details...'}
      >
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner />
          <p className="text-xs text-muted-foreground">
            {isBn ? 'বুকিং ডসিয়ার লোড হচ্ছে...' : 'Loading booking dossier...'}
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (!booking) {
    return (
      <DashboardShell
        locale={locale}
        title={isBn ? 'বুকিং ডসিয়ার' : 'Booking Dossier'}
        subtitle={isBn ? 'বুকিং সংক্রান্ত তথ্য' : 'Booking Information'}
      >
        <div className="py-12 max-w-xl mx-auto">
          <EmptyState
            title={isBn ? 'বুকিং পাওয়া যায়নি' : 'Booking Not Found'}
            description={
              isBn
                ? `বুকিং আইডি #${bookingId.slice(0, 8)} পাওয়া যায়নি অথবা আপনার এই বুকিং দেখার অনুমতি নেই। অনুগ্রহ করে আপনার অনুরোধ তালিকা থেকে একটি সক্রিয় বুকিং নির্বাচন করুন।`
                : `Booking #${bookingId.slice(0, 8)} was not found or has been removed. Please select an active booking from your requests list.`
            }
            actionLabel={isBn ? 'অনুরোধ তালিকায় ফিরে যান' : 'Back to Requests Overview'}
            actionHref={withLocale(
              isTutor
                ? '/dashboard/tutor/requests'
                : isGuardian
                  ? '/dashboard/guardian/requests'
                  : '/dashboard/student/requests',
              locale,
            )}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      locale={locale}
      title={isBn ? `টিউটরিং বুকিং: ${subjectName}` : `Tutoring Booking: ${subjectName}`}
      subtitle={
        isBn
          ? `আইডি: #${bookingId.slice(0, 8)} | স্ট্যাটাস: ${status === 'accepted' ? 'অনুমোদিত — পেমেন্ট করুন' : status === 'confirmed' ? 'নিশ্চিতকৃত' : 'বিবেচনাধীন'}`
          : `ID: #${bookingId.slice(0, 8)} | Status: ${status}`
      }
    >
      <div className="max-w-6xl mx-auto space-y-6" data-testid="booking-dossier-page">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(
              isTutor
                ? '/dashboard/tutor/requests'
                : isGuardian
                  ? '/dashboard/guardian/requests'
                  : '/dashboard/student/requests',
              locale,
            )}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'অনুরোধ তালিকায় ফিরে যান' : 'Back to Requests Overview'}</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground bg-surface/80 border border-border px-3 py-1 rounded-full">
            ID: #{bookingId.slice(0, 8)}
          </span>
        </div>

        {/* Feedback / Alert Banners */}
        {actionMessage && (
          <div
            role="status"
            className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs text-success-soft-foreground flex items-center gap-2.5"
            data-testid="booking-success-banner"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive-soft-foreground flex items-center gap-2.5"
            data-testid="booking-error-banner"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {educationLevelName}
                </span>
                {status === 'requested' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning-soft-foreground border border-warning/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    {isBn ? 'অনুরোধ অপেক্ষমান' : 'Pending Response'}
                  </span>
                )}
                {status === 'accepted' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-interactive/15 text-info-soft-foreground border border-info/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-info animate-pulse" />
                    {isBn ? 'গৃহীত — এসক্রো ফি জমা দিন' : 'Accepted — Escrow Deposit Required'}
                  </span>
                )}
                {status === 'confirmed' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-success-soft-foreground border border-primary/40 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isBn ? 'নিশ্চিতকৃত বুকিং' : 'Confirmed & Active'}
                  </span>
                )}
                {status === 'cancelled' && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive-soft-foreground border border-destructive/40">
                    {isBn ? 'বাতিলকৃত' : 'Cancelled'}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {subjectName}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-info-soft-foreground" />
                  {isBn ? 'শিক্ষক:' : 'Tutor:'}{' '}
                  <strong className="text-foreground">{tutorName}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-success-soft-foreground" />
                  {isBn ? 'শিক্ষার্থী:' : 'Student:'}{' '}
                  <strong className="text-foreground">{studentName}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-interactive" />
                  {formatDate(booking?.createdAt || new Date(), locale)}
                </span>
              </div>
            </div>

            {/* Action CTA Box */}
            <div className="flex flex-wrap items-center gap-3">
              {status === 'accepted' && (
                <Link
                  href={withLocale(`/dashboard/bookings/${bookingId}/pay`, locale)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand to-brand-accent text-foreground font-bold text-sm shadow-lg shadow-sm transition-all hover:scale-102"
                  data-testid="pay-escrow-cta-btn"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isBn ? 'এসক্রো ফি পরিশোধ করুন' : 'Pay Escrow Fees'}</span>
                </Link>
              )}

              {status === 'requested' && isTutor && (
                <>
                  <Button
                    size="sm"
                    disabled={responding}
                    onClick={() => handleTutorResponse('accept')}
                    className="bg-primary hover:bg-primary-hover text-white font-semibold text-xs"
                    data-testid="tutor-accept-booking-btn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    {isBn ? 'বুকিং গ্রহণ করুন' : 'Accept Request'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={responding}
                    onClick={() => handleTutorResponse('decline')}
                    className="border-destructive/40 text-destructive-soft-foreground hover:bg-destructive/10 text-xs"
                    data-testid="tutor-decline-booking-btn"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    {isBn ? 'প্রত্যাখ্যান' : 'Decline'}
                  </Button>
                </>
              )}

              {status === 'requested' && !isTutor && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={withdrawing}
                  onClick={handleWithdraw}
                  className="border-destructive/40 text-destructive-soft-foreground hover:bg-destructive/10 text-xs"
                  data-testid="withdraw-booking-btn"
                >
                  {isBn ? 'অনুরোধ প্রত্যাহার' : 'Withdraw Request'}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSafetyModalOpen(true)}
                className="border-border text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-destructive-soft-foreground" />
                {isBn ? 'সুরক্ষা রিপোর্ট' : 'Report Issue'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setReplacementModalOpen(true)}
                className="border-border text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-warning-soft-foreground" />
                {isBn ? 'রিপ্লেসমেন্ট গ্যারান্টি' : 'Replacement'}
              </Button>

              {!isTutor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewModalOpen(true)}
                  className="border-warning/40 text-warning-soft-foreground hover:bg-warning/10 text-xs"
                  data-testid="open-review-modal-btn"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5 text-warning-soft-foreground fill-current" />
                  {isBn ? 'শিক্ষককে রিভিউ দিন' : 'Rate Tutor'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4.5 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {isBn ? 'সেশন ফি (প্রতি ক্লাস)' : 'Fee Per Session'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ৳{formatLocalizedNumber(priceBdt, locale)}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4.5 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {isBn ? 'ক্লাসের মাধ্যম' : 'Tutoring Mode'}
            </p>
            <p className="text-base font-bold text-info-soft-foreground capitalize">
              {booking?.mode === 'in_person'
                ? isBn
                  ? 'বাসায় গিয়ে (In-Person)'
                  : 'In-Person'
                : isBn
                  ? 'অনলাইন ক্লাস (Google Meet)'
                  : 'Online'}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4.5 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {isBn ? 'সেশন ব্যাপ্তি' : 'Duration'}
            </p>
            <p className="text-base font-bold text-success-soft-foreground font-mono">
              {formatLocalizedNumber(Number(booking?.durationMinutes) || 60, locale)}{' '}
              {isBn ? 'মিনিট' : 'Mins'}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4.5 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              {isBn ? 'এসক্রো নিরাপত্তা' : 'Escrow Protection'}
            </p>
            <p className="text-base font-bold text-primary-soft-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{isBn ? '১০০% সুরক্ষিত' : '100% Guaranteed'}</span>
            </p>
          </div>
        </div>

        {/* 2-Column Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preferred Weekly Routine & Schedule Slots */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">
                    {isBn ? 'সাপ্তাহিক ক্লাসের পছন্দের দিন ও রুটিন' : 'Weekly Class Routine'}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {preferredDays.length > 0
                    ? `${formatLocalizedNumber(preferredDays.length, locale)} ${isBn ? 'দিন/সপ্তাহ' : 'days/wk'}`
                    : isBn
                      ? 'রিকারিং শিডিউল'
                      : 'Recurring Schedule'}
                </span>
              </div>

              {preferredDays.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferredDays.map((dayNum) => (
                    <span
                      key={dayNum}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{weekdayLabels[dayNum] || `Day ${dayNum}`}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'শিক্ষক ও শিক্ষার্থী আলোচনার মাধ্যমে নিয়মিত শিডিউল নির্ধারণ করবেন।'
                    : 'Flexible schedule as coordinated between tutor and student.'}
                </p>
              )}

              {/* Instructions / Learning Goals */}
              {Boolean(
                booking?.messageNotes ||
                (booking?.serviceAgreementSnapshot as Record<string, unknown> | undefined)?.message,
              ) && (
                <div className="rounded-2xl border border-border/60 bg-surface/60 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isBn ? 'শিক্ষার্থীর প্রয়োজন ও শিক্ষকের জন্য নোট:' : 'Learning Goals & Notes:'}
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    "
                    {String(
                      booking?.messageNotes ||
                        (booking?.serviceAgreementSnapshot as Record<string, unknown> | undefined)
                          ?.message ||
                        '',
                    )}
                    "
                  </p>
                </div>
              )}
            </div>

            {/* Scheduled Class Sessions Table */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-info-soft-foreground" />
                  <h3 className="font-bold text-sm text-foreground">
                    {isBn ? 'নির্ধারিত ক্লাস সেশনসমূহ' : 'Scheduled Class Sessions'}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatLocalizedNumber(sessions.length, locale)} {isBn ? 'টি সেশন' : 'Sessions'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border/80 rounded-2xl space-y-2">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {isBn
                      ? 'বুকিং ফি পরিশোধের পর সেশন শিডিউল স্বয়ংক্রিয়ভাবে ক্যালেন্ডারে যুক্ত হবে।'
                      : 'Class sessions will be populated upon escrow payment confirmation.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, idx) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-border/80 bg-surface/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      data-testid={`session-row-${session.id}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {isBn ? `ক্লাস #${idx + 1}` : `Class #${idx + 1}`}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            {session.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-interactive" />
                            {formatDate(session.startsAt, locale)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-info-soft-foreground" />
                            {new Date(session.startsAt).toLocaleTimeString(
                              locale === 'bn' ? 'bn-BD' : 'en-US',
                              { hour: '2-digit', minute: '2-digit' },
                            )}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {session.meetingUrl ? (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-interactive/15 text-info-soft-foreground hover:bg-interactive/25 border border-info/40 font-medium text-xs transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{isBn ? 'ক্লাসে যোগ দিন' : 'Join Class'}</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            {isBn ? 'লিংক তৈরির অপেক্ষায়' : 'Link Pending'}
                          </span>
                        )}
                        <Link
                          href={withLocale(`/sessions/${session.id}`, locale)}
                          className="px-3 py-1.5 rounded-xl border border-border/80 hover:bg-surface text-foreground font-medium text-xs transition-colors"
                        >
                          {isBn ? 'বিস্তারিত' : 'Details'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col wide) */}
          <div className="space-y-6">
            {/* Calendar Synchronization Hub */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/70">
                <Calendar className="w-4 h-4 text-interactive" />
                <h3 className="font-bold text-sm text-foreground">
                  {isBn ? 'ক্যালেন্ডার সিঙ্ক ও রুটিন' : 'Calendar Synchronization'}
                </h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {isBn
                  ? 'আপনার Google, Apple বা Outlook ক্যালেন্ডারের সাথে ক্লাসের সময়সূচী স্বয়ংক্রিয়ভাবে যুক্ত করুন।'
                  : 'Sync tuition class schedule with your personal Google, Apple, or Outlook calendar.'}
              </p>

              <div className="space-y-2.5">
                {googleCalUrl && (
                  <a
                    href={googleCalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-surface/80 hover:bg-surface border border-border/80 text-foreground font-semibold text-xs transition-all hover:border-primary/40"
                    data-testid="google-calendar-sync-btn"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-info-soft-foreground" />
                    <span>{isBn ? 'Google Calendar-এ যোগ করুন' : 'Add to Google Calendar'}</span>
                  </a>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadIcs}
                  disabled={downloadingIcs}
                  className="w-full justify-center text-xs h-10 border-border/80 hover:bg-surface"
                  data-testid="download-ics-calendar-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-interactive" />
                  <span>
                    {downloadingIcs
                      ? isBn
                        ? 'ডাউনলোড হচ্ছে...'
                        : 'Generating iCal...'
                      : isBn
                        ? 'Apple / Outlook (.ics ডাউনলোড)'
                        : 'Download iCal (.ics File)'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Escrow Guarantee & Trust Seal */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border/70">
                <ShieldCheck className="w-4 h-4 text-success-soft-foreground" />
                <h3 className="font-bold text-sm text-foreground">
                  {isBn ? 'অগ্রণী এডু আর্থিক ট্রাস্ট নিশ্চয়তা' : 'OgroniEdu Escrow Protection'}
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন না হওয়া পর্যন্ত শিক্ষকের কাছে টাকা ছাড় করা হয় না।'
                      : 'Tutor payout is held safely in escrow until milestone approval.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? '৪৮ ঘণ্টার ফ্রি টিউটর রিপ্লেসমেন্ট নিশ্চয়তা কার্যকর।'
                      : '48-Hour Free Tutor Replacement Guarantee protected.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-soft-foreground shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? '২৪/৭ জাতীয় হেল্পলাইন ১০৯৮ ও প্ল্যাটফর্ম সাপোর্ট টিম সংযুক্ত।'
                      : 'Direct escalation to Child Safety Hotline 1098 & support.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Safety & Replacement Modals */}
        <SafetyReportModal
          isOpen={safetyModalOpen}
          onClose={() => setSafetyModalOpen(false)}
          defaultBookingId={bookingId}
          defaultReportedUserId={isTutor ? booking?.studentUserId : booking?.tutorUserId}
          reportedUserName={isTutor ? studentName : tutorName}
          locale={locale}
        />

        <TutorReplacementModal
          isOpen={replacementModalOpen}
          onClose={() => setReplacementModalOpen(false)}
          bookingId={bookingId}
          tutorName={tutorName}
          subjectName={subjectName}
          locale={locale}
        />

        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          bookingId={bookingId}
          tutorName={tutorName}
          subjectName={subjectName}
          locale={locale}
        />
      </div>
    </DashboardShell>
  );
}
