'use client';

import { use } from 'react';
import { SafetyPage } from '@/features/public/pages/safety-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function SafetyRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <SafetyPage locale={locale} />;
}
