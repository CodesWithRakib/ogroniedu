'use client';

import { use } from 'react';
import { HowItWorksPage } from '@/features/public/pages/how-it-works-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function HowItWorksRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <HowItWorksPage locale={locale} />;
}
