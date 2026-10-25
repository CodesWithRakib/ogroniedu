import { SavedTutorsPage } from '@/features/tutors/pages/saved-tutors-page';
import type { Locale } from '@/lib/i18n';

export default async function StudentBookmarksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = await params;
  const locale = (resolved.locale as Locale) || 'bn';
  return <SavedTutorsPage locale={locale} role="student" />;
}
