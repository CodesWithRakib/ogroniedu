'use client';

import { use } from 'react';
import { PrivacyPage } from '@/features/public/pages/privacy-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function PrivacyRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <PrivacyPage locale={locale} />;
}
