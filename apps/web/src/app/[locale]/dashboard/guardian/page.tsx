'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { GuardianDashboardPage } from '@/features/guardian/pages/guardian-dashboard-page';
import type { Locale } from '@/lib/i18n';

export default function GuardianDashboardRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <GuardianDashboardPage locale={locale} />
    </RequireAuth>
  );
}
