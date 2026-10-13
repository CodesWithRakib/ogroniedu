'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button, Card, CardHeader, CardTitle, CardContent, EmptyState, LoadingSpinner, Badge } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useBookingRequests } from '../hooks/use-booking-requests';

/** Tutoring requests entry: withdraw (student) and accept/decline (tutor) over the bookings API. */
export function RequestsPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const req = useBookingRequests(locale);
  const { items } = req;

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'টিউটরিং অনুরোধ' : 'Tutoring requests'}
      subtitle={locale === 'bn' ? 'অনুরোধ তৈরি, প্রত্যাহার ও শিক্ষকের উত্তর' : 'Create, withdraw, accept or decline'}
    >
      {req.actionError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="requests-action-error">
          {req.actionError}
        </div>
      )}
      {req.isLoading ? (
        <LoadingSpinner />
      ) : req.queryError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">{req.queryError}</CardContent></Card>
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
                {!req.isTutor && (r.status === 'requested') && (
                  <Button size="sm" variant="outline" disabled={req.withdrawing} onClick={() => req.handleWithdraw(r.id)} data-testid={`withdraw-btn-${r.id}`}>
                    {dict.bookingRequest.withdrawButton}
                  </Button>
                )}
                {req.isTutor && r.status === 'requested' && (
                  <>
                    <Button size="sm" disabled={req.responding} onClick={() => req.handleRespond(r.id, 'accept')} data-testid={`accept-btn-${r.id}`}>
                      {dict.bookingRequest.acceptButton}
                    </Button>
                    <Button size="sm" variant="outline" disabled={req.responding} onClick={() => req.handleRespond(r.id, 'decline')} data-testid={`decline-btn-${r.id}`}>
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
