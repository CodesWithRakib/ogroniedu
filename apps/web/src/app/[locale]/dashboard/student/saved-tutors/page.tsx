import { redirect } from 'next/navigation';

export default async function StudentSavedTutorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = await params;
  redirect(`/${resolved.locale}/dashboard/student/bookmarks`);
}
