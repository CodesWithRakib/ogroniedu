'use client';

import React, { useState } from 'react';
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
  Scale,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { Button, LoadingSpinner, EmptyState, Alert, AlertDescription } from '@/components/ui';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  useGetBookingRequestByIdQuery,
  useRespondBookingRequestMutation,
  useWithdrawBookingRequestMutation,
} from '@/store/services/bookings-api';
import { useGetSessionsQuery, useLazyGetIcsCalendarQuery } from '@/store/services/sessions-api';
import {
  useGetDisputesQuery,
  useGetReplacementCasesQuery,
  useAcceptReplacementOfferMutation,
  useDeclineReplacementOfferMutation,
  useGetBookingReviewQuery,
  useReplyToReviewMutation,
} from '@/store/services/trust-api';
import {
  SafetyReportModal,
  TutorReplacementModal,
  ReviewModal,
  DisputeModal,
  ReviewCard,
} from '@/features/trust';
import { toast } from 'sonner';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { withLocale } from '@/lib/auth';

export interface BookingDetailPageProps {
  bookingId: string;
  locale: Locale;
}

const DISPUTE_REASONS: Record<string, { bn: string; en: string }> = {
  tutor_no_show: { bn: 'শিক্ষক ক্লাসে অনুপস্থিত (No-Show)', en: 'Tutor No-Show' },
  poor_quality: { bn: 'ক্লাসের মান আশানুরূপ নয়', en: 'Substandard Teaching Quality' },
  misconduct: {
    bn: 'অশোভন আচরণ বা নীতিবিরুদ্ধ কর্মকাণ্ড',
    en: 'Misconduct or Inappropriate Behavior',
  },
  incomplete_curriculum: {
    bn: 'নির্ধারিত পাঠ্যক্রম সম্পন্ন করা হয়নি',
    en: 'Incomplete Curriculum Coverage',
  },
  technical_failure: {
    bn: 'কারিগরি ত্রুটির কারণে ক্লাস সম্পন্ন হয়নি',
    en: 'Technical Failure / Connection Lost',
  },
  other: { bn: 'অন্যান্য সুনির্দিষ্ট কারণ', en: 'Other' },
};

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

export function BookingDetailPage({ bookingId, locale }: BookingDetailPageProps) {
  const isBn = locale === 'bn';

  const currentUser = useAppSelector((s) => s.auth.user);
  const isTutor = currentUser?.roles?.includes('tutor');
  const isGuardian = currentUser?.roles?.includes('guardian');

  const {
    data: bookingData,
    isLoading: loadingBooking,
    refetch: refetchBooking,
  } = useGetBookingRequestByIdQuery(bookingId);
  const { data: sessionsData } = useGetSessionsQuery({ bookingId });
  const { data: disputesData, refetch: refetchDisputes } = useGetDisputesQuery({ bookingId });
  const { data: replacementData, refetch: refetchReplacements } = useGetReplacementCasesQuery();
  const { data: reviewResponse, refetch: refetchBookingReview } = useGetBookingReviewQuery(
    { bookingId },
    { skip: !bookingId },
  );
  const [replyToReview, { isLoading: replyingToReview }] = useReplyToReviewMutation();
  const [activeReply, setActiveReply] = useState(false);
  const [tutorReplyText, setTutorReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const bookingReview =
    reviewResponse && typeof reviewResponse === 'object' && 'data' in reviewResponse
      ? (reviewResponse as { data: any }).data
      : (reviewResponse as any);
  const hasReviewed = Boolean(bookingReview);

  const handlePostTutorReply = async () => {
    if (!bookingReview?.id || !tutorReplyText.trim()) return;
    setReplyError(null);
    try {
      await replyToReview({
        id: bookingReview.id,
        reply: tutorReplyText.trim(),
        bookingId,
      }).unwrap();
      setActiveReply(false);
      setTutorReplyText('');
      playAudioTone('success');
      toast.success(
        isBn
          ? 'আপনার প্রতিক্রিয়া সফলভাবে প্রকাশ করা হয়েছে!'
          : 'Reply posted successfully!',
      );
      refetchBookingReview();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to post reply')
          : err instanceof Error
            ? err.message
            : 'Failed to post reply';
      setReplyError(msg);
    }
  };

  const [acceptReplacementOffer, { isLoading: acceptingOffer }] = useAcceptReplacementOfferMutation();
  const [declineReplacementOffer, { isLoading: decliningOffer }] = useDeclineReplacementOfferMutation();

  const [respondBooking, { isLoading: responding }] = useRespondBookingRequestMutation();
  const [withdrawBooking, { isLoading: withdrawing }] = useWithdrawBookingRequestMutation();
  const [getIcsCalendar, { isFetching: downloadingIcs }] = useLazyGetIcsCalendarQuery();

  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const booking = bookingData?.data;
  const activeReplacementCase = replacementData?.data?.find((c) => c.bookingId === bookingId);
  const sessions = sessionsData?.data || [];
  const dispute =
    disputesData?.data?.find((d) => d.bookingId === bookingId) || disputesData?.data?.[0];

  const status = booking?.status || 'requested';
  const priceBdt = booking?.pricePerSessionMinor
    ? Math.round(Number(booking.pricePerSessionMinor) / 100)
    : 0;

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
          ? `আইডি: #${bookingId.slice(0, 8)} | স্ট্যাটাস: ${
              status === 'accepted' || status === 'awaiting_payment'
                ? 'পেমেন্টের অপেক্ষায়'
                : status === 'confirmed'
                  ? 'নিশ্চিতকৃত'
                  : status === 'in_progress'
                    ? 'চলমান'
                    : status === 'completed'
                      ? 'সম্পন্ন'
                      : status === 'requested'
                        ? 'বিবেচনাধীন'
                        : 'বন্ধ'
            }`
          : `ID: #${bookingId.slice(0, 8)} | Status: ${status.replace(/_/g, ' ')}`
      }
    >
      <div className="w-full space-y-6" data-testid="booking-dossier-page">
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
            className="inline-flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'অনুরোধ তালিকায় ফিরে যান' : 'Back to Requests Overview'}</span>
          </Link>
          <span className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-300 font-bold px-3 py-1 rounded-full">
            ID: #{bookingId.slice(0, 8)}
          </span>
        </div>

        {/* Feedback / Alert Banners */}
        {actionMessage && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-950 flex items-center gap-2.5"
            data-testid="booking-success-banner"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
        {errorMessage && (
          <Alert variant="destructive" className="rounded-2xl" data-testid="booking-error-banner">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <AlertDescription role="alert">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
                  {educationLevelName}
                </span>
                {status === 'requested' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    {isBn ? 'অনুরোধ অপেক্ষমান' : 'Pending Response'}
                  </span>
                )}
                {status === 'accepted' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-950 border border-blue-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    {isBn ? 'গৃহীত — পেমেন্ট প্রয়োজন' : 'Accepted — Payment Required'}
                  </span>
                )}
                {status === 'awaiting_payment' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    {isBn ? 'পেমেন্টের অপেক্ষায়' : 'Awaiting Payment'}
                  </span>
                )}
                {status === 'confirmed' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    {isBn ? 'নিশ্চিতকৃত বুকিং' : 'Confirmed & Active'}
                  </span>
                )}
                {status === 'in_progress' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    {isBn ? 'ক্লাস চলছে' : 'In Progress'}
                  </span>
                )}
                {status === 'completed' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-900 border border-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                    {isBn ? 'সম্পন্ন' : 'Completed'}
                  </span>
                )}
                {status === 'cancelled' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
                    {isBn ? 'বাতিলকৃত' : 'Cancelled'}
                  </span>
                )}
                {status === 'disputed' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-800 animate-pulse" />
                    {isBn ? 'বিরোধ তদন্তাধীন' : 'Dispute Under Review'}
                  </span>
                )}
                {status === 'replacement_requested' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-950 border border-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-800 animate-pulse" />
                    {isBn ? 'রিপ্লেসমেন্ট প্রক্রিয়াধীন' : 'Replacement in Progress'}
                  </span>
                )}
                {dispute?.status === 'resolved_refund' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    {isBn ? '১০০% রিফান্ড সম্পন্ন' : '100% Refund Settled'}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {subjectName}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 font-semibold">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  {isBn ? 'শিক্ষক:' : 'Tutor:'}{' '}
                  <strong className="text-slate-900 font-bold">{tutorName}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  {isBn ? 'শিক্ষার্থী:' : 'Student:'}{' '}
                  <strong className="text-slate-900 font-bold">{studentName}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  {formatDate(booking?.createdAt || new Date(), locale)}
                </span>
              </div>
            </div>

            {/* Action CTA Box */}
            <div className="flex flex-wrap items-center gap-3">
              {(status === 'accepted' || status === 'awaiting_payment') && (
                <Link
                  href={withLocale(`/dashboard/bookings/${bookingId}/pay`, locale)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xs shadow-blue-500/25 transition-all hover:scale-102"
                  data-testid="pay-escrow-cta-btn"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isBn ? 'পেমেন্ট সম্পন্ন করুন' : 'Complete Payment'}</span>
                </Link>
              )}

              {status === 'requested' && isTutor && (
                <>
                  <Button
                    size="sm"
                    disabled={responding}
                    onClick={() => handleTutorResponse('accept')}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs shadow-blue-500/25"
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
                    className="border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs"
                    data-testid="tutor-decline-booking-btn"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-700" />
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
                  className="border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs"
                  data-testid="withdraw-booking-btn"
                >
                  {isBn ? 'অনুরোধ প্রত্যাহার' : 'Withdraw Request'}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSafetyModalOpen(true)}
                className="border-slate-300 text-slate-800 hover:bg-slate-100 font-bold text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-rose-700" />
                {isBn ? 'সুরক্ষা রিপোর্ট' : 'Report Issue'}
              </Button>

              {!isTutor &&
                ['accepted', 'awaiting_payment', 'confirmed', 'in_progress', 'disputed', 'replacement_requested'].includes(
                  status,
                ) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReplacementModalOpen(true)}
                    className="border-blue-300 text-blue-900 bg-blue-50/70 hover:bg-blue-100 font-bold text-xs"
                    data-testid="open-replacement-modal-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                    {isBn ? 'রিপ্লেসমেন্ট গ্যারান্টি' : 'Replacement Guarantee'}
                  </Button>
                )}

              {!isTutor && ['confirmed', 'in_progress', 'completed'].includes(status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDisputeModalOpen(true)}
                  className="border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold text-xs"
                  data-testid="open-dispute-modal-btn"
                >
                  <Scale className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
                  {isBn ? 'বিরোধ দায়ের / রিফান্ড' : 'File Dispute'}
                </Button>
              )}

              {!isTutor && !hasReviewed && ['confirmed', 'in_progress', 'completed', 'accepted'].includes(status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewModalOpen(true)}
                  className="border-amber-400 text-amber-950 bg-amber-50/70 hover:bg-amber-100 font-bold text-xs"
                  data-testid="open-review-modal-btn"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5 text-amber-600 fill-current" />
                  {isBn ? 'শিক্ষককে রিভিউ দিন' : 'Rate Tutor'}
                </Button>
              )}

              {!isTutor && hasReviewed && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs"
                  data-testid="review-already-submitted-badge"
                >
                  <Star className="w-3.5 h-3.5 text-amber-600 fill-current" />
                  {isBn ? 'রিভিউ প্রদত্ত হয়েছে' : 'Review Submitted'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tutor Replacement Guarantee Dossier Card */}
        {(activeReplacementCase || status === 'replacement_requested') && (
          <div
            className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
              activeReplacementCase?.status === 'accepted'
                ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30'
                : activeReplacementCase?.status === 'offered'
                  ? 'border-blue-300 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30'
                  : 'border-purple-300 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30'
            }`}
            data-testid="booking-replacement-dossier-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    activeReplacementCase?.status === 'accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeReplacementCase?.status === 'offered'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {isBn
                        ? '৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি ট্র্যাকার'
                        : '48-Hour Tutor Replacement Guarantee Dossier'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activeReplacementCase?.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : activeReplacementCase?.status === 'offered'
                            ? 'bg-blue-100 text-blue-950 border-blue-300'
                            : activeReplacementCase?.status === 'matching'
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-purple-100 text-purple-950 border-purple-300'
                      }`}
                    >
                      {activeReplacementCase?.status === 'accepted'
                        ? isBn
                          ? 'বিকল্প শিক্ষক গৃহীত ও বুকিং সক্রিয়'
                          : 'Replacement Accepted'
                        : activeReplacementCase?.status === 'offered'
                          ? isBn
                            ? 'নতুন বিকল্প শিক্ষক প্রস্তাবিত'
                            : 'Alternative Tutor Offered'
                          : activeReplacementCase?.status === 'matching'
                            ? isBn
                              ? 'বিকল্প শিক্ষক খোঁজা হচ্ছে'
                              : 'Matching Alternative Tutor'
                            : isBn
                              ? 'অনুরোধ পর্যালোচনাধীন'
                              : 'Under Review'}
                    </span>
                    {activeReplacementCase?.isOverdue && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        {isBn ? 'সময়সীমা অতিক্রান্ত' : 'Overdue'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    {isBn
                      ? 'অসন্তোষজনক অভিজ্ঞতা হলে বিনামূল্যে বিকল্প শিক্ষক অথবা ১০০% এসক্রো রিফান্ড গ্যারান্টি।'
                      : 'Free verified replacement matching or 100% money-back escrow guarantee.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeReplacementCase && (
                  <Link
                    href={withLocale(`/tutor-replacements/${activeReplacementCase.id}`, locale)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isBn ? 'কেস ডিটেইলস ও ইতিহাস' : 'Case Details'}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="pt-4 space-y-3">
              {activeReplacementCase?.explanation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    {isBn ? 'পরিবর্তন চাওয়ার কারণ ও বিবরণ:' : 'Reason & Details:'}
                  </p>
                  <p className="text-xs text-slate-900">{activeReplacementCase.explanation}</p>
                </div>
              )}

              {activeReplacementCase?.deadlineAt &&
                !['accepted', 'rejected', 'closed'].includes(activeReplacementCase.status) && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>
                      {isBn ? 'ম্যাচিং গ্যারান্টি সময়সীমা:' : 'Matching Guarantee Deadline:'}{' '}
                      <strong className="text-slate-900">
                        {formatDate(activeReplacementCase.deadlineAt, locale)}
                      </strong>
                    </span>
                  </div>
                )}

              {/* Offered Alternative Tutor Action Block */}
              {activeReplacementCase?.status === 'offered' &&
                activeReplacementCase.replacementTutor && (
                  <div
                    className="rounded-2xl border border-blue-300 bg-blue-50/90 p-4 space-y-3"
                    data-testid="booking-replacement-offer-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                          {isBn ? 'প্রস্তাবিত নতুন শিক্ষক' : 'Proposed Alternative Tutor'}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900">
                          {activeReplacementCase.replacementTutor.displayName}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                        {isBn ? 'যাচাইকৃত শিক্ষক' : 'Verified Tutor'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800">
                      {isBn
                        ? 'এই শিক্ষককে গ্রহণ করলে আপনার পূর্ববর্তী বুকিং ও অবশিষ্ট ক্লাসগুলো স্বয়ংক্রিয়ভাবে নতুন শিক্ষকের সাথে সংযুক্ত হবে।'
                        : 'Accepting this alternative tutor will automatically reassign remaining sessions to them.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        size="sm"
                        disabled={acceptingOffer || decliningOffer}
                        onClick={async () => {
                          try {
                            await acceptReplacementOffer(activeReplacementCase.id).unwrap();
                            playAudioTone('chime');
                            refetchBooking();
                            refetchReplacements();
                          } catch {
                            setErrorMessage(
                              isBn
                                ? 'শিক্ষক গ্রহণ প্রক্রিয়া ব্যর্থ হয়েছে।'
                                : 'Failed to accept offer.',
                            );
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                        data-testid="booking-accept-replacement-offer-btn"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>
                          {acceptingOffer
                            ? isBn
                              ? 'গ্রহণ হচ্ছে...'
                              : 'Accepting...'
                            : isBn
                              ? 'বিকল্প শিক্ষক গ্রহণ করুন'
                              : 'Accept Tutor'}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={acceptingOffer || decliningOffer}
                        onClick={async () => {
                          try {
                            await declineReplacementOffer(activeReplacementCase.id).unwrap();
                            playAudioTone('alert');
                            refetchReplacements();
                          } catch {
                            setErrorMessage(
                              isBn
                                ? 'শিক্ষক প্রত্যাখ্যান প্রক্রিয়া ব্যর্থ হয়েছে।'
                                : 'Failed to decline offer.',
                            );
                          }
                        }}
                        className="border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs gap-1.5"
                        data-testid="booking-decline-replacement-offer-btn"
                      >
                        <X className="w-4 h-4 text-rose-600" />
                        <span>
                          {decliningOffer
                            ? isBn
                              ? 'প্রত্যাখ্যান হচ্ছে...'
                              : 'Declining...'
                            : isBn
                              ? 'প্রত্যাখ্যান করুন'
                              : 'Decline'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Dispute Investigation / Resolution Dossier Card */}
        {(dispute || status === 'disputed') && (
          <div
            className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
              dispute?.status?.startsWith('resolved_')
                ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-card to-emerald-50/30'
                : 'border-amber-300 bg-gradient-to-br from-amber-50/90 via-card to-amber-50/30'
            }`}
            data-testid="booking-dispute-dossier-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border/60">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    dispute?.status?.startsWith('resolved_')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {dispute?.status?.startsWith('resolved_')
                        ? isBn
                          ? 'বিরোধ নিষ্পত্তি রিপোর্ট ও সিদ্ধান্ত'
                          : 'Dispute Resolution & Verdict Dossier'
                        : isBn
                          ? 'সক্রিয় বিরোধ পর্যালোচনা চলছে'
                          : 'Active Dispute Under Review'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        dispute?.status === 'resolved_refund'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : dispute?.status === 'resolved_partial_refund'
                            ? 'bg-blue-100 text-blue-950 border-blue-300'
                            : dispute?.status === 'resolved_tutor_upheld'
                              ? 'bg-purple-100 text-purple-950 border-purple-300'
                              : dispute?.status === 'dismissed'
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse'
                      }`}
                    >
                      {dispute?.status === 'resolved_refund'
                        ? isBn
                          ? '১০০% রিফান্ড কার্যকর'
                          : '100% Refund Approved'
                        : dispute?.status === 'resolved_partial_refund'
                          ? isBn
                            ? 'আংশিক রিফান্ড অনুমোদিত'
                            : 'Partial Refund Approved'
                          : dispute?.status === 'resolved_tutor_upheld'
                            ? isBn
                              ? 'শিক্ষকের পক্ষে নিষ্পত্তি'
                              : 'Tutor Upheld'
                            : dispute?.status === 'dismissed'
                              ? isBn
                                ? 'অভিযোগ খারিজ'
                                : 'Dismissed'
                              : isBn
                                ? 'তদন্তাধীন'
                                : 'Under Investigation'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">
                    {dispute?.status?.startsWith('resolved_')
                      ? isBn
                        ? 'অগ্রণী এডু ট্রাস্ট অ্যান্ড সেফটি টিম বিরোধ তদন্ত সম্পন্ন করেছে এবং নিষ্পত্তি সিদ্ধান্ত কার্যকর করেছে।'
                        : 'OgroniEdu Trust & Safety Team has completed the audit and executed the final resolution.'
                      : isBn
                        ? 'এই বুকিংটির বিপরীতে একটি আনুষ্ঠানিক বিরোধ দায়ের করা হয়েছে। নিষ্পত্তি না হওয়া পর্যন্ত এসক্রো ফান্ড থেকে শিক্ষকের অর্থ ছাড় স্থগিত থাকবে।'
                        : 'A formal dispute has been submitted for this booking. Escrow releases remain frozen until resolved.'}
                  </p>
                </div>
              </div>

              {dispute?.resolvedAt && (
                <span className="text-xs font-bold text-slate-800 shrink-0 bg-white/90 border border-slate-200 px-3 py-1 rounded-full">
                  {isBn ? 'মীমাংসার তারিখ: ' : 'Resolved: '}
                  {formatDate(dispute.resolvedAt, locale)}
                </span>
              )}
            </div>

            {/* Dispute Specifics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  {isBn ? 'অভিযোগের কারণ' : 'Dispute Reason'}
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  {dispute?.reasonCode
                    ? DISPUTE_REASONS[dispute.reasonCode]?.[locale] || dispute.reasonCode
                    : isBn
                      ? 'শিক্ষক অনুপস্থিত'
                      : 'Tutor No-Show'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  {isBn ? 'দাবীকৃত রিফান্ড' : 'Claimed Refund'}
                </span>
                <span className="text-xs font-black text-slate-900 mt-0.5 block font-mono">
                  ৳
                  {formatLocalizedNumber(
                    dispute?.disputedAmountMinor
                      ? Math.round(Number(dispute.disputedAmountMinor) / 100)
                      : priceBdt,
                    locale,
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  {isBn ? 'রিফান্ড নিষ্পত্তি' : 'Settled Amount'}
                </span>
                <span className="text-xs font-black text-emerald-900 mt-0.5 block font-mono">
                  {dispute?.status === 'resolved_refund' || dispute?.resolutionType === 'refund'
                    ? `৳${formatLocalizedNumber(dispute?.disputedAmountMinor ? Math.round(Number(dispute.disputedAmountMinor) / 100) : priceBdt, locale)}`
                    : dispute?.status === 'resolved_tutor_upheld' || dispute?.status === 'dismissed'
                      ? '৳০'
                      : isBn
                        ? 'বিবেচনাধীন'
                        : 'Pending'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  {isBn ? 'তদন্তকারী কর্তৃপক্ষ' : 'Audit Authority'}
                </span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  {dispute?.resolver?.displayName ||
                    (isBn ? 'অগ্রণী অডিট টিম' : 'Ogroni Audit Team')}
                </span>
              </div>
            </div>

            {/* Statement & Investigation Notes */}
            <div className="space-y-3 mt-4">
              {dispute?.description && (
                <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1">
                    {isBn ? 'অভিযোগকারীর বক্তব্য:' : 'Complainant Statement:'}
                  </span>
                  <p className="text-slate-800 italic leading-relaxed">"{dispute.description}"</p>
                </div>
              )}

              {dispute?.resolutionNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-100/60 border border-emerald-300 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {isBn
                        ? 'অ্যাডমিন অডিট রিপোর্ট ও নিষ্পত্তির কারণ:'
                        : 'Admin Audit Verdict & Resolution Notes:'}
                    </span>
                  </div>
                  <p className="text-emerald-950 leading-relaxed font-semibold">
                    {dispute.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verified Review Dossier Card */}
        {bookingReview && (
          <div
            data-testid="booking-review-dossier-card"
            className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-amber-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-300">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {!isTutor
                      ? isBn
                        ? 'আপনার প্রদত্ত ভেরিফাইড রিভিউ'
                        : 'Your Verified Review'
                      : isBn
                        ? 'শিক্ষার্থীর ভেরিফাইড রিভিউ'
                        : 'Student Verified Review'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-700">
                    {isBn
                      ? '১০০% যাচাইকৃত বুকিং সেশন ও শিক্ষক মূল্যায়ন'
                      : 'Verified booking session appraisal'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-black text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>{bookingReview.rating}.0 / 5.0</span>
              </div>
            </div>

            <ReviewCard
              review={bookingReview}
              isCurrentTutor={Boolean(isTutor)}
              locale={locale}
              replying={activeReply}
              replyText={tutorReplyText}
              isPostingReply={replyingToReview}
              replyError={replyError}
              onReplyTextChange={setTutorReplyText}
              onOpenReply={() => setActiveReply(true)}
              onCancelReply={() => {
                setActiveReply(false);
                setTutorReplyText('');
                setReplyError(null);
              }}
              onPostReply={handlePostTutorReply}
            />
          </div>
        )}

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-card p-4.5 space-y-1 shadow-xs">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {isBn ? 'সেশন ফি (প্রতি ক্লাস)' : 'Fee Per Session'}
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ৳{formatLocalizedNumber(priceBdt, locale)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-card p-4.5 space-y-1 shadow-xs">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {isBn ? 'ক্লাসের মাধ্যম' : 'Tutoring Mode'}
            </p>
            <p className="text-base font-bold text-slate-900 capitalize">
              {booking?.mode === 'in_person'
                ? isBn
                  ? 'বাসায় গিয়ে (In-Person)'
                  : 'In-Person'
                : isBn
                  ? 'অনলাইন ক্লাস (Google Meet)'
                  : 'Online'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-card p-4.5 space-y-1 shadow-xs">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {isBn ? 'সেশন ব্যাপ্তি' : 'Duration'}
            </p>
            <p className="text-base font-bold text-slate-900 font-mono">
              {formatLocalizedNumber(Number(booking?.durationMinutes) || 60, locale)}{' '}
              {isBn ? 'মিনিট' : 'Mins'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-card p-4.5 space-y-1 shadow-xs">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {isBn ? 'এসক্রো নিরাপত্তা' : 'Escrow Protection'}
            </p>
            <p className="text-base font-bold text-emerald-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{isBn ? '১০০% সুরক্ষিত' : '100% Guaranteed'}</span>
            </p>
          </div>
        </div>

        {/* 2-Column Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preferred Weekly Routine & Schedule Slots */}
            <div className="rounded-2xl border border-slate-200 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-700" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isBn ? 'সাপ্তাহিক ক্লাসের পছন্দের দিন ও রুটিন' : 'Weekly Class Routine'}
                  </h3>
                </div>
                <span className="text-xs text-slate-700 font-mono font-bold">
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
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-700" />
                      <span>{weekdayLabels[dayNum] || `Day ${dayNum}`}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700 font-medium">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isBn ? 'শিক্ষার্থীর প্রয়োজন ও শিক্ষকের জন্য নোট:' : 'Learning Goals & Notes:'}
                  </p>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
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

            {/* Scheduled Sessions Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isBn ? 'ক্লাস সূচি ও লাইভ সেশনসমূহ' : 'Class Schedule & Live Sessions'}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {formatLocalizedNumber(sessions.length, locale)} {isBn ? 'টি সেশন' : 'Sessions'}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 space-y-2">
                  <p className="font-medium">
                    {isBn
                      ? 'এখনও কোনো লাইভ সেশন শিডিউল করা হয়নি।'
                      : 'No live sessions scheduled yet for this booking.'}
                  </p>
                  {status === 'confirmed' && isTutor && (
                    <p className="text-xs font-bold text-blue-900">
                      {isBn
                        ? 'সেশন প্যানেল থেকে শিক্ষার্থীদের সাথে নতুন সেশন শিডিউল করুন।'
                        : 'Schedule sessions from your tutor sessions management panel.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, idx) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors shadow-xs"
                      data-testid={`booking-session-item-${idx}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {isBn ? `সেশন #${idx + 1}` : `Session #${idx + 1}`}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              session.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                : session.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-950 border-blue-300'
                                  : session.status === 'scheduled'
                                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-700" />
                            {formatDate(session.startsAt, locale)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-700" />
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{isBn ? 'ক্লাসে যোগ দিন' : 'Join Class'}</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic font-medium">
                            {isBn ? 'লিংক তৈরির অপেক্ষায়' : 'Link Pending'}
                          </span>
                        )}
                        <Link
                          href={withLocale(`/sessions/${session.id}`, locale)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs transition-colors"
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
            <div className="rounded-2xl border border-slate-200 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Calendar className="w-4 h-4 text-blue-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {isBn ? 'ক্যালেন্ডার সিঙ্ক ও রুটিন' : 'Calendar Synchronization'}
                </h3>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
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
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs transition-all hover:border-blue-400"
                    data-testid="google-calendar-sync-btn"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
                    <span>{isBn ? 'Google Calendar-এ যোগ করুন' : 'Add to Google Calendar'}</span>
                  </a>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadIcs}
                  disabled={downloadingIcs}
                  className="w-full justify-center text-xs h-10 border-slate-300 hover:bg-slate-100 font-bold text-slate-900"
                  data-testid="download-ics-calendar-btn"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
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
            <div className="rounded-2xl border border-slate-200 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {isBn ? 'অগ্রণী এডু আর্থিক ট্রাস্ট নিশ্চয়তা' : 'OgroniEdu Escrow Protection'}
                </h3>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-800 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? 'ক্লাস সন্তোষজনকভাবে সম্পন্ন না হওয়া পর্যন্ত শিক্ষকের কাছে টাকা ছাড় করা হয় না।'
                      : 'Tutor payout is held safely in escrow until milestone approval.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? '৪৮ ঘণ্টার ফ্রি টিউটর রিপ্লেসমেন্ট নিশ্চয়তা কার্যকর।'
                      : '48-Hour Free Tutor Replacement Guarantee protected.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
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
          onSuccess={() => {
            refetchBooking();
            refetchReplacements();
          }}
        />

        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          bookingId={bookingId}
          tutorName={tutorName}
          subjectName={subjectName}
          locale={locale}
          onSuccess={() => {
            refetchBooking();
            refetchBookingReview();
          }}
        />

        <DisputeModal
          isOpen={disputeModalOpen}
          onClose={() => {
            setDisputeModalOpen(false);
            refetchBooking();
            refetchDisputes();
          }}
          bookingId={bookingId}
          tutorName={tutorName}
          priceBdt={priceBdt}
          locale={locale}
        />
      </div>
    </DashboardShell>
  );
}
