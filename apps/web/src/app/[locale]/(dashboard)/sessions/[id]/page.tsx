'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { SessionDetailPage } from '@/features/bookings/pages/session-detail-page';
import type { Locale } from '@/lib/i18n';

interface SessionDetailRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function SessionDetailRoute({ params }: SessionDetailRouteProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <DashboardShell locale={locale}>
        <SessionDetailPage locale={locale} sessionId={resolved.id} />
      </DashboardShell>
    </RequireAuth>
  );
}
