'use client';

import React from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import {
  AdminDashboardView,
  type AdminReconciliationData,
  type AdminSystemSettingItem,
  type AdminFeatureFlagItem,
} from '@/components/admin/AdminDashboardView';
import { LoadingSpinner, Card, CardContent } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';

/** Admin console entry: layout + guard + dashboard view composed from the feature hook. */
export function AdminPage({ locale }: { locale: Locale }) {
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'অ্যাডমিন' : 'Admin'}>
      {admin.loading && !admin.users.length ? (
        <div className="py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="py-6">
          <AdminDashboardView
            currentUser={{
              id: user?.id ?? '',
              displayName: user?.displayName ?? '',
              roles: (user?.roles ?? []) as string[],
            }}
            metrics={admin.metrics}
            initialUsers={admin.users}
            initialBookings={admin.bookings}
            initialReconciliation={
              (admin.reconciliation as AdminReconciliationData | undefined) ?? undefined
            }
            initialSettings={(admin.settings as AdminSystemSettingItem[] | undefined) ?? []}
            initialFeatureFlags={(admin.flags as AdminFeatureFlagItem[] | undefined) ?? []}
            initialAuditLogs={admin.logs}
            initialTickets={admin.tickets}
            isLoading={admin.loading}
            queryError={admin.queryError}
            onSuspendUser={admin.onSuspendUser}
            onReactivateUser={admin.onReactivateUser}
            onUpdateRoles={admin.onUpdateRoles}
            onCancelBooking={admin.onCancelBooking}
            onStartImpersonation={admin.onStartImpersonation}
            onUpdateFeatureFlag={admin.onUpdateFeatureFlag}
            onUpdateTicketStatus={admin.onUpdateTicketStatus}
          />
          {admin.secondaryError && (
            <Card className="mx-6 mb-6">
              <CardContent className="py-4 text-xs text-slate-500">
                {locale === 'bn'
                  ? 'কিছু প্রশাসনিক তথ্য লোড করা যায়নি; পুনরায় চেষ্টা করুন।'
                  : 'Some admin data failed to load; retry.'}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
