'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { NotificationsPage } from '@/features/notifications/pages/notifications-page';
import type { Locale } from '@/lib/i18n';

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <NotificationsPage locale={locale} />
    </RequireAuth>
  );
}
