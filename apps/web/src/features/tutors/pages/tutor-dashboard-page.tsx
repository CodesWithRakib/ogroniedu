'use client';

import React from 'react';
import Link from 'next/link';
import {
  Inbox,
  Calendar,
  ShieldCheck,
  BarChart3,
  Plus,
  Sparkles,
  CreditCard,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { LoadingSpinner, Alert, AlertDescription, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { TutorVerificationStatusCard } from '@/components/tutor/TutorVerificationStatusCard';
import {
  QualificationUploadCard,
  TutorEarningsCommandBar,
  TutorTodayScheduleTimeline,
  TutorPerformanceRadar,
} from '../components';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppSelector, useAppDispatch } from '@/store';
import { enqueueToast } from '@/store/slices/ui-slice';
import { playAudioTone } from '@/lib/audio/notification-sound';
import {
  useGetOwnTutorProfileQuery,
  useSubmitTutorVerificationMutation,
  useSetTutorPublicationMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetMyTutorAnalyticsQuery } from '@/store/services/analytics-api';
import { useGetTutorFinanceSummaryQuery } from '@/store/services/payments-api';

const VERIFICATION_STATUSES = [
  'not_submitted',
  'submitted',
  'under_review',
  'needs_information',
  'approved',
  'rejected',
  'suspended',
] as const;

type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

function toVerificationStatus(raw: unknown): VerificationStatus {
  return typeof raw === 'string' && (VERIFICATION_STATUSES as readonly string[]).includes(raw)
    ? (raw as VerificationStatus)
    : 'not_submitted';
}

/**
 * Tutor dashboard entry: Donezo/Shopeers aesthetic with real tutor API data,
 * executive analytics cards, Quick Actions bar, and verification workflow.
 */
export function TutorDashboardPage({ locale }: { locale: Locale }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const profile = useGetOwnTutorProfileQuery(undefined, { pollingInterval: 4000 });
  const [isPublishing, setIsPublishing] = React.useState(false);
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const analytics = useGetMyTutorAnalyticsQuery();
  const finance = useGetTutorFinanceSummaryQuery();
  const [submitVerification] = useSubmitTutorVerificationMutation();
  const [setPublication] = useSetTutorPublicationMutation();
  const isBn = locale === 'bn';

  const incoming = requests.data?.data ?? [];
  const envelope = profile.data?.data as TutorOwnProfile | { profile: TutorOwnProfile } | undefined;
  const prof: TutorOwnProfile | undefined =
    envelope && typeof envelope === 'object' && 'profile' in envelope
      ? (envelope as { profile: TutorOwnProfile }).profile
      : (envelope as TutorOwnProfile | undefined);
  const verificationStatus = toVerificationStatus(prof?.verificationStatus);
  const rawPublication = String(prof?.publicationStatus ?? 'draft');
  const publicationStatus =
    rawPublication === 'published'
      ? 'published'
      : rawPublication === 'unpublished'
        ? 'unpublished'
        : 'draft';

  const prevStatusRef = React.useRef<VerificationStatus | null>(null);
  React.useEffect(() => {
    if (prevStatusRef.current && prevStatusRef.current !== verificationStatus) {
      if (verificationStatus === 'approved') {
        playAudioTone('success');
        dispatch(
          enqueueToast({
            title: isBn ? '🎉 ভেরিফিকেশন অনুমোদিত!' : '🎉 Verification Approved!',
            message: isBn
              ? 'অভিনন্দন! আপনার প্রোফাইল ভেরিফিকেশন সফলভাবে অনুমোদিত হয়েছে।'
              : 'Your profile verification has been approved.',
            type: 'success',
          }),
        );
      } else if (verificationStatus === 'needs_information') {
        playAudioTone('alert');
        dispatch(
          enqueueToast({
            title: isBn ? '⚠️ তথ্যে সংশোধন প্রয়োজন' : '⚠️ Action Required',
            message: isBn
              ? 'অ্যাডমিন টিম আপনার নথিপত্রে কিছু সংশোধনের অনুরোধ করেছেন।'
              : 'Admin requested changes to your verification documents.',
            type: 'warning',
          }),
        );
      }
    }
    prevStatusRef.current = verificationStatus;
  }, [verificationStatus, isBn, dispatch]);

  async function handlePublishProfile() {
    setIsPublishing(true);
    try {
      await setPublication({ publicationStatus: 'published' }).unwrap();
      playAudioTone('success');
      dispatch(
        enqueueToast({
          title: isBn ? 'প্রোফাইল প্রকাশিত!' : 'Profile published!',
          message: isBn
            ? 'আপনার প্রোফাইল এখন প্ল্যাটফর্মের সকল শিক্ষার্থী দেখতে পাবে।'
            : 'Your profile is now live on the marketplace.',
          type: 'success',
        }),
      );
    } catch {
      dispatch(
        enqueueToast({
          title: isBn ? 'প্রকাশ করতে ব্যর্থ' : 'Failed to publish',
          message: isBn ? 'অনুগ্রহ করে পুনরায় চেষ্টা করুন।' : 'Please try again.',
          type: 'error',
        }),
      );
    } finally {
      setIsPublishing(false);
    }
  }
  const rawQualifications = (prof as { qualifications?: unknown } | undefined)?.qualifications;
  const qualifications = Array.isArray(rawQualifications)
    ? rawQualifications.flatMap((q) => {
        if (typeof q !== 'object' || q === null) return [];
        const row = q as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.title !== 'string') return [];
        const status: 'pending' | 'approved' | 'rejected' | 'expired' =
          row.reviewStatus === 'approved' ||
          row.reviewStatus === 'rejected' ||
          row.reviewStatus === 'expired'
            ? row.reviewStatus
            : 'pending';
        return [
          {
            id: row.id,
            title: row.title,
            qualificationType:
              typeof row.qualificationType === 'string' ? row.qualificationType : '',
            institution: typeof row.institution === 'string' ? row.institution : null,
            reviewStatus: status,
          },
        ];
      })
    : [];

  const upcomingSession = sessions.data?.data?.[0];

  const aData = analytics.data?.data;
  const earningsVal =
    typeof aData?.earnings === 'number'
      ? aData.earnings
      : typeof aData?.earnings === 'object' &&
          aData?.earnings !== null &&
          'totalEarningsBdt' in aData.earnings
        ? (aData.earnings.totalEarningsBdt ?? 0)
        : 0;

  const fData = finance.data?.data;
  const availableBdt = fData?.availableMinor
    ? Math.round(Number(fData.availableMinor) / 100)
    : earningsVal;
  const escrowPendingBdt = fData?.escrowPendingMinor
    ? Math.round(Number(fData.escrowPendingMinor) / 100)
    : 0;
  const lifetimeNetBdt = fData?.lifetimeNetMinor
    ? Math.round(Number(fData.lifetimeNetMinor) / 100)
    : earningsVal;
  const minPayoutBdt = fData?.minimumPayoutMinor
    ? Math.round(Number(fData.minimumPayoutMinor) / 100)
    : 500;

  return (
    <TutorLayout
      locale={locale}
      title={isBn ? 'শিক্ষক ড্যাশবোর্ড' : 'Tutor Dashboard'}
      subtitle={
        isBn
          ? `স্বাগতম, ${user?.displayName ?? 'শিক্ষক'}! আপনার আগত অনুরোধ, শিডিউল ও পাঠদান কর্মক্ষমতা পর্যবেক্ষণ করুন।`
          : `Welcome, ${user?.displayName ?? 'Tutor'}! Manage bookings, classroom sessions, and teaching earnings.`
      }
      actions={
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-xl">
            <Link
              href={withLocale('/dashboard/tutor/sessions', locale)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isBn ? 'নতুন ক্লাস' : 'Schedule Class'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link
              href={withLocale('/dashboard/tutor/payments', locale)}
              className="flex items-center gap-1.5"
            >
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isBn ? 'আয় ও পে-আউট' : 'Earnings & Payouts'}</span>
            </Link>
          </Button>
        </div>
      }
    >
      {/* ======================================================== */}
      {/* 0. TUTOR EARNINGS & PAYOUT READINESS COMMAND BAR         */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* REAL-TIME VERIFICATION & COMPLIANCE STATUS BANNER        */}
      {/* ======================================================== */}
      {verificationStatus === 'under_review' || verificationStatus === 'submitted' ? (
        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="tutor-verification-banner-under-review"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isBn ? 'আপনার ভেরিফিকেশন আবেদন পর্যালোচনায় রয়েছে' : 'Verification Under Review'}
                </h3>
                <Badge variant="warning" className="text-[10px]">
                  {isBn ? 'পর্যালোচনাধীন' : 'In Review'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {isBn
                  ? 'আমাদের অ্যাডমিন ও কমপ্লায়েন্স টিম আপনার জাতীয় পরিচয়পত্র ও শিক্ষাগত সনদ যাচাই করছে। অনুমোদন সম্পন্ন হলে আপনার প্রোফাইল স্বয়ংক্রিয়ভাবে মার্কেটপ্লেসে লাইভ করার উপযুক্ত হবে।'
                  : 'Our compliance team is verifying your national ID and educational credentials. You will be notified immediately upon approval.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl text-xs">
            <Link href={withLocale('/dashboard/tutor/verification', locale)}>
              {isBn ? 'ডসিয়ারের বিবরণ দেখুন' : 'View Verification Dossier'}
            </Link>
          </Button>
        </div>
      ) : verificationStatus === 'needs_information' ? (
        <div
          className="rounded-xl border border-warning/40 bg-warning/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="tutor-verification-banner-needs-info"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center text-warning shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isBn
                    ? '⚠️ নথিপত্রে তথ্য সংশোধন প্রয়োজন'
                    : '⚠️ Action Required: Additional Information Needed'}
                </h3>
                <Badge variant="destructive" className="text-[10px]">
                  {isBn ? 'সংশোধন প্রয়োজন' : 'Action Required'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {(prof as Record<string, unknown>)?.applicantFeedback
                  ? String((prof as Record<string, unknown>).applicantFeedback)
                  : isBn
                    ? 'অ্যাডমিন টিম আপনার নথিপত্রে কিছু অসঙ্গতি খুঁজে পেয়েছে। অনুগ্রহ করে সঠিক প্রমাণপত্র পুনরায় আপলোড করুন।'
                    : 'The compliance team found issues with your documents. Please review and re-upload valid evidence.'}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 rounded-xl text-xs bg-warning hover:bg-warning/90 text-warning-foreground font-bold"
          >
            <Link href={withLocale('/dashboard/tutor/verification', locale)}>
              {isBn ? 'নথি সংশোধন ও আপলোড' : 'Fix & Re-upload'}
            </Link>
          </Button>
        </div>
      ) : verificationStatus === 'rejected' ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="tutor-verification-banner-rejected"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isBn ? 'ভেরিফিকেশন আবেদন প্রত্যাখ্যাত হয়েছে' : 'Verification Rejected'}
                </h3>
                <Badge variant="destructive" className="text-[10px]">
                  {isBn ? 'বাতিল' : 'Rejected'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {(prof as Record<string, unknown>)?.applicantFeedback
                  ? String((prof as Record<string, unknown>).applicantFeedback)
                  : isBn
                    ? 'আপনার জমা দেওয়া তথ্য ও প্রমাণাদি নীতিমালার সাথে সংগতিপূর্ণ নয়। প্রয়োজনে সাপোর্টে যোগাযোগ করুন।'
                    : 'Your submitted evidence did not satisfy our verification criteria. Contact support if you need assistance.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl text-xs">
            <Link href={withLocale('/support', locale)}>
              {isBn ? 'সাপোর্টে যোগাযোগ' : 'Contact Support'}
            </Link>
          </Button>
        </div>
      ) : verificationStatus === 'approved' && publicationStatus !== 'published' ? (
        <div
          className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="tutor-verification-banner-publish-cta"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {isBn
                    ? '🎉 অভিনন্দন! আপনার শিক্ষক প্রোফাইল ভেরিফাইড হয়েছে'
                    : '🎉 Congratulations! Your Profile is Verified'}
                </h3>
                <Badge variant="success" className="text-[10px]">
                  {isBn ? 'ভেরিফাইড' : 'Verified'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {isBn
                  ? 'আপনার সমস্ত সনদ ও পরিচয় সফলভাবে যাচাই সম্পন্ন হয়েছে। শিক্ষার্থীরা যাতে আপনাকে খুঁজে পেতে পারে, এখনই মার্কেটপ্লেসে আপনার প্রোফাইলটি প্রকাশ করুন।'
                  : 'Your credentials have been successfully approved. Publish your profile now so students can find and book lessons with you.'}
              </p>
            </div>
          </div>
          <Button
            onClick={handlePublishProfile}
            size="sm"
            disabled={isPublishing}
            isLoading={isPublishing}
            className="shrink-0 rounded-xl text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {isBn ? 'মার্কেটপ্লেসে প্রোফাইল প্রকাশ করুন' : 'Publish Profile Now'}
          </Button>
        </div>
      ) : verificationStatus === 'approved' && publicationStatus === 'published' ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {isBn
                ? 'আপনার শিক্ষক প্রোফাইল ভেরিফাইড এবং মার্কেটপ্লেসে সক্রিয় রয়েছে।'
                : 'Your profile is verified and live on the marketplace.'}
            </span>
          </div>
          <Link
            href={withLocale(`/tutors/${user?.id}`, locale)}
            target="_blank"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>{isBn ? 'পাবলিক প্রোফাইল দেখুন' : 'View Public Profile'}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      <TutorEarningsCommandBar
        locale={locale}
        availableBdt={availableBdt}
        escrowPendingBdt={escrowPendingBdt}
        lifetimeNetBdt={lifetimeNetBdt}
        minPayoutBdt={minPayoutBdt}
        isLoading={finance.isLoading}
      />

      {/* ======================================================== */}
      {/* 1. DONEZO 4-CARD HERO KPI GRID                           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Featured Hero Solid Card (Incoming Requests) */}
        <HeroKpiCard
          variant="hero"
          icon={Inbox}
          title={isBn ? 'আগত বুকিং অনুরোধ' : 'Incoming Requests'}
          value={requests.isLoading ? '...' : formatLocalizedNumber(incoming.length, locale)}
          changeText={
            isBn
              ? `${formatLocalizedNumber(incoming.length, locale)}টি নতুন টিউশন অনুরোধ`
              : `${incoming.length} new tuition requests`
          }
          href={withLocale('/dashboard/tutor/requests', locale)}
          testId="tutor-requests-card"
        />

        {/* Card 2: Scheduled Sessions */}
        <HeroKpiCard
          variant="secondary"
          icon={Calendar}
          title={isBn ? 'নির্ধারিত ক্লাস' : 'Scheduled Sessions'}
          value={
            sessions.isLoading
              ? '...'
              : formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)
          }
          changeText={isBn ? 'আসন্ন লাইভ ক্লাস শিডিউল' : 'Live classes scheduled'}
          href={withLocale('/dashboard/tutor/sessions', locale)}
          testId="tutor-sessions-card"
        />

        {/* Card 3: Verification Status Badge */}
        <HeroKpiCard
          variant="secondary"
          icon={ShieldCheck}
          title={isBn ? 'যাচাইকরণ স্ট্যাটাস' : 'Verification Status'}
          value={
            verificationStatus === 'approved'
              ? isBn
                ? 'অনুমোদিত'
                : 'Verified'
              : verificationStatus === 'under_review'
                ? isBn
                  ? 'যাচাইধীন'
                  : 'In Review'
                : isBn
                  ? 'খসড়া'
                  : 'Draft'
          }
          changeText={
            publicationStatus === 'published'
              ? isBn
                ? '🟢 প্রোফাইল দৃশ্যমান'
                : '🟢 Profile Live'
              : isBn
                ? '⚪ খসড়া মোড'
                : '⚪ Draft Mode'
          }
          href={withLocale('/dashboard/tutor/verification', locale)}
        />

        {/* Card 4: Teaching Rating / Consistency */}
        <HeroKpiCard
          variant="secondary"
          icon={Sparkles}
          title={isBn ? 'টিচিং রেটিং' : 'Teaching Rating'}
          value={
            typeof aData?.rating?.averageRating === 'number' && aData.rating.averageRating > 0
              ? `${formatLocalizedNumber(aData.rating.averageRating, locale)} ★`
              : '—'
          }
          changeText={
            (aData?.rating?.reviewsCount ?? 0) > 0
              ? isBn
                ? `${formatLocalizedNumber(aData?.rating?.reviewsCount ?? 0, locale)}টি রিভিউ`
                : `${aData?.rating?.reviewsCount ?? 0} reviews`
              : isBn
                ? 'নতুন শিক্ষক'
                : 'New tutor'
          }
          href={withLocale('/dashboard/tutor/learning', locale)}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. QUICK ACTIONS BAR                                     */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-3.5 rounded-xl bg-card border border-border">
        <span className="text-xs font-bold text-muted-foreground mr-1.5 flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isBn ? 'দ্রুত সেবা:' : 'Quick Actions:'}
        </span>
        <Link
          href={withLocale('/dashboard/tutor/requests', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <Inbox className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'টিউশন অনুরোধসমূহ' : 'Requests'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/sessions', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'ক্লাস শিডিউল' : 'Class Schedule'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/learning', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'স্টাডি রুম ও টিচিং' : 'Teaching Hub'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/verification', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'সনদ ও ভেরিফিকেশন' : 'Verification'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/payments', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors sm:ml-auto"
        >
          <CreditCard className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'আয় ও উত্তোলন' : 'Earnings'}</span>
        </Link>
      </div>

      {/* ======================================================== */}
      {/* 3. DONEZO VISUAL ANALYTICS & REMINDER ROW                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Activity Bar Chart (2 Cols on lg) */}
        <div className="lg:col-span-2">
          <WeeklyActivityChart
            locale={locale}
            title={isBn ? 'সাপ্তাহিক টিচিং সময়' : 'Weekly Teaching Hours'}
            subtitle={
              isBn ? 'সপ্তাহজুড়ে পাঠদান ও ক্লাসের ঘণ্টা' : 'Tutoring hours and engagement volume'
            }
          />
        </div>

        {/* Today's Schedule Timeline (1 Col on lg) */}
        <div className="lg:col-span-1">
          <TutorTodayScheduleTimeline
            locale={locale}
            sessions={sessions.data?.data ?? []}
            isLoading={sessions.isLoading}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. VERIFICATION, QUALIFICATION & PERFORMANCE SECTION    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Verification Status & Upload Cards */}
        <div className="lg:col-span-1 flex flex-col gap-4" data-testid="tutor-verification-section">
          {profile.isLoading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : profile.isError ? (
            <ErrorState
              message={normalizeApiError(profile.error, locale).message}
              onRetry={profile.refetch}
            />
          ) : (
            <>
              <TutorVerificationStatusCard
                locale={locale}
                verificationStatus={verificationStatus}
                publicationStatus={publicationStatus as 'draft' | 'published' | 'unpublished'}
                qualifications={qualifications}
                onSubmitVerification={async () => {
                  await submitVerification().unwrap();
                  profile.refetch();
                }}
                onTogglePublication={async (target) => {
                  await setPublication({
                    publicationStatus: target === 'published' ? 'published' : 'draft',
                  }).unwrap();
                  profile.refetch();
                }}
              />
              <QualificationUploadCard locale={locale} onUploaded={() => profile.refetch()} />
            </>
          )}
        </div>

        {/* Right Col: Performance & Focus Tracker (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <TutorPerformanceRadar
            locale={locale}
            rating={typeof aData?.rating?.averageRating === 'number' ? aData.rating.averageRating : 0}
            reviewCount={aData?.rating?.reviewsCount ?? 0}
            responseRate={aData?.inquiries?.acceptanceRate ?? 100}
            completionRate={aData?.sessions?.completionRate ?? 100}
            profileStrength={
              publicationStatus === 'published' ? 100 : verificationStatus === 'approved' ? 80 : 50
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProgressGaugeCard
              locale={locale}
              percentage={aData?.sessions?.completionRate ?? 100}
              title={isBn ? 'ক্লাস সমাপ্তি হার' : 'Completion Rate'}
              subtitle={isBn ? 'সফলভাবে সম্পন্ন ক্লাসের অনুপাত' : 'Successfully completed sessions'}
            />

            <ProgressGaugeCard
              locale={locale}
              percentage={aData?.inquiries?.acceptanceRate ?? 100}
              title={isBn ? 'অনুরোধ গ্রহণযোগ্যতা' : 'Inquiry Acceptance'}
              subtitle={isBn ? 'টিউশন অনুরোধ গ্রহণের হার' : 'Tuition inquiry acceptance rate'}
            />
          </div>

          {/* Performance & Analytics Details Card */}
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  {isBn ? 'অপারেশনাল পারফরম্যান্স ও আয়' : 'Teaching Analytics & Insights'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-primary">
                {isBn ? 'রিয়েল-টাইম মেট্রিক্স' : 'Live Metrics'}
              </span>
            </div>

            <div className="pt-4">
              {analytics.isLoading ? (
                <div className="py-6 flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
                  data-testid="tutor-analytics-data"
                >
                  <div className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/40 transition-colors">
                    <span className="text-[11px] text-muted-foreground font-semibold block">
                      {isBn ? 'মোট আয়' : 'Total Earnings'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums mt-1 block">
                      ৳{formatLocalizedNumber(earningsVal, locale)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/40 transition-colors">
                    <span className="text-[11px] text-muted-foreground font-semibold block">
                      {isBn ? 'অনুরোধ গ্রহণ হার' : 'Acceptance'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-primary tabular-nums mt-1 block">
                      {formatLocalizedNumber(aData?.inquiries?.acceptanceRate ?? 100, locale)}%
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/40 transition-colors">
                    <span className="text-[11px] text-muted-foreground font-semibold block">
                      {isBn ? 'ক্লাস সমাপ্তি হার' : 'Completion'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-primary tabular-nums mt-1 block">
                      {formatLocalizedNumber(aData?.sessions?.completionRate ?? 100, locale)}%
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/40 transition-colors">
                    <span className="text-[11px] text-muted-foreground font-semibold block">
                      {isBn ? 'শিক্ষার্থী রেটিং' : 'Rating'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-amber-600 tabular-nums mt-1 block">
                      {typeof aData?.rating?.averageRating === 'number' && aData.rating.averageRating > 0
                        ? `${formatLocalizedNumber(aData.rating.averageRating, locale)} ★`
                        : '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(requests.isError || sessions.isError) && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription role="alert">
            {normalizeApiError(requests.error ?? sessions.error, locale).message}
          </AlertDescription>
        </Alert>
      )}
    </TutorLayout>
  );
}
