import { SafetyReportsPageView } from '@/features/trust/pages/safety-reports-page';
import type { Locale } from '@/lib/i18n';

export default async function GuardianSafetyReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = await params;
  const locale = (resolved.locale as Locale) || 'bn';
  return <SafetyReportsPageView locale={locale} />;
}
