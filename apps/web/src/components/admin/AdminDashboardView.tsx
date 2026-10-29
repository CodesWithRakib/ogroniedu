'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription } from '@/components/ui';
import {
  useAdminActions,
  EMPTY_RECONCILIATION,
  useAdminViewState,
  AdminMetricsGrid,
  AdminTabsBar,
  AdminOverviewTab,
  AdminUsersTab,
  AdminBookingsTab,
  AdminReconciliationTab,
  AdminSettingsTab,
  AdminFeatureFlagsTab,
  AdminAuditLogsTab,
  AdminSupportTab,
  AdminVerificationTab,
  AdminSuspendUserModal,
  AdminRolesModal,
  AdminCancelBookingModal,
  AdminImpersonationModal,
  type AdminActionHandlers,
  type AdminAuditLogItem,
  type AdminBookingItem,
  type AdminFeatureFlagItem,
  type AdminReconciliationData,
  type AdminSupportTicketItem,
  type AdminSystemSettingItem,
  type AdminUserItem,
  type PendingTutorItem,
} from '@/features/admin';
import type { TutorReviewDecision } from '@/store/services/admin-api';

/**
 * Stable empty collections for destructuring defaults. Fresh `[]` literals in
 * the parameter list get a new identity every render; because these values feed
 * `useAdminActions` sync effects (keyed on the arrays), that would re-run
 * setState forever and surface as React "Maximum update depth exceeded".
 */
const EMPTY_USERS: AdminUserItem[] = [];
const EMPTY_BOOKINGS: AdminBookingItem[] = [];
const EMPTY_SETTINGS: AdminSystemSettingItem[] = [];
const EMPTY_FLAGS: AdminFeatureFlagItem[] = [];
const EMPTY_AUDIT_LOGS: AdminAuditLogItem[] = [];
const EMPTY_TICKETS: AdminSupportTicketItem[] = [];
const EMPTY_PENDING_TUTORS: PendingTutorItem[] = [];

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
  initialPendingTutors?: PendingTutorItem[];
  pendingTutorsLoading?: boolean;
  pendingTutorsError?: string | null;
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  userStatus: 'all' | 'active' | 'suspended';
  onUserStatusChange: (value: 'all' | 'active' | 'suspended') => void;
  isLoading?: boolean;
  queryError?: string | null;
  initialTab?: import('@/features/admin').AdminTabKey;
}

export function AdminDashboardView({
  currentUser,
  metrics,
  initialUsers = EMPTY_USERS,
  initialBookings = EMPTY_BOOKINGS,
  initialReconciliation = EMPTY_RECONCILIATION,
  initialSettings = EMPTY_SETTINGS,
  initialFeatureFlags = EMPTY_FLAGS,
  initialAuditLogs = EMPTY_AUDIT_LOGS,
  initialTickets = EMPTY_TICKETS,
  initialPendingTutors: _initialPendingTutors = EMPTY_PENDING_TUTORS,
  pendingTutorsLoading: _pendingTutorsLoading = false,
  pendingTutorsError: _pendingTutorsError = null,
  userSearch = '',
  onUserSearchChange,
  userStatus = 'all',
  onUserStatusChange,
  isLoading = false,
  queryError = null,
  initialTab = 'overview',
  onSuspendUser,
  onReactivateUser,
  onUpdateRoles,
  onCancelBooking,
  onStartImpersonation,
  onUpdateSetting,
  onUpdateFeatureFlag,
  onUpdateTicketStatus,
  onReviewTutor: _onReviewTutor,
  onRefetchPendingTutors: _onRefetchPendingTutors,
}: AdminDashboardProps & {
  initialTab?: import('@/features/admin').AdminTabKey;
  onReviewTutor: (input: {
    tutorId: string;
    decision: TutorReviewDecision;
    reasonCode: string;
    internalNotes?: string;
  }) => Promise<void>;
  onRefetchPendingTutors: () => void;
}) {
  const t = useTranslations('admin');

  // Local UI state (active tab, modal selection, transient form values).
  const view = useAdminViewState(initialTab);

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
      className="min-h-screen bg-surface-muted text-foreground p-6 flex flex-col gap-6"
      data-testid="admin-dashboard-view"
    >
      {actions.actionError && (
        <Alert variant="destructive" data-testid="admin-action-error">
          <AlertDescription role="alert">{actions.actionError}</AlertDescription>
        </Alert>
      )}
      {queryError && (
        <Alert variant="destructive" data-testid="admin-query-error">
          <AlertDescription role="alert">{queryError}</AlertDescription>
        </Alert>
      )}
      {isLoading && (
        <div
          role="status"
          className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs"
          data-testid="admin-loading"
        >
          Loading…
        </div>
      )}
      {actions.activeImpersonation && (
        <div
          className="bg-warning/10 border border-warning/40 rounded-xl p-4 flex items-center justify-between animate-pulse"
          data-testid="active-impersonation-banner"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-warning  text-sm tracking-wide">
                {t('activeImpersonationBanner')}:{' '}
                <span className="underline">{actions.activeImpersonation.targetName}</span> (
                {actions.activeImpersonation.targetId})
              </p>
              <p className="text-xs text-warning/80 ">
                {t('impersonationWarning')} (Session window: {actions.activeImpersonation.expiresIn}{' '}
                min)
              </p>
            </div>
          </div>
          <button
            onClick={actions.terminateImpersonation}
            className="px-4 py-2 bg-warning hover:bg-warning/90 text-white rounded-xl font-medium text-xs shadow-xs transition"
            data-testid="terminate-impersonation-btn"
          >
            {t('terminateImpersonation')}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t('title')}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/25">
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Authenticated Actor</p>
          <p className="text-sm font-semibold text-foreground">{currentUser.displayName}</p>
        </div>
      </div>

      <AdminMetricsGrid metrics={metrics} />
      <AdminTabsBar activeTab={view.activeTab} onSelect={view.setActiveTab} />

      {view.activeTab === 'overview' && (
        <AdminOverviewTab reconciliation={actions.reconciliation} />
      )}
      {view.activeTab === 'verification' && <AdminVerificationTab />}
      {view.activeTab === 'users' && (
        <AdminUsersTab
          users={actions.users}
          isSuperAdmin={isSuperAdmin}
          onRequestSuspend={view.setSelectedUserForSuspend}
          onRequestRoles={view.requestRoles}
          onRequestImpersonate={view.setSelectedUserForImpersonate}
          onReactivate={actions.reactivateUser}
          searchQuery={userSearch}
          onSearchChange={onUserSearchChange}
          statusFilter={userStatus}
          onStatusFilterChange={onUserStatusChange}
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
        <AdminSupportTab tickets={actions.tickets} onUpdateStatus={actions.updateTicketStatus} />
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
