'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useAdminActions } from '@/features/admin/hooks/use-admin-actions';
import { AdminMetricsGrid } from '@/features/admin/components/admin-metrics-grid';
import { AdminTabsBar, type AdminTabKey } from '@/features/admin/components/admin-tabs-bar';
import { AdminOverviewTab } from '@/features/admin/components/tabs/admin-overview-tab';
import { AdminUsersTab } from '@/features/admin/components/tabs/admin-users-tab';
import { AdminBookingsTab } from '@/features/admin/components/tabs/admin-bookings-tab';
import { AdminReconciliationTab } from '@/features/admin/components/tabs/admin-reconciliation-tab';
import { AdminSettingsTab } from '@/features/admin/components/tabs/admin-settings-tab';
import { AdminFeatureFlagsTab } from '@/features/admin/components/tabs/admin-feature-flags-tab';
import { AdminAuditLogsTab } from '@/features/admin/components/tabs/admin-audit-logs-tab';
import { AdminSuspendUserModal } from '@/features/admin/components/modals/admin-suspend-user-modal';
import { AdminRolesModal } from '@/features/admin/components/modals/admin-roles-modal';
import { AdminCancelBookingModal } from '@/features/admin/components/modals/admin-cancel-booking-modal';
import { AdminImpersonationModal } from '@/features/admin/components/modals/admin-impersonation-modal';
import {
  EMPTY_RECONCILIATION,
  type AdminActionHandlers,
} from '@/features/admin/hooks/use-admin-actions';
import type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminFeatureFlagItem,
  AdminReconciliationData,
  AdminSystemSettingItem,
  AdminUserItem,
} from '@/features/admin/types/admin.types';

export type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminFeatureFlagItem,
  AdminReconciliationData,
  AdminSystemSettingItem,
  AdminUserItem,
};

export interface AdminDashboardProps extends AdminActionHandlers {
  currentUser: {
    id: string;
    displayName: string;
    roles: string[];
  };
  metrics: {
    pendingTutorVerifications: number;
    activeReplacementCases: number;
    openSafetyReports: number;
    activeBookingsCount: number;
    totalRegisteredUsers: number;
  };
  initialUsers?: AdminUserItem[];
  initialBookings?: AdminBookingItem[];
  initialReconciliation?: AdminReconciliationData;
  initialSettings?: AdminSystemSettingItem[];
  initialFeatureFlags?: AdminFeatureFlagItem[];
  initialAuditLogs?: AdminAuditLogItem[];
  isLoading?: boolean;
  queryError?: string | null;
}

export function AdminDashboardView({
  currentUser,
  metrics,
  initialUsers = [],
  initialBookings = [],
  initialReconciliation = EMPTY_RECONCILIATION,
  initialSettings = [],
  initialFeatureFlags = [],
  initialAuditLogs = [],
  isLoading = false,
  queryError = null,
  onSuspendUser,
  onReactivateUser,
  onUpdateRoles,
  onCancelBooking,
  onStartImpersonation,
  onUpdateSetting,
  onUpdateFeatureFlag,
}: AdminDashboardProps) {
  const t = useTranslations('admin');

  const [activeTab, setActiveTab] = React.useState<AdminTabKey>('overview');

  // Modal visibility + transient form state (owned by the view, not the data layer).
  const [selectedUserForSuspend, setSelectedUserForSuspend] = React.useState<AdminUserItem | null>(
    null,
  );
  const [suspendReason, setSuspendReason] = React.useState('');
  const [selectedUserForRoles, setSelectedUserForRoles] = React.useState<AdminUserItem | null>(
    null,
  );
  const [editingRoles, setEditingRoles] = React.useState<string[]>([]);
  const [selectedBookingForCancel, setSelectedBookingForCancel] =
    React.useState<AdminBookingItem | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [refundChecked, setRefundChecked] = React.useState(true);
  const [selectedUserForImpersonate, setSelectedUserForImpersonate] =
    React.useState<AdminUserItem | null>(null);
  const [impersonateReason, setImpersonateReason] = React.useState('');
  const [impersonateMinutes, setImpersonateMinutes] = React.useState(15);

  const actions = useAdminActions({
    initialUsers,
    initialBookings,
    initialSettings,
    initialFeatureFlags,
    initialReconciliation,
    initialAuditLogs,
    onSuspendUser,
    onReactivateUser,
    onUpdateRoles,
    onCancelBooking,
    onStartImpersonation,
    onUpdateSetting,
    onUpdateFeatureFlag,
  });

  const isSuperAdmin = currentUser.roles.includes('super_admin');

  const handleConfirmSuspend = async () => {
    if (!selectedUserForSuspend || !suspendReason.trim()) return;
    await actions.suspendUser(selectedUserForSuspend.id, suspendReason.trim());
    setSelectedUserForSuspend(null);
    setSuspendReason('');
  };

  const handleConfirmRoles = async () => {
    if (!selectedUserForRoles) return;
    await actions.updateRoles(selectedUserForRoles.id, editingRoles);
    setSelectedUserForRoles(null);
  };

  const handleConfirmCancelBooking = async () => {
    if (!selectedBookingForCancel || !cancelReason.trim()) return;
    await actions.cancelBooking(selectedBookingForCancel.id, cancelReason.trim(), refundChecked);
    setSelectedBookingForCancel(null);
    setCancelReason('');
  };

  const handleConfirmImpersonation = async () => {
    if (!selectedUserForImpersonate || !impersonateReason.trim()) return;
    await actions.startImpersonation(
      selectedUserForImpersonate.id,
      selectedUserForImpersonate.displayName,
      impersonateReason.trim(),
      impersonateMinutes,
    );
    setSelectedUserForImpersonate(null);
    setImpersonateReason('');
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6"
      data-testid="admin-dashboard-view"
    >
      {actions.actionError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300"
          data-testid="admin-action-error"
        >
          {actions.actionError}
        </div>
      )}
      {queryError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300"
          data-testid="admin-query-error"
        >
          {queryError}
        </div>
      )}
      {isLoading && (
        <div
          role="status"
          className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300"
          data-testid="admin-loading"
        >
          Loading…
        </div>
      )}
      {actions.activeImpersonation && (
        <div
          className="bg-amber-500/20 border-2 border-amber-500 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/10 animate-pulse"
          data-testid="active-impersonation-banner"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-300 text-sm tracking-wide">
                {t('activeImpersonationBanner')}:{' '}
                <span className="underline">{actions.activeImpersonation.targetName}</span> (
                {actions.activeImpersonation.targetId})
              </p>
              <p className="text-xs text-amber-200/80">
                {t('impersonationWarning')} (Session window: {actions.activeImpersonation.expiresIn}{' '}
                min)
              </p>
            </div>
          </div>
          <button
            onClick={actions.terminateImpersonation}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-xs transition"
            data-testid="terminate-impersonation-btn"
          >
            {t('terminateImpersonation')}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Authenticated Actor</p>
          <p className="text-sm font-semibold text-slate-200">{currentUser.displayName}</p>
        </div>
      </div>

      <AdminMetricsGrid metrics={metrics} />
      <AdminTabsBar activeTab={activeTab} onSelect={setActiveTab} />

      {activeTab === 'overview' && <AdminOverviewTab reconciliation={actions.reconciliation} />}
      {activeTab === 'users' && (
        <AdminUsersTab
          users={actions.users}
          isSuperAdmin={isSuperAdmin}
          onRequestSuspend={setSelectedUserForSuspend}
          onRequestRoles={(user) => {
            setSelectedUserForRoles(user);
            setEditingRoles([...user.roles]);
          }}
          onRequestImpersonate={setSelectedUserForImpersonate}
          onReactivate={actions.reactivateUser}
        />
      )}
      {activeTab === 'bookings' && (
        <AdminBookingsTab
          bookings={actions.bookings}
          onRequestCancel={setSelectedBookingForCancel}
        />
      )}
      {activeTab === 'reconciliation' && (
        <AdminReconciliationTab
          reconciliation={actions.reconciliation}
          onRunAudit={actions.rerunReconciliation}
        />
      )}
      {activeTab === 'settings' && <AdminSettingsTab settings={actions.settings} />}
      {activeTab === 'featureFlags' && (
        <AdminFeatureFlagsTab
          featureFlags={actions.featureFlags}
          isSuperAdmin={isSuperAdmin}
          onToggle={actions.toggleFeatureFlag}
        />
      )}
      {activeTab === 'auditLogs' && <AdminAuditLogsTab auditLogs={actions.auditLogs} />}

      {selectedUserForSuspend && (
        <AdminSuspendUserModal
          user={selectedUserForSuspend}
          reason={suspendReason}
          onReasonChange={setSuspendReason}
          onClose={() => setSelectedUserForSuspend(null)}
          onConfirm={handleConfirmSuspend}
        />
      )}
      {selectedUserForRoles && (
        <AdminRolesModal
          user={selectedUserForRoles}
          editingRoles={editingRoles}
          onEditingRolesChange={setEditingRoles}
          onClose={() => setSelectedUserForRoles(null)}
          onConfirm={handleConfirmRoles}
        />
      )}
      {selectedBookingForCancel && (
        <AdminCancelBookingModal
          booking={selectedBookingForCancel}
          reason={cancelReason}
          refundEscrow={refundChecked}
          onReasonChange={setCancelReason}
          onRefundChange={setRefundChecked}
          onClose={() => setSelectedBookingForCancel(null)}
          onConfirm={handleConfirmCancelBooking}
        />
      )}
      {selectedUserForImpersonate && (
        <AdminImpersonationModal
          user={selectedUserForImpersonate}
          reason={impersonateReason}
          minutes={impersonateMinutes}
          onReasonChange={setImpersonateReason}
          onMinutesChange={setImpersonateMinutes}
          onClose={() => setSelectedUserForImpersonate(null)}
          onConfirm={handleConfirmImpersonation}
        />
      )}
    </div>
  );
}
