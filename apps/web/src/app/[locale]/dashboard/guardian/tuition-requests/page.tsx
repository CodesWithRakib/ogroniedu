import { redirect } from 'next/navigation';
import { type Locale } from '@/lib/i18n';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  redirect(`/${locale}/dashboard/guardian/requests`);
}
