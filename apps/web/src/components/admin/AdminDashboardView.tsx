'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useAdminActions } from '@/features/admin/hooks/use-admin-actions';
import { AdminMetricsGrid } from '@/features/admin/components/admin-metrics-grid';
import { AdminTabsBar } from '@/features/admin/components/admin-tabs-bar';
import { AdminOverviewTab } from '@/features/admin/components/tabs/admin-overview-tab';
import { AdminUsersTab } from '@/features/admin/components/tabs/admin-users-tab';
import { AdminBookingsTab } from '@/features/admin/components/tabs/admin-bookings-tab';
import { AdminReconciliationTab } from '@/features/admin/components/tabs/admin-reconciliation-tab';
import { AdminSettingsTab } from '@/features/admin/components/tabs/admin-settings-tab';
import { AdminFeatureFlagsTab } from '@/features/admin/components/tabs/admin-feature-flags-tab';
import { AdminAuditLogsTab } from '@/features/admin/components/tabs/admin-audit-logs-tab';
import { AdminSupportTab } from '@/features/admin/components/tabs/admin-support-tab';
import { AdminSuspendUserModal } from '@/features/admin/components/modals/admin-suspend-user-modal';
import { AdminRolesModal } from '@/features/admin/components/modals/admin-roles-modal';
import { AdminCancelBookingModal } from '@/features/admin/components/modals/admin-cancel-booking-modal';
import { AdminImpersonationModal } from '@/features/admin/components/modals/admin-impersonation-modal';
import {
  EMPTY_RECONCILIATION,
  type AdminActionHandlers,
} from '@/features/admin/hooks/use-admin-actions';
import { useAdminViewState } from '@/features/admin/hooks/use-admin-view-state';
import type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminFeatureFlagItem,
  AdminReconciliationData,
  AdminSupportTicketItem,
  AdminSystemSettingItem,
  AdminUserItem,
} from '@/features/admin/types/admin.types';

export type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminFeatureFlagItem,
  AdminReconciliationData,
  AdminSupportTicketItem,
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
  initialTickets?: AdminSupportTicketItem[];
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
  initialTickets = [],
  isLoading = false,
  queryError = null,
  onSuspendUser,
  onReactivateUser,
  onUpdateRoles,
  onCancelBooking,
  onStartImpersonation,
  onUpdateSetting,
  onUpdateFeatureFlag,
  onUpdateTicketStatus,
}: AdminDashboardProps) {
  const t = useTranslations('admin');

  // Local UI state (active tab, modal selection, transient form values).
  const view = useAdminViewState();

  const actions = useAdminActions({
    initialUsers,
    initialBookings,
    initialSettings,
    initialFeatureFlags,
    initialReconciliation,
    initialAuditLogs,
    initialTickets,
    onSuspendUser,
    onReactivateUser,
    onUpdateRoles,
    onCancelBooking,
    onStartImpersonation,
    onUpdateSetting,
    onUpdateFeatureFlag,
    onUpdateTicketStatus,
  });

  const isSuperAdmin = currentUser.roles.includes('super_admin');

  const handleConfirmSuspend = async () => {
    if (!view.selectedUserForSuspend || !view.suspendReason.trim()) return;
    await actions.suspendUser(view.selectedUserForSuspend.id, view.suspendReason.trim());
    view.resetSuspendForm();
  };

  const handleConfirmRoles = async () => {
    if (!view.selectedUserForRoles) return;
    await actions.updateRoles(view.selectedUserForRoles.id, view.editingRoles);
    view.closeRolesModal();
  };

  const handleConfirmCancelBooking = async () => {
    if (!view.selectedBookingForCancel || !view.cancelReason.trim()) return;
    await actions.cancelBooking(
      view.selectedBookingForCancel.id,
      view.cancelReason.trim(),
      view.refundChecked,
    );
    view.resetCancelForm();
  };

  const handleConfirmImpersonation = async () => {
    if (!view.selectedUserForImpersonate || !view.impersonateReason.trim()) return;
    await actions.startImpersonation(
      view.selectedUserForImpersonate.id,
      view.selectedUserForImpersonate.displayName,
      view.impersonateReason.trim(),
      view.impersonateMinutes,
    );
    view.resetImpersonateForm();
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
      <AdminTabsBar activeTab={view.activeTab} onSelect={view.setActiveTab} />

      {view.activeTab === 'overview' && <AdminOverviewTab reconciliation={actions.reconciliation} />}
      {view.activeTab === 'users' && (
        <AdminUsersTab
          users={actions.users}
          isSuperAdmin={isSuperAdmin}
          onRequestSuspend={view.setSelectedUserForSuspend}
          onRequestRoles={view.requestRoles}
          onRequestImpersonate={view.setSelectedUserForImpersonate}
          onReactivate={actions.reactivateUser}
        />
      )}
      {view.activeTab === 'bookings' && (
        <AdminBookingsTab
          bookings={actions.bookings}
          onRequestCancel={view.setSelectedBookingForCancel}
        />
      )}
      {view.activeTab === 'reconciliation' && (
        <AdminReconciliationTab
          reconciliation={actions.reconciliation}
          onRunAudit={actions.rerunReconciliation}
        />
      )}
      {view.activeTab === 'settings' && <AdminSettingsTab settings={actions.settings} />}
      {view.activeTab === 'featureFlags' && (
        <AdminFeatureFlagsTab
          featureFlags={actions.featureFlags}
          isSuperAdmin={isSuperAdmin}
          onToggle={actions.toggleFeatureFlag}
        />
      )}
      {view.activeTab === 'auditLogs' && <AdminAuditLogsTab auditLogs={actions.auditLogs} />}
      {view.activeTab === 'support' && (
        <AdminSupportTab
          tickets={actions.tickets}
          onUpdateStatus={actions.updateTicketStatus}
        />
      )}

      {view.selectedUserForSuspend && (
        <AdminSuspendUserModal
          user={view.selectedUserForSuspend}
          reason={view.suspendReason}
          onReasonChange={view.setSuspendReason}
          onClose={view.resetSuspendForm}
          onConfirm={handleConfirmSuspend}
        />
      )}
      {view.selectedUserForRoles && (
        <AdminRolesModal
          user={view.selectedUserForRoles}
          editingRoles={view.editingRoles}
          onEditingRolesChange={view.setEditingRoles}
          onClose={view.closeRolesModal}
          onConfirm={handleConfirmRoles}
        />
      )}
      {view.selectedBookingForCancel && (
        <AdminCancelBookingModal
          booking={view.selectedBookingForCancel}
          reason={view.cancelReason}
          refundEscrow={view.refundChecked}
          onReasonChange={view.setCancelReason}
          onRefundChange={view.setRefundChecked}
          onClose={view.resetCancelForm}
          onConfirm={handleConfirmCancelBooking}
        />
      )}
      {view.selectedUserForImpersonate && (
        <AdminImpersonationModal
          user={view.selectedUserForImpersonate}
          reason={view.impersonateReason}
          minutes={view.impersonateMinutes}
          onReasonChange={view.setImpersonateReason}
          onMinutesChange={view.setImpersonateMinutes}
          onClose={view.resetImpersonateForm}
          onConfirm={handleConfirmImpersonation}
        />
      )}
    </div>
  );
}
