'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { dashboardPathForRoles } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function DashboardRouterPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const router = useRouter();
  const { user, isAuthenticated, isLoading, token } = useAppSelector((s) => s.auth);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || isLoading) return;
    if (!isAuthenticated || !token || !user) {
      router.replace(`/${locale}/login`);
      return;
    }
    router.replace(dashboardPathForRoles(user.roles, locale));
  }, [hydrated, isLoading, isAuthenticated, token, user, router, locale]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/40 border-t-transparent" />
    </div>
  );
}
