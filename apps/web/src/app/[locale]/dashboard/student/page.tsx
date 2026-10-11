'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  EmptyState,
  LoadingSpinner,
} from '@/components/ui';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppSelector } from '@/store';
import { useGetBookingRequestsQuery } from '@/store/services/bookings-api';
import { useGetSessionsQuery } from '@/store/services/sessions-api';
import { useGetUnreadCountQuery } from '@/store/services/notifications-api';

function StudentDashboardContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const requests = useGetBookingRequestsQuery();
  const sessions = useGetSessionsQuery();
  const unread = useGetUnreadCountQuery();

  // The requests endpoint is already scoped to the authenticated student server-side.
  const myRequests = requests.data?.data ?? [];

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? `শিক্ষার্থী ড্যাশবোর্ড` : `Student dashboard`}
      subtitle={user?.displayName ?? user?.email ?? ''}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="student-overview-grid">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {locale === 'bn' ? 'বুকিং অনুরোধ' : 'Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.isLoading ? (
              <LoadingSpinner />
            ) : (
              <p className="text-2xl font-bold" data-testid="student-requests-count">
                {formatLocalizedNumber(requests.data?.data?.length ?? 0, locale)}
              </p>
            )}
            {requests.isError && (
              <p className="text-xs text-rose-600">
                {normalizeApiError(requests.error, locale).message}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {locale === 'bn' ? 'আসন্ন ক্লাস' : 'Sessions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.isLoading ? (
              <LoadingSpinner />
            ) : (
              <p className="text-2xl font-bold" data-testid="student-sessions-count">
                {formatLocalizedNumber(sessions.data?.data?.length ?? 0, locale)}
              </p>
            )}
            {sessions.isError && (
              <p className="text-xs text-rose-600">
                {normalizeApiError(sessions.error, locale).message}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{dict.notifications.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="student-unread-count">
              {formatLocalizedNumber(unread.data?.unreadCount ?? 0, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {locale === 'bn' ? 'পরবর্তী পদক্ষেপ' : 'Next steps'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              className="text-emerald-700 underline"
              href={withLocale('/tutors', locale)}
              data-testid="student-find-tutors-link"
            >
              {dict.nav.findTutors}
            </Link>
            <Link
              className="block text-emerald-700 underline"
              href={withLocale('/requests', locale)}
              data-testid="student-requests-link"
            >
              {locale === 'bn' ? 'আমার অনুরোধ দেখুন' : 'View my requests'}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        {requests.isLoading ? (
          <LoadingSpinner />
        ) : myRequests.length === 0 ? (
          <EmptyState
            title={dict.feedback.emptyStateTitle}
            description={
              locale === 'bn'
                ? 'এখনও কোনো টিউটরিং অনুরোধ নেই। যাচাইকৃত শিক্ষক খুঁজে প্রথম অনুরোধ পাঠান।'
                : 'No tutoring requests yet. Find a verified tutor to send your first request.'
            }
            actionLabel={dict.nav.findTutors}
            actionHref={withLocale('/tutors', locale)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'bn' ? 'সাম্প্রতিক অনুরোধ' : 'Recent requests'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm" data-testid="student-recent-requests">
              {myRequests.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>
                  <span className="text-xs font-semibold">{String(r.status)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}

export default function StudentDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <StudentDashboardContent locale={locale} />
    </RequireAuth>
  );
}
