'use client';

import { use } from 'react';
import { PricingPage } from '@/features/public/pages/pricing-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function PricingRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <PricingPage locale={locale} />;
}
