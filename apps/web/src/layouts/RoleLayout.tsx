'use client';

import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RequireRole } from '@/components/auth/RequireRole';
import { OnboardingGate } from '@/components/auth/OnboardingGate';
import type { UserRole } from '@/store/slices/auth-slice';
import type { Locale } from '@/lib/i18n';

/**
 * Role-scoped layout: authorization boundary + role shell + title in one place,
 * so route files stay thin (compose <XxxLayout><XxxPage/></XxxLayout>).
 */
export function RoleLayout({
  locale,
  allow,
  title,
  subtitle,
  actions,
  children,
}: {
  locale: Locale;
  allow: UserRole[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RequireRole locale={locale} allow={allow}>
      <OnboardingGate locale={locale}>
        <DashboardShell
          locale={locale}
          title={title}
          subtitle={subtitle}
          actions={actions}
          role={allow[0]}
        >
          {children}
        </DashboardShell>
      </OnboardingGate>
    </RequireRole>
  );
}
