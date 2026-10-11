'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, LoadingSpinner, Button, Badge } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '@/store/services/notifications-api';

function NotificationsContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const { data, isLoading, isError, error, refetch } = useGetNotificationsQuery({
    page: 1,
    unreadOnly,
    limit: 50,
    locale,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAll] = useMarkAllAsReadMutation();

  const items = data?.items ?? [];

  return (
    <DashboardShell
      locale={locale}
      title={dict.notifications.title}
      subtitle={dict.notifications.emptyDesc}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => markAll().then(() => refetch())}
          disabled={items.filter((n) => !n.isRead).length === 0}
          data-testid="notifications-mark-all"
        >
          {dict.notifications.markAllRead}
        </Button>
      }
    >
      <div className="mb-4 flex gap-2" data-testid="notifications-filter">
        <Button size="sm" variant={unreadOnly ? 'outline' : 'primary'} onClick={() => setUnreadOnly(false)}>
          {dict.notifications.allTab}
        </Button>
        <Button size="sm" variant={unreadOnly ? 'primary' : 'outline'} onClick={() => setUnreadOnly(true)}>
          {dict.notifications.unreadTab}
        </Button>
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">{normalizeApiError(error, locale).message}</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="font-semibold">{dict.notifications.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{dict.notifications.emptyDesc}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3" data-testid="notifications-list">
          {items.map((n) => (
            <Card key={n.id} data-testid={`notification-row-${n.id}`}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{n.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!n.isRead && <Badge variant="warning">{dict.notifications.newBadge}</Badge>}
                  {!n.isRead && (
                    <Button size="sm" variant="outline" onClick={() => markAsRead({ id: n.id }).then(() => refetch())} data-testid={`notification-read-${n.id}`}>
                      {locale === 'bn' ? 'পঠিত' : 'Read'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <NotificationsContent locale={locale} />
    </RequireAuth>
  );
}
