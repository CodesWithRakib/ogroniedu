import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

interface ClassroomLegacyParams {
  locale: string;
  id: string;
}

export default async function ClassroomLegacyRedirectPage({
  params,
}: {
  params: Promise<ClassroomLegacyParams>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'bn';
  redirect(`/${locale}/dashboard/classroom/${id}`);
}
