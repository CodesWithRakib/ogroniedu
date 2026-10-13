'use client';

import { use } from 'react';
import { HomePage } from '@/features/public/pages/home-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function HomeRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <HomePage locale={locale} />;
}
