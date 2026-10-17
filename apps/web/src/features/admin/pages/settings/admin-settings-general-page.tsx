'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sliders } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';
import { useAdminActions } from '../../hooks/use-admin-actions';
import { AdminSettingsTab } from '../../components/tabs/adminSettingsTab';
import type { AdminSystemSettingItem } from '../../types/admin.types';

export function AdminSettingsGeneralPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const admin = useAdminDashboard(locale);

  const actions = useAdminActions({
    initialSettings: admin.settings as AdminSystemSettingItem[],
  });

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'সিস্টেম রেফারেন্স কনফিগারেশন' : 'System Reference Settings'}
    >
      <div className="space-y-6 py-6" data-testid="admin-settings-general-page">
        {/* Back Link to Hub (Image 2 Pattern) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/settings', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← প্ল্যাটফর্ম সেটিংস-এ ফিরে যান' : '← Back to Platform Settings'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'সিস্টেম রেফারেন্স কনফিগারেশন' : 'System Reference Settings'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-info-soft text-info-soft-foreground border border-info/30">
                CORE CONFIG
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'সিস্টেমের রেফারেন্স সেটিংস, টাইমআউট এবং অপারেশনাল ভ্যারিয়েবল পরিচালনা'
                : 'Manage operational reference thresholds, cache timeouts, and system parameters'}
            </p>
          </div>
        </div>

        {actions.actionError && (
          <Alert variant="destructive" data-testid="admin-action-error">
            <AlertDescription role="alert">{actions.actionError}</AlertDescription>
          </Alert>
        )}

        {admin.loading && !admin.settings.length ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            <AdminSettingsTab settings={actions.settings} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
