import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

interface BookingPayPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function BookingPayPageRoute({ params }: BookingPayPageProps) {
  const resolved = await params;
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  redirect(`/${locale}/dashboard/bookings/${resolved.id}/pay`);
}
