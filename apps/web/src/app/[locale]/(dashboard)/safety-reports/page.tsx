'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LoadingSpinner } from '@/components/ui';
import { useAppSelector } from '@/store';
import { primaryRole } from '@/store/slices/auth-slice';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function SafetyReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    const role = primaryRole(user.roles);
    if (role === 'guardian') {
      router.replace(withLocale('/dashboard/guardian/safety-reports', locale));
    } else if (role === 'admin' || role === 'super_admin') {
      router.replace(withLocale('/dashboard/admin/disputes', locale));
    } else {
      router.replace(withLocale('/dashboard/guardian/safety-reports', locale));
    }
  }, [isLoading, isAuthenticated, user, locale, router]);

  return (
    <RequireAuth locale={locale}>
      <div className="py-12 flex justify-center">
        <LoadingSpinner />
      </div>
    </RequireAuth>
  );
}
