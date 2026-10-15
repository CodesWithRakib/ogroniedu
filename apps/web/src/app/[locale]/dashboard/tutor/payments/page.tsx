'use client';

import { use } from 'react';
import { PaymentsPage } from '@/features/payments/pages/payments-page';
import type { Locale } from '@/lib/i18n';

export default function TutorPaymentsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <PaymentsPage locale={locale} />;
}
