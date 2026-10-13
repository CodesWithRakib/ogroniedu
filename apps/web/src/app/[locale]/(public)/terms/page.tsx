'use client';

import { use } from 'react';
import { TermsPage } from '@/features/public/pages/terms-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function TermsRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <TermsPage locale={locale} />;
}
