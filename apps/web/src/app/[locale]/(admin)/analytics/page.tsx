import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

/**
 * Legacy standalone analytics route redirector.
 * Automatically translates `/:locale/analytics` into `/:locale/dashboard/admin/analytics`.
 */
export default async function AnalyticsLegacyRedirectRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'bn';
  redirect(`/${locale}/dashboard/admin/analytics`);
}
