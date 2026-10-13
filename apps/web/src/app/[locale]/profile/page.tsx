'use client';

import { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ProfilePage } from '@/features/profile/pages/profile-page';
import type { Locale } from '@/lib/i18n';

export default function ProfileRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <main id="main-content">
        <ProfilePage locale={locale} />
      </main>
    </RequireAuth>
  );
}
