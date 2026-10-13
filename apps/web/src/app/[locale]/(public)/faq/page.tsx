'use client';

import { use } from 'react';
import { FaqPage } from '@/features/public/pages/faq-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function FaqRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <FaqPage locale={locale} />;
}
