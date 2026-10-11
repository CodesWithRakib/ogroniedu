'use client';

import React from 'react';
import { RoleLayout } from '../RoleLayout';
import type { Locale } from '@/lib/i18n';

export function AdminLayout({
  locale,
  title,
  subtitle,
  actions,
  children,
}: {
  locale: Locale;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RoleLayout
      locale={locale}
      allow={['admin', 'super_admin', 'support_agent', 'compliance_reviewer']}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </RoleLayout>
  );
}
