'use client';

import React from 'react';
import { DashboardShell } from './DashboardShell';
import { RequireRole } from '@/components/auth/RequireRole';
import type { UserRole } from '@/store/slices/auth-slice';
import type { Locale } from '@/lib/i18n';

export interface RoleDashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  /** Roles allowed past the route gate; defaults to the nominal `role`. */
  allow?: UserRole[];
  locale: Locale;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function RoleDashboardLayout({
  children,
  role,
  allow,
  locale,
  title,
  subtitle,
  actions,
}: RoleDashboardLayoutProps) {
  return (
    <RequireRole locale={locale} allow={allow ?? [role]}>
      <DashboardShell
        locale={locale}
        role={role}
        title={title}
        subtitle={subtitle}
        actions={actions}
      >
        {children}
      </DashboardShell>
    </RequireRole>
  );
}
