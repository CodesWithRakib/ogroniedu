'use client';

import React from 'react';
import { Sliders, ToggleLeft } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { useAdminActions } from '../hooks/use-admin-actions';
import { AdminSettingsTab } from '../components/tabs/adminSettingsTab';
import { AdminFeatureFlagsTab } from '../components/tabs/adminFeatureFlagsTab';
import type { AdminFeatureFlagItem, AdminSystemSettingItem } from '../types/admin.types';

export function AdminSettingsPage({ locale }: { locale: Locale }) {
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const actions = useAdminActions({
    initialSettings: admin.settings as AdminSystemSettingItem[],
    initialFeatureFlags: admin.flags as AdminFeatureFlagItem[],
    onUpdateFeatureFlag: admin.onUpdateFeatureFlag,
  });

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'প্ল্যাটফর্ম সেটিংস' : 'Settings'}>
      {admin.loading && !admin.flags.length && !admin.settings.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 py-6" data-testid="admin-settings-page">
          {actions.actionError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-soft-foreground"
              data-testid="admin-action-error"
            >
              {actions.actionError}
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {locale === 'bn'
                    ? 'প্ল্যাটফর্ম সেটিংস ও ফিচার ফ্ল্যাগ'
                    : 'Platform Settings & Feature Flags'}
                </h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-interactive/15 text-info-soft-foreground border border-info/40">
                  {isSuperAdmin ? 'SUPER ADMIN ACCESS' : 'READ ONLY'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">
                {locale === 'bn'
                  ? 'সিস্টেমের রেফারেন্স সেটিংস, কনফিগারেশন এবং সুপার অ্যাডমিন ক্যানারি ফ্ল্যাগ ব্যবস্থাপনা'
                  : 'Manage operational reference thresholds, commission policies, and canary feature toggles'}
              </p>
            </div>
          </div>

          {/* Feature Flags Section */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ToggleLeft className="w-5 h-5 text-success-soft-foreground" />
              <span>{locale === 'bn' ? 'ক্যানারি ফিচার ফ্ল্যাগ' : 'Canary Feature Flags'}</span>
            </h2>
            <AdminFeatureFlagsTab
              featureFlags={actions.featureFlags}
              isSuperAdmin={isSuperAdmin}
              onToggle={actions.toggleFeatureFlag}
            />
          </div>

          {/* System Reference Settings Section */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-info-soft-foreground" />
              <span>
                {locale === 'bn'
                  ? 'সিস্টেম রেফারেন্স কনফিগারেশন'
                  : 'System Reference Configuration'}
              </span>
            </h2>
            <AdminSettingsTab settings={actions.settings} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
