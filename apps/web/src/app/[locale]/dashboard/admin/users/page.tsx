'use client';

import { use } from 'react';
import { AdminPage } from '@/features/admin/pages/admin-page';
import type { Locale } from '@/lib/i18n';

export default function AdminUsersRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <AdminPage locale={locale} />;
}
