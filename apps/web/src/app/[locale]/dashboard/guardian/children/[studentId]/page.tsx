'use client';

import { use } from 'react';
import { GuardianChildDetailPage } from '@/features/guardian/pages/guardian-child-detail-page';
import type { Locale } from '@/lib/i18n';

interface GuardianChildDetailPageProps {
  params: Promise<{ locale: string; studentId: string }>;
}

export default function GuardianChildDetailPageWrapper({ params }: GuardianChildDetailPageProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <GuardianChildDetailPage studentId={resolved.studentId} locale={locale} />;
}
