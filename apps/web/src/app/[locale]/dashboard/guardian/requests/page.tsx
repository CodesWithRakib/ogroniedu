'use client';

import { use } from 'react';
import { GuardianRequestsHubPage } from '@/features/guardian/pages/guardian-requests-hub-page';
import type { Locale } from '@/lib/i18n';

export default function GuardianRequestsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <GuardianRequestsHubPage locale={locale} />;
}
