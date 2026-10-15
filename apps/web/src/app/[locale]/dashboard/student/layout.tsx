'use client';

import React, { use } from 'react';
import { RoleDashboardLayout } from '@/features/dashboard';
import type { Locale } from '@/lib/i18n';

export default function StudentDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RoleDashboardLayout role="student" locale={locale}>
      {children}
    </RoleDashboardLayout>
  );
}
