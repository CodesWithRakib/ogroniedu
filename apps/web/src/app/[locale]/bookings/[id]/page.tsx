import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

interface BookingDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function BookingDetailPageWrapper({ params }: BookingDetailPageProps) {
  const resolved = await params;
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  redirect(`/${locale}/dashboard/bookings/${resolved.id}`);
}
