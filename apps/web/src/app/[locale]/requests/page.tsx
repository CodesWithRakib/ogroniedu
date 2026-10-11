'use client';

import React, { use } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button, Card, CardHeader, CardTitle, CardContent, EmptyState, LoadingSpinner, Badge } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useAppSelector } from '@/store';
import {
  useGetBookingRequestsQuery,
  useWithdrawBookingRequestMutation,
  useRespondBookingRequestMutation,
} from '@/store/services/bookings-api';

function RequestsContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const user = useAppSelector((s) => s.auth.user);
  const isTutor = user?.roles?.includes('tutor');
  const { data, isLoading, isError, error, refetch } = useGetBookingRequestsQuery();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawBookingRequestMutation();
  const [respond, { isLoading: responding }] = useRespondBookingRequestMutation();
  const [actionError, setActionError] = React.useState<string | null>(null);

  const items = data?.data ?? [];

  async function handleWithdraw(id: string) {
    setActionError(null);
    try {
      await withdraw({ id }).unwrap();
      refetch();
    } catch (err) {
      setActionError(normalizeApiError(err as never, locale).message);
    }
  }

  async function handleRespond(id: string, action: 'accept' | 'decline') {
    setActionError(null);
    try {
      await respond({ id, action }).unwrap();
      refetch();
    } catch (err) {
      setActionError(normalizeApiError(err as never, locale).message);
    }
  }

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'টিউটরিং অনুরোধ' : 'Tutoring requests'}
      subtitle={locale === 'bn' ? 'অনুরোধ তৈরি, প্রত্যাহার ও শিক্ষকের উত্তর' : 'Create, withdraw, accept or decline'}
    >
      {actionError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="requests-action-error">
          {actionError}
        </div>
      )}
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">{normalizeApiError(error, locale).message}</CardContent></Card>
      ) : items.length === 0 ? (
        <EmptyState
          title={dict.feedback.emptyStateTitle}
          description={dict.feedback.emptyStateDescription}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="requests-list">
          {items.map((r) => (
            <Card key={r.id} data-testid={`request-card-${r.id}`}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-mono text-sm">{r.id.slice(0, 8)}…</CardTitle>
                <Badge variant={r.status === 'accepted' ? 'success' : r.status === 'declined' ? 'destructive' : 'warning'}>
                  {String(r.status)}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {!isTutor && (r.status === 'requested') && (
                  <Button size="sm" variant="outline" disabled={withdrawing} onClick={() => handleWithdraw(r.id)} data-testid={`withdraw-btn-${r.id}`}>
                    {dict.bookingRequest.withdrawButton}
                  </Button>
                )}
                {isTutor && r.status === 'requested' && (
                  <>
                    <Button size="sm" disabled={responding} onClick={() => handleRespond(r.id, 'accept')} data-testid={`accept-btn-${r.id}`}>
                      {dict.bookingRequest.acceptButton}
                    </Button>
                    <Button size="sm" variant="outline" disabled={responding} onClick={() => handleRespond(r.id, 'decline')} data-testid={`decline-btn-${r.id}`}>
                      {dict.bookingRequest.declineButton}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function RequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <RequestsContent locale={locale} />
    </RequireAuth>
  );
}
