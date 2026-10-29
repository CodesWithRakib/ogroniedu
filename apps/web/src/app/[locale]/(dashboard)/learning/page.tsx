'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LoadingSpinner } from '@/components/ui';
import { useAppSelector } from '@/store';
import { primaryRole } from '@/store/slices/auth-slice';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export default function LearningRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    const role = primaryRole(user.roles);
    if (role === 'guardian') {
      router.replace(withLocale('/dashboard/guardian/learning', locale));
    } else if (role === 'tutor') {
      router.replace(withLocale('/dashboard/tutor/learning', locale));
    } else {
      router.replace(withLocale('/dashboard/student/learning', locale));
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
