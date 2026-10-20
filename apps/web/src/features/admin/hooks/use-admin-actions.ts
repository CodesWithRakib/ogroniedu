'use client';

import React from 'react';
import type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminFeatureFlagItem,
  AdminReconciliationData,
  AdminSupportTicketItem,
  AdminSystemSettingItem,
  AdminUserItem,
} from '../types/admin.types';

/** Empty reconciliation so the view never fabricates ledger values. */
export const EMPTY_RECONCILIATION: AdminReconciliationData = {
  isBalanced: true,
  totalDebits: '0',
  totalCredits: '0',
  discrepancy: '0',
  status: 'reconciled',
  accounts: [],
};

export interface AdminActionHandlers {
  onSuspendUser?: (userId: string, reason: string) => Promise<void>;
  onReactivateUser?: (userId: string) => Promise<void>;
  onUpdateRoles?: (userId: string, roles: string[]) => Promise<void>;
  onCancelBooking?: (bookingId: string, reason: string, refundStudent: boolean) => Promise<void>;
  onStartImpersonation?: (
    targetUserId: string,
    reason: string,
    durationMinutes: number,
  ) => Promise<void>;
  onUpdateSetting?: (key: string, value: Record<string, unknown>) => Promise<void>;
  onUpdateFeatureFlag?: (key: string, enabled: boolean) => Promise<void>;
  onUpdateTicketStatus?: (
    id: string,
    status: AdminSupportTicketItem['status'],
    resolutionNotes?: string,
  ) => Promise<void>;
  onRerunReconciliation?: () => Promise<void>;
}

export interface ActiveImpersonation {
  targetName: string;
  targetId: string;
  expiresIn: number;
}

export interface UseAdminActionsParams extends AdminActionHandlers {
  initialUsers?: AdminUserItem[];
  initialBookings?: AdminBookingItem[];
  initialSettings?: AdminSystemSettingItem[];
  initialFeatureFlags?: AdminFeatureFlagItem[];
  initialReconciliation?: AdminReconciliationData;
  initialAuditLogs?: AdminAuditLogItem[];
  initialTickets?: AdminSupportTicketItem[];
}

export interface UseAdminActionsResult {
  users: AdminUserItem[];
  bookings: AdminBookingItem[];
  settings: AdminSystemSettingItem[];
  featureFlags: AdminFeatureFlagItem[];
  reconciliation: AdminReconciliationData;
  auditLogs: AdminAuditLogItem[];
  tickets: AdminSupportTicketItem[];
  actionError: string | null;
  activeImpersonation: ActiveImpersonation | null;
  suspendUser: (userId: string, reason: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  updateRoles: (userId: string, roles: string[]) => Promise<void>;
  cancelBooking: (bookingId: string, reason: string, refundStudent: boolean) => Promise<void>;
  startImpersonation: (
    targetUserId: string,
    targetName: string,
    reason: string,
    durationMinutes: number,
  ) => Promise<void>;
  toggleFeatureFlag: (key: string, enabled: boolean) => Promise<void>;
  updateTicketStatus: (
    id: string,
    status: AdminSupportTicketItem['status'],
    resolutionNotes?: string,
  ) => Promise<void>;
  rerunReconciliation: () => Promise<void>;
  terminateImpersonation: () => void;
}

/**
 * Stable empty collections used as destructuring defaults. A fresh `[]` default
 * would be a new identity on every render, and the sync effects below are keyed
 * on these arrays — that would re-run setState forever (React update-depth loop).
 */
const EMPTY_USERS: AdminUserItem[] = [];
const EMPTY_BOOKINGS: AdminBookingItem[] = [];
const EMPTY_SETTINGS: AdminSystemSettingItem[] = [];
const EMPTY_FLAGS: AdminFeatureFlagItem[] = [];
const EMPTY_AUDIT_LOGS: AdminAuditLogItem[] = [];
const EMPTY_TICKETS: AdminSupportTicketItem[] = [];

/**
 * Owns admin operational state, optimistic local updates, and async action
 * error handling so the AdminDashboardView stays a thin orchestration layer.
 * Local state is updated only AFTER the mutation resolves, so the UI never
 * displays a fabricated success.
 */
export function useAdminActions(params: UseAdminActionsParams): UseAdminActionsResult {
  const {
    initialUsers = EMPTY_USERS,
    initialBookings = EMPTY_BOOKINGS,
    initialSettings = EMPTY_SETTINGS,
    initialFeatureFlags = EMPTY_FLAGS,
    initialReconciliation = EMPTY_RECONCILIATION,
    initialAuditLogs = EMPTY_AUDIT_LOGS,
    initialTickets = EMPTY_TICKETS,
  } = params;

  const [users, setUsers] = React.useState<AdminUserItem[]>(initialUsers);
  const [bookings, setBookings] = React.useState<AdminBookingItem[]>(initialBookings);
  const [settings, setSettings] = React.useState<AdminSystemSettingItem[]>(initialSettings);
  const [featureFlags, setFeatureFlags] =
    React.useState<AdminFeatureFlagItem[]>(initialFeatureFlags);
  const [reconciliation, setReconciliation] =
    React.useState<AdminReconciliationData>(initialReconciliation);
  const [auditLogs, setAuditLogs] = React.useState<AdminAuditLogItem[]>(initialAuditLogs);
  const [tickets, setTickets] = React.useState<AdminSupportTicketItem[]>(initialTickets);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [activeImpersonation, setActiveImpersonation] = React.useState<ActiveImpersonation | null>(
    null,
  );

  React.useEffect(() => setUsers(initialUsers), [initialUsers]);
  React.useEffect(() => setBookings(initialBookings), [initialBookings]);
  React.useEffect(() => setSettings(initialSettings), [initialSettings]);
  React.useEffect(() => setFeatureFlags(initialFeatureFlags), [initialFeatureFlags]);
  React.useEffect(() => setReconciliation(initialReconciliation), [initialReconciliation]);
  React.useEffect(() => setAuditLogs(initialAuditLogs), [initialAuditLogs]);
  React.useEffect(() => setTickets(initialTickets), [initialTickets]);

  const runAction = React.useCallback(async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const suspendUser = React.useCallback(
    async (userId: string, reason: string) =>
      runAction(async () => {
        if (!params.onSuspendUser) {
          throw new Error('Suspension is unavailable (missing admin permission).');
        }
        await params.onSuspendUser(userId, reason);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'suspended' } : u)));
      }),
    [params, runAction],
  );

  const reactivateUser = React.useCallback(
    async (userId: string) =>
      runAction(async () => {
        if (!params.onReactivateUser) {
          throw new Error('Reactivation is unavailable (missing admin permission).');
        }
        await params.onReactivateUser(userId);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
      }),
    [params, runAction],
  );

  const updateRoles = React.useCallback(
    async (userId: string, roles: string[]) =>
      runAction(async () => {
        if (!params.onUpdateRoles) {
          throw new Error('Role update is unavailable (super-admin only).');
        }
        await params.onUpdateRoles(userId, roles);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles } : u)));
      }),
    [params, runAction],
  );

  const cancelBooking = React.useCallback(
    async (bookingId: string, reason: string, refundStudent: boolean) =>
      runAction(async () => {
        if (!params.onCancelBooking) {
          throw new Error('Booking cancellation is unavailable (missing admin permission).');
        }
        await params.onCancelBooking(bookingId, reason, refundStudent);
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)),
        );
      }),
    [params, runAction],
  );

  const startImpersonation = React.useCallback(
    async (targetUserId: string, targetName: string, reason: string, durationMinutes: number) =>
      runAction(async () => {
        const cappedDuration = Math.min(durationMinutes, 15);
        if (!params.onStartImpersonation) {
          throw new Error('Impersonation is unavailable (super-admin only).');
        }
        await params.onStartImpersonation(targetUserId, reason, cappedDuration);
        setActiveImpersonation({ targetName, targetId: targetUserId, expiresIn: cappedDuration });
      }),
    [params, runAction],
  );

  const toggleFeatureFlag = React.useCallback(
    async (key: string, enabled: boolean) =>
      runAction(async () => {
        if (!params.onUpdateFeatureFlag) {
          throw new Error('Feature flag update is unavailable (super-admin only).');
        }
        await params.onUpdateFeatureFlag(key, enabled);
        setFeatureFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
      }),
    [params, runAction],
  );

  const updateTicketStatus = React.useCallback(
    async (id: string, status: AdminSupportTicketItem['status'], resolutionNotes?: string) =>
      runAction(async () => {
        if (!params.onUpdateTicketStatus) {
          throw new Error('Ticket triage is unavailable (missing staff permission).');
        }
        await params.onUpdateTicketStatus(id, status, resolutionNotes);
        setTickets((prev) =>
          prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status,
                  resolutionNotes: resolutionNotes ?? row.resolutionNotes,
                }
              : row,
          ),
        );
      }),
    [params, runAction],
  );

  const rerunReconciliation = React.useCallback(
    () =>
      runAction(async () => {
        if (!params.onRerunReconciliation) {
          throw new Error('Reconciliation is unavailable (missing finance permission).');
        }
        await params.onRerunReconciliation();
      }),
    [params, runAction],
  );

  const terminateImpersonation = React.useCallback(() => setActiveImpersonation(null), []);

  return {
    users,
    bookings,
    settings,
    featureFlags,
    reconciliation,
    auditLogs,
    tickets,
    actionError,
    activeImpersonation,
    suspendUser,
    reactivateUser,
    updateRoles,
    cancelBooking,
    startImpersonation,
    toggleFeatureFlag,
    updateTicketStatus,
    rerunReconciliation,
    terminateImpersonation,
  };
}
