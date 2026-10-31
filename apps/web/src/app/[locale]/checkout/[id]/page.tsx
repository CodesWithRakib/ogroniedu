'use client';

import { use } from 'react';
import { BookingPayPage } from '@/features/payments/pages/booking-pay-page';
import type { Locale } from '@/lib/i18n';

interface DirectCheckoutPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function DirectCheckoutPageRoute({ params }: DirectCheckoutPageProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <BookingPayPage bookingId={resolved.id} locale={locale} />;
}
