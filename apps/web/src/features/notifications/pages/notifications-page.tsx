'use client';

import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { getDictionary, type Locale } from '@/lib/i18n';
import { useNotificationsFeed } from '../hooks/use-notifications-feed';

/** Notifications inbox entry: filter tabs, read actions, paged accumulation. */
export function NotificationsPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const feed = useNotificationsFeed(locale);

  return (
    <DashboardShell
      locale={locale}
      title={dict.notifications.title}
      subtitle={dict.notifications.emptyDesc}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={feed.markAllRead}
          disabled={feed.unreadCount === 0}
          data-testid="notifications-mark-all"
        >
          {dict.notifications.markAllRead}
        </Button>
      }
    >
      <div className="mb-4 flex gap-2" data-testid="notifications-filter">
        <Button
          size="sm"
          variant={feed.unreadOnly ? 'outline' : 'primary'}
          onClick={() => feed.setFilter(false)}
        >
          {dict.notifications.allTab}
        </Button>
        <Button
          size="sm"
          variant={feed.unreadOnly ? 'primary' : 'outline'}
          onClick={() => feed.setFilter(true)}
        >
          {dict.notifications.unreadTab}
        </Button>
      </div>
      {feed.isLoading ? (
        <LoadingState testId="notifications-loading" />
      ) : feed.errorMessage ? (
        <ErrorState
          message={feed.errorMessage}
          onRetry={feed.refetch}
          testId="notifications-error"
        />
      ) : feed.items.length === 0 ? (
        <EmptyState
          title={dict.notifications.emptyTitle}
          description={dict.notifications.emptyDesc}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3" data-testid="notifications-list">
            {feed.items.map((n) => (
              <Card key={n.id} data-testid={`notification-row-${n.id}`}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.isRead && <Badge variant="warning">{dict.notifications.newBadge}</Badge>}
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => feed.markOneRead(n.id)}
                        data-testid={`notification-read-${n.id}`}
                      >
                        {locale === 'bn' ? 'পঠিত' : 'Read'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {feed.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={feed.loadMore}
                disabled={feed.isFetchingMore}
                data-testid="notifications-load-more"
              >
                {feed.isFetchingMore
                  ? locale === 'bn'
                    ? 'লোড হচ্ছে…'
                    : 'Loading…'
                  : locale === 'bn'
                    ? 'আরও দেখুন'
                    : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
