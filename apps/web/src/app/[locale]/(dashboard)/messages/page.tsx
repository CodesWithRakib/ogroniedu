'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ConversationsInboxView } from '@/features/messaging';
import { useAppSelector } from '@/store';
import { primaryRole } from '@/store/slices/auth-slice';
import { withLocale } from '@/lib/auth';
import { type Locale } from '@/lib/i18n';

export default function MessagesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    const role = primaryRole(user.roles);
    if (role === 'student') {
      router.replace(withLocale('/dashboard/student/messages', locale));
    } else if (role === 'tutor') {
      router.replace(withLocale('/dashboard/tutor/messages', locale));
    } else if (role === 'guardian') {
      router.replace(withLocale('/dashboard/guardian/messages', locale));
    } else if (role === 'admin' || role === 'super_admin') {
      router.replace(withLocale('/dashboard/admin/messages', locale));
    }
  }, [isLoading, isAuthenticated, user, locale, router]);

  return (
    <RequireAuth locale={locale}>
      <DashboardShell locale={locale}>
        <ConversationsInboxView locale={locale} />
      </DashboardShell>
    </RequireAuth>
  );
}

