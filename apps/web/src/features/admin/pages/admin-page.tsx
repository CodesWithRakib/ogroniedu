'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import type { AdminTabKey } from '../components/adminTabsBar';
import { AdminOverviewPage } from './admin-overview-page';
import { AdminUsersPage } from './admin-users-page';
import { AdminVerificationPage } from './admin-verification-page';
import { AdminDisputesPage } from './admin-disputes-page';
import { AdminAuditLogsPage } from './admin-audit-logs-page';
import { AdminSettingsPage } from './admin-settings-page';
import { AdminBookingsPage } from './admin-bookings-page';

function resolveTab(param: string | null, fallback?: AdminTabKey): AdminTabKey {
  if (!param) return fallback ?? 'overview';
  const clean = param.toLowerCase().trim();
  if (clean === 'audit' || clean === 'auditlogs' || clean === 'audit-logs') return 'auditLogs';
  if (clean === 'settings') return 'settings';
  if (clean === 'flags' || clean === 'featureflags' || clean === 'feature-flags')
    return 'featureFlags';
  if (clean === 'users') return 'users';
  if (clean === 'verification' || clean === 'tutors') return 'verification';
  if (clean === 'reconciliation') return 'reconciliation';
  if (clean === 'support' || clean === 'disputes' || clean === 'tickets' || clean === 'safety')
    return 'support';
  if (clean === 'bookings') return 'bookings';
  if (clean === 'overview') return 'overview';
  return fallback ?? 'overview';
}

/** Admin console entry: delegates cleanly to dedicated, modular role pages. */
export function AdminPage({ locale, initialTab }: { locale: Locale; initialTab?: AdminTabKey }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') ?? null;
  const activeTab = resolveTab(tabParam, initialTab);

  if (activeTab === 'users') {
    return <AdminUsersPage locale={locale} />;
  }
  if (activeTab === 'verification') {
    return <AdminVerificationPage locale={locale} />;
  }
  if (activeTab === 'reconciliation' || activeTab === 'support') {
    return <AdminDisputesPage locale={locale} />;
  }
  if (activeTab === 'auditLogs') {
    return <AdminAuditLogsPage locale={locale} />;
  }
  if (activeTab === 'settings' || activeTab === 'featureFlags') {
    return <AdminSettingsPage locale={locale} />;
  }
  if (activeTab === 'bookings') {
    return <AdminBookingsPage locale={locale} />;
  }

  return <AdminOverviewPage locale={locale} />;
}
