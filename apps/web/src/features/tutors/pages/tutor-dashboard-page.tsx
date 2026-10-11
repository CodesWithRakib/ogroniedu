'use client';

import React from 'react';
import { TutorLayout } from '@/layouts/tutor/TutorLayout';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '@/components/ui';
import { TutorVerificationStatusCard } from '@/components/tutor/TutorVerificationStatusCard';
import { StatCard } from '@/components/shared/StatCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
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
  return typeof raw === 'string' &&
    (VERIFICATION_STATUSES as readonly string[]).includes(raw)
    ? (raw as VerificationStatus)
    : 'not_submitted';
}

/** Tutor dashboard entry: verification, requests, sessions, performance — all real API data. */
export function TutorDashboardPage({ locale }: { locale: Locale }) {
  const user = useAppSelector((s) => s.auth.user);
  const profile = useGetOwnTutorProfileQuery();
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const analytics = useGetMyTutorAnalyticsQuery();
  const [submitVerification] = useSubmitTutorVerificationMutation();
  const [setPublication] = useSetTutorPublicationMutation();

  const incoming = requests.data?.data ?? [];
  const envelope = profile.data?.data as TutorOwnProfile | { profile: TutorOwnProfile } | undefined;
  const prof: TutorOwnProfile | undefined =
    envelope && typeof envelope === 'object' && 'profile' in envelope
      ? (envelope as { profile: TutorOwnProfile }).profile
      : (envelope as TutorOwnProfile | undefined);
  const verificationStatus = toVerificationStatus(prof?.verificationStatus);
  const rawPublication = String(prof?.publicationStatus ?? 'draft');
  const publicationStatus =
    rawPublication === 'published' ? 'published' : rawPublication === 'unpublished' ? 'unpublished' : 'draft';

  return (
    <TutorLayout
      locale={locale}
      title={locale === 'bn' ? 'শিক্ষক ড্যাশবোর্ড' : 'Tutor dashboard'}
      subtitle={user?.displayName ?? ''}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1" data-testid="tutor-verification-section">
          {profile.isLoading ? (
            <LoadingSpinner />
          ) : profile.isError ? (
            <ErrorState
              message={normalizeApiError(profile.error, locale).message}
              onRetry={profile.refetch}
            />
          ) : (
            <TutorVerificationStatusCard
              locale={locale}
              verificationStatus={verificationStatus}
              publicationStatus={publicationStatus as 'draft' | 'published' | 'unpublished'}
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
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            label={locale === 'bn' ? 'আগত অনুরোধ' : 'Incoming requests'}
            value={formatLocalizedNumber(incoming.length, locale)}
            isLoading={requests.isLoading}
            testId="tutor-requests-card"
          />
          <StatCard
            label={locale === 'bn' ? 'নির্ধারিত ক্লাস' : 'Scheduled sessions'}
            value={formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)}
            isLoading={sessions.isLoading}
            testId="tutor-sessions-card"
          />
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{locale === 'bn' ? 'পারফরম্যান্স' : 'Performance'}</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.isLoading ? (
                <LoadingSpinner />
              ) : analytics.isError ? (
                <p className="text-xs text-slate-500" data-testid="tutor-analytics-empty">
                  {locale === 'bn' ? 'এখনও পর্যাপ্ত তথ্য নেই।' : 'Not enough activity yet.'}
                </p>
              ) : (
                <pre className="max-h-48 overflow-auto text-xs" data-testid="tutor-analytics-data">
                  {JSON.stringify(analytics.data?.data ?? {}, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {(requests.isError || sessions.isError) && (
        <p className="mt-3 text-xs text-rose-600" role="alert">
          {normalizeApiError(requests.error ?? sessions.error, locale).message}
        </p>
      )}
    </TutorLayout>
  );
}
