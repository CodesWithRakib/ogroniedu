import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

/**
 * Legacy admin route redirector.
 * Automatically translates old queries like `/bn/admin?tab=settings` into
 * modular sub-routes like `/bn/dashboard/admin/settings`.
 */
export default async function AdminLegacyRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const { tab } = await searchParams;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'bn';

  const clean = tab?.toLowerCase().trim();
  if (clean === 'settings' || clean === 'flags' || clean === 'featureflags') {
    redirect(`/${locale}/dashboard/admin/settings`);
  }
  if (clean === 'users') {
    redirect(`/${locale}/dashboard/admin/users`);
  }
  if (clean === 'audit' || clean === 'auditlogs' || clean === 'audit-logs') {
    redirect(`/${locale}/dashboard/admin/audit-logs`);
  }
  if (clean === 'verification' || clean === 'tutors') {
    redirect(`/${locale}/dashboard/admin/verification`);
  }
  if (clean === 'reconciliation' || clean === 'support' || clean === 'disputes') {
    redirect(`/${locale}/dashboard/admin/disputes`);
  }
  if (clean === 'bookings') {
    redirect(`/${locale}/dashboard/admin/bookings`);
  }
  if (clean === 'taxonomy') {
    redirect(`/${locale}/dashboard/admin/taxonomy`);
  }
  if (clean === 'analytics') {
    redirect(`/${locale}/dashboard/admin/analytics`);
  }

  redirect(`/${locale}/dashboard/admin`);
}
