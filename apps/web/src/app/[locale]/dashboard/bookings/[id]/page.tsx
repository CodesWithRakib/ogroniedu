'use client';

import { use } from 'react';
import { BookingDetailPage } from '@/features/bookings/pages/booking-detail-page';
import type { Locale } from '@/lib/i18n';

interface BookingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function DashboardBookingDetailRoute({ params }: BookingDetailPageProps) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <BookingDetailPage bookingId={resolved.id} locale={locale} />;
}
