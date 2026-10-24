'use client';

import React, { use } from 'react';
import { SafetyReportsPageView } from '@/features/trust/pages/safety-reports-page';
import type { Locale } from '@/lib/i18n';

export default function SafetyReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return <SafetyReportsPageView locale={locale} />;
}
