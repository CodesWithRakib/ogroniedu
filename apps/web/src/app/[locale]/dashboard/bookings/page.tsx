import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

export default async function BookingsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'bn';
  redirect(`/${locale}/dashboard/student/requests`);
}

