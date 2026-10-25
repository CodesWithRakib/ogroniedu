import { redirect } from 'next/navigation';

export default async function GuardianSavedTutorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = await params;
  redirect(`/${resolved.locale}/dashboard/guardian/bookmarks`);
}
