'use client';

import { use } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ConversationsInboxView } from '@/features/messaging';
import { RequireRole } from '@/components/auth/RequireRole';
import type { Locale } from '@/lib/i18n';

export default function OrganizationMessagesRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireRole
      locale={locale}
      allow={['organization_owner', 'organization_staff', 'admin', 'super_admin']}
    >
      <DashboardShell locale={locale} role="organization_owner">
        <ConversationsInboxView locale={locale} />
      </DashboardShell>
    </RequireRole>
  );
}
