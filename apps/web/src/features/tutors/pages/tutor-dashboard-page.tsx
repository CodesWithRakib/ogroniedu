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
} from 'lucide-react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import { HeroKpiCard } from '@/components/dashboard/HeroKpiCard';
import { WeeklyActivityChart } from '@/components/dashboard/WeeklyActivityChart';
import { SessionReminderCard } from '@/components/dashboard/SessionReminderCard';
import { ProgressGaugeCard } from '@/components/dashboard/ProgressGaugeCard';
import { StudyTimeTrackerCard } from '@/components/dashboard/StudyTimeTrackerCard';
import { LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { TutorVerificationStatusCard } from '@/components/tutor/TutorVerificationStatusCard';
import { QualificationUploadCard } from '../components/qualificationUploadCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppSelector } from '@/store';
import {
  useGetOwnTutorProfileQuery,
  useSubmitTutorVerificationMutation,
  useSetTutorPublicationMutation,
  type TutorOwnProfile,
} from '@/store/services/tutors-api';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetMyTutorAnalyticsQuery } from '@/store/services/analytics-api';

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
  const user = useAppSelector((s) => s.auth.user);
  const profile = useGetOwnTutorProfileQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const analytics = useGetMyTutorAnalyticsQuery();
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
          <Button asChild size="sm" className="rounded-full shadow-xs">
            <Link
              href={withLocale('/dashboard/tutor/sessions', locale)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isBn ? 'নতুন ক্লাস' : 'Schedule Class'}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
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
          value={isBn ? '৫.০ ★' : '5.0 ★'}
          changeText={isBn ? '১০০% বিশ্বস্ততা স্কোর' : '100% Trust score'}
          href={withLocale('/dashboard/tutor/learning', locale)}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. QUICK ACTIONS BAR                                     */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl bg-card border border-border shadow-xs">
        <span className="text-xs font-bold text-muted-foreground mr-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isBn ? 'দ্রুত সেবা:' : 'Quick Actions:'}
        </span>
        <Link
          href={withLocale('/dashboard/tutor/requests', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <Inbox className="w-3.5 h-3.5 text-info" />
          <span>{isBn ? 'টিউশন অনুরোধসমূহ' : 'Requests'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/sessions', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-success" />
          <span>{isBn ? 'ক্লাস শিডিউল' : 'Class Schedule'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/learning', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-warning" />
          <span>{isBn ? 'স্টাডি রুম ও টিচিং' : 'Teaching Hub'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/verification', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>{isBn ? 'সনদ ও ভেরিফিকেশন' : 'Verification'}</span>
        </Link>
        <Link
          href={withLocale('/dashboard/tutor/payments', locale)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 hover:bg-muted border border-border text-foreground text-xs font-semibold transition-colors sm:ml-auto"
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

        {/* Live Meeting Reminder Card (1 Col on lg) */}
        <div className="lg:col-span-1">
          <SessionReminderCard
            locale={locale}
            title={
              upcomingSession?.subject
                ? String(upcomingSession.subject)
                : isBn
                  ? 'পরবর্তী ক্লাস শিডিউল'
                  : 'Next Session'
            }
            timeRange={
              upcomingSession?.scheduledAt
                ? formatDateTime(String(upcomingSession.scheduledAt), locale)
                : undefined
            }
            roomUrl={upcomingSession?.meetingUrl ?? undefined}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. VERIFICATION, QUALIFICATION & PERFORMANCE SECTION    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col: Verification Status & Upload Cards */}
        <div className="lg:col-span-1 space-y-4" data-testid="tutor-verification-section">
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
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProgressGaugeCard
              locale={locale}
              percentage={92}
              title={isBn ? 'ক্লাস উপস্থিতি হার' : 'Attendance Rate'}
              subtitle={isBn ? 'শিক্ষার্থীদের নিয়মিত উপস্থিতি' : 'On-time student attendance'}
            />

            <StudyTimeTrackerCard
              locale={locale}
              title={isBn ? 'টিচিং সেশন টাইমার' : 'Teaching Session Timer'}
              subtitle={isBn ? 'সরাসরি ক্লাসের সময় নির্ধারণ' : 'Real-time live class duration'}
            />
          </div>

          {/* Performance & Analytics Details Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs">
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
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                  data-testid="tutor-analytics-data"
                >
                  <div className="p-3.5 rounded-2xl bg-muted  border border-border ">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {isBn ? 'মোট আয়' : 'Total Earnings'}
                    </span>
                    <span className="text-lg font-bold text-success-soft-foreground  mt-1 block">
                      ৳{formatLocalizedNumber(earningsVal, locale)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted  border border-border ">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {isBn ? 'অনুরোধ গ্রহণ হার' : 'Acceptance'}
                    </span>
                    <span className="text-lg font-bold text-info-soft-foreground  mt-1 block">
                      {formatLocalizedNumber(aData?.inquiries?.acceptanceRate ?? 100, locale)}%
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted  border border-border ">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {isBn ? 'ক্লাস সমাপ্তি হার' : 'Completion'}
                    </span>
                    <span className="text-lg font-bold text-interactive  mt-1 block">
                      {formatLocalizedNumber(aData?.sessions?.completionRate ?? 100, locale)}%
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted  border border-border ">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {isBn ? 'শিক্ষার্থী রেটিং' : 'Rating'}
                    </span>
                    <span className="text-lg font-bold text-warning mt-1 block">
                      {formatLocalizedNumber(aData?.rating?.averageRating ?? 5.0, locale)} ★
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
