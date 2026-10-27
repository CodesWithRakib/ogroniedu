'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ToggleLeft, ShieldAlert } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';
import { useAdminActions } from '../../hooks/use-admin-actions';
import { AdminFeatureFlagsTab } from '../../components/tabs/adminFeatureFlagsTab';
import type { AdminFeatureFlagItem } from '../../types/admin.types';

export function AdminSettingsFlagsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const actions = useAdminActions({
    initialFeatureFlags: admin.flags as AdminFeatureFlagItem[],
    onUpdateFeatureFlag: admin.onUpdateFeatureFlag,
  });

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-settings-flags-page">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {isBn ? 'ক্যানারি ফিচার ফ্ল্যাগ' : 'Canary Feature Flags'}
              </h1>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/25">
                {isSuperAdmin ? 'SUPER ADMIN ACCESS' : 'READ ONLY'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isBn
                ? 'রিয়েলটাইম বেটা ফিচার এবং সিস্টেম-ওয়াইড ক্যানারি ফ্ল্যাগ নিয়ন্ত্রণ করুন'
                : 'Safely toggle runtime beta features, system-wide canary releases, and experimental capabilities'}
            </p>
          </div>
        </div>

        {actions.actionError && (
          <Alert variant="destructive" data-testid="admin-action-error">
            <AlertDescription role="alert">{actions.actionError}</AlertDescription>
          </Alert>
        )}

        {admin.loading && !admin.flags.length ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AdminFeatureFlagsTab
              featureFlags={actions.featureFlags}
              isSuperAdmin={isSuperAdmin}
              onToggle={actions.toggleFeatureFlag}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
