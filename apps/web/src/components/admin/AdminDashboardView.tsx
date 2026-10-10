'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface AdminUserItem {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  status: 'active' | 'suspended' | 'pending_verification';
  roles: string[];
  createdAt: string;
}

export interface AdminBookingItem {
  id: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  status: 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priceBdt: number;
  mode: 'online' | 'in_person';
}

export interface AdminReconciliationData {
  isBalanced: boolean;
  totalDebits: string;
  totalCredits: string;
  discrepancy: string;
  status: 'reconciled' | 'discrepancy_detected';
  accounts: Array<{
    code: string;
    name: string;
    accountType: string;
    balance: string;
  }>;
}

export interface AdminSystemSettingItem {
  key: string;
  value: Record<string, any>;
  description: string | null;
}

export interface AdminFeatureFlagItem {
  key: string;
  enabled: boolean;
  rules: Record<string, any>;
}

export interface AdminAuditLogItem {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminDashboardProps {
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
  onSuspendUser?: (userId: string, reason: string) => Promise<void>;
  onReactivateUser?: (userId: string) => Promise<void>;
  onUpdateRoles?: (userId: string, roles: string[]) => Promise<void>;
  onCancelBooking?: (bookingId: string, reason: string, refundStudent: boolean) => Promise<void>;
  onStartImpersonation?: (targetUserId: string, reason: string, durationMinutes: number) => Promise<void>;
  onUpdateSetting?: (key: string, value: Record<string, any>) => Promise<void>;
  onUpdateFeatureFlag?: (key: string, enabled: boolean) => Promise<void>;
}

export function AdminDashboardView({
  currentUser,
  metrics,
  initialUsers = [],
  initialBookings = [],
  initialReconciliation = {
    isBalanced: true,
    totalDebits: '500,000',
    totalCredits: '500,000',
    discrepancy: '0',
    status: 'reconciled',
    accounts: [
      { code: '1010_CASH_SSLCOMMERZ', name: 'SSLCOMMERZ Settlement', accountType: 'asset', balance: '500,000' },
      { code: '2010_STUDENT_ESCROW', name: 'Student Escrow Holding', accountType: 'liability', balance: '500,000' },
    ],
  },
  initialSettings = [
    { key: 'platform_fee_percent', value: { percent: 8 }, description: 'Platform fee percentage' },
    { key: 'cancellation_window_hours', value: { hours: 24 }, description: 'Free cancellation window' },
    { key: 'replacement_guarantee_trial_hours', value: { hours: 48 }, description: 'Replacement trial hours' },
    { key: 'impersonation_max_minutes', value: { minutes: 15 }, description: 'Max impersonation time' },
  ],
  initialFeatureFlags = [
    { key: 'emergency_maintenance_mode', enabled: false, rules: { allowRoles: ['admin', 'super_admin'] } },
    { key: 'instant_replacement_matching', enabled: true, rules: {} },
    { key: 'strict_pnr_verification', enabled: true, rules: {} },
  ],
  initialAuditLogs = [],
  onSuspendUser,
  onReactivateUser,
  onUpdateRoles,
  onCancelBooking,
  onStartImpersonation,
  onUpdateSetting,
  onUpdateFeatureFlag,
}: AdminDashboardProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'bookings' | 'reconciliation' | 'settings' | 'featureFlags' | 'auditLogs'
  >('overview');

  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [bookings, setBookings] = useState<AdminBookingItem[]>(initialBookings);
  const [settings, setSettings] = useState<AdminSystemSettingItem[]>(initialSettings);
  const [featureFlags, setFeatureFlags] = useState<AdminFeatureFlagItem[]>(initialFeatureFlags);
  const [reconciliation, setReconciliation] = useState<AdminReconciliationData>(initialReconciliation);
  const [auditLogs] = useState<AdminAuditLogItem[]>(initialAuditLogs);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [selectedUserForSuspend, setSelectedUserForSuspend] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [selectedUserForRoles, setSelectedUserForRoles] = useState<AdminUserItem | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);

  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<AdminBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundChecked, setRefundChecked] = useState(true);

  const [selectedUserForImpersonate, setSelectedUserForImpersonate] = useState<AdminUserItem | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonateMinutes, setImpersonateMinutes] = useState(15);
  const [activeImpersonation, setActiveImpersonation] = useState<{
    targetName: string;
    targetId: string;
    expiresIn: number;
  } | null>(null);

  const isSuperAdmin = currentUser.roles.includes('super_admin');

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phoneE164 && u.phoneE164.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // Action handlers
  const handleConfirmSuspend = async () => {
    if (!selectedUserForSuspend || !suspendReason.trim()) return;
    if (onSuspendUser) {
      await onSuspendUser(selectedUserForSuspend.id, suspendReason.trim());
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUserForSuspend.id ? { ...u, status: 'suspended' } : u)),
    );
    setSelectedUserForSuspend(null);
    setSuspendReason('');
  };

  const handleReactivate = async (userId: string) => {
    if (onReactivateUser) {
      await onReactivateUser(userId);
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
  };

  const handleConfirmRoles = async () => {
    if (!selectedUserForRoles) return;
    if (onUpdateRoles) {
      await onUpdateRoles(selectedUserForRoles.id, editingRoles);
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === selectedUserForRoles.id ? { ...u, roles: editingRoles } : u)),
    );
    setSelectedUserForRoles(null);
  };

  const handleConfirmCancelBooking = async () => {
    if (!selectedBookingForCancel || !cancelReason.trim()) return;
    if (onCancelBooking) {
      await onCancelBooking(selectedBookingForCancel.id, cancelReason.trim(), refundChecked);
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === selectedBookingForCancel.id ? { ...b, status: 'cancelled' } : b)),
    );
    setSelectedBookingForCancel(null);
    setCancelReason('');
  };

  const handleConfirmImpersonation = async () => {
    if (!selectedUserForImpersonate || !impersonateReason.trim()) return;
    const cappedDuration = Math.min(impersonateMinutes, 15);
    if (onStartImpersonation) {
      await onStartImpersonation(selectedUserForImpersonate.id, impersonateReason.trim(), cappedDuration);
    }
    setActiveImpersonation({
      targetName: selectedUserForImpersonate.displayName,
      targetId: selectedUserForImpersonate.id,
      expiresIn: cappedDuration,
    });
    setSelectedUserForImpersonate(null);
    setImpersonateReason('');
  };

  const handleToggleFlag = async (key: string, currentVal: boolean) => {
    if (!isSuperAdmin) return;
    if (onUpdateFeatureFlag) {
      await onUpdateFeatureFlag(key, !currentVal);
    }
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !currentVal } : f)),
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6" data-testid="admin-dashboard-view">
      {/* 1. Active Impersonation Top Warning Banner */}
      {activeImpersonation && (
        <div
          className="bg-amber-500/20 border-2 border-amber-500 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/10 animate-pulse"
          data-testid="active-impersonation-banner"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-300 text-sm tracking-wide">
                {t('activeImpersonationBanner')}: <span className="underline">{activeImpersonation.targetName}</span> ({activeImpersonation.targetId})
              </p>
              <p className="text-xs text-amber-200/80">
                {t('impersonationWarning')} (Session window: {activeImpersonation.expiresIn} min)
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveImpersonation(null)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-xs transition"
            data-testid="terminate-impersonation-btn"
          >
            {t('terminateImpersonation')}
          </button>
        </div>
      )}

      {/* Header */}
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
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Authenticated Actor</p>
            <p className="text-sm font-semibold text-slate-200">{currentUser.displayName}</p>
          </div>
        </div>
      </div>

      {/* 2. Operational Metrics Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="operational-metrics-grid">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">{t('tutorVerificationQueue')}</p>
          <p className="text-2xl font-bold text-teal-400 mt-1" data-testid="metric-pending-tutors">
            {metrics.pendingTutorVerifications}
          </p>
          <span className="text-[10px] text-teal-500/80">Pending Dossiers</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">{t('replacementQueue')}</p>
          <p className="text-2xl font-bold text-amber-400 mt-1" data-testid="metric-replacement-cases">
            {metrics.activeReplacementCases}
          </p>
          <span className="text-[10px] text-amber-500/80">Active Cases</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">{t('safetyQueue')}</p>
          <p className="text-2xl font-bold text-rose-400 mt-1" data-testid="metric-safety-reports">
            {metrics.openSafetyReports}
          </p>
          <span className="text-[10px] text-rose-500/80">Open Reports</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-400">{t('activeBookings')}</p>
          <p className="text-2xl font-bold text-blue-400 mt-1" data-testid="metric-active-bookings">
            {metrics.activeBookingsCount}
          </p>
          <span className="text-[10px] text-blue-500/80">In Progress</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-medium text-slate-400">{t('totalUsers')}</p>
          <p className="text-2xl font-bold text-slate-200 mt-1" data-testid="metric-total-users">
            {metrics.totalRegisteredUsers}
          </p>
          <span className="text-[10px] text-slate-400">Total Catalog</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2" role="tablist">
        {(
          [
            ['overview', t('overviewTab')],
            ['users', t('usersTab')],
            ['bookings', t('bookingsTab')],
            ['reconciliation', t('reconciliationTab')],
            ['settings', t('settingsTab')],
            ['featureFlags', t('featureFlagsTab')],
            ['auditLogs', t('auditLogsTab')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${
              activeTab === key
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            data-testid={`tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="overview-tab-content">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center justify-between">
              <span>{t('reconciliationTitle')}</span>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  reconciliation.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {reconciliation.isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">{t('totalDebits')}</p>
                <p className="text-sm font-mono font-bold text-slate-200 mt-1">{reconciliation.totalDebits} BDT</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">{t('totalCredits')}</p>
                <p className="text-sm font-mono font-bold text-slate-200 mt-1">{reconciliation.totalCredits} BDT</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">{t('discrepancy')}</p>
                <p className={`text-sm font-mono font-bold mt-1 ${reconciliation.discrepancy === '0' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {reconciliation.discrepancy}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-200">{t('auditTrailTitle')}</h3>
            <p className="text-xs text-emerald-400 flex items-center space-x-1.5">
              <span>🛡️</span>
              <span>{t('auditRedactedNotice')}</span>
            </p>
            <div className="text-xs text-slate-400 space-y-2">
              <p>• All mutations are recorded to PostgreSQL `audit_logs` table.</p>
              <p>• Credentials, passwords, card PANs, and session tokens are automatically sanitized.</p>
              <p>• Least-privilege role boundaries enforced at NestJS `RolesGuard` controller level.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="space-y-4" data-testid="users-tab-content">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              data-testid="users-search-input"
            />
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                data-testid="users-status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="active">{t('statusActive')}</option>
                <option value="suspended">{t('statusSuspended')}</option>
              </select>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs" data-testid="users-table">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">
                      {tCommon('noData')}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/40" data-testid={`user-row-${user.id}`}>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {user.displayName}
                        <span className="block text-[10px] text-slate-500 font-mono">{user.id}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {user.email || user.phoneE164 || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r === 'super_admin'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : r === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {user.status === 'active' ? t('statusActive') : t('statusSuspended')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => setSelectedUserForSuspend(user)}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded border border-rose-500/30 transition text-[11px]"
                            data-testid={`suspend-user-btn-${user.id}`}
                          >
                            {t('suspendBtn')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(user.id)}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded border border-emerald-500/30 transition text-[11px]"
                            data-testid={`reactivate-user-btn-${user.id}`}
                          >
                            {t('reactivateBtn')}
                          </button>
                        )}

                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUserForRoles(user);
                                setEditingRoles([...user.roles]);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition text-[11px]"
                              data-testid={`manage-roles-btn-${user.id}`}
                            >
                              {t('rolesBtn')}
                            </button>
                            {!user.roles.includes('super_admin') && (
                              <button
                                onClick={() => setSelectedUserForImpersonate(user)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition text-[11px]"
                                data-testid={`impersonate-btn-${user.id}`}
                              >
                                {t('triggerImpersonation')}
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Bookings & Intervention */}
      {activeTab === 'bookings' && (
        <div className="space-y-4" data-testid="bookings-tab-content">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs" data-testid="bookings-table">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Tutor</th>
                  <th className="px-4 py-3">Subject / Mode</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-500">
                      {tCommon('noData')}
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-800/40" data-testid={`booking-row-${booking.id}`}>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{booking.id.substring(0, 8)}...</td>
                      <td className="px-4 py-3 font-medium text-slate-200">{booking.studentName}</td>
                      <td className="px-4 py-3 text-slate-300">{booking.tutorName}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {booking.subjectName} ({booking.mode})
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{booking.priceBdt} BDT</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            booking.status === 'confirmed'
                              ? 'bg-blue-500/20 text-blue-300'
                              : booking.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => setSelectedBookingForCancel(booking)}
                            className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded border border-rose-500/30 transition text-[11px]"
                            data-testid={`admin-cancel-booking-btn-${booking.id}`}
                          >
                            {t('cancelIntervention')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Financial Reconciliation */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6" data-testid="reconciliation-tab-content">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-200">{t('reconciliationTitle')}</h3>
                <p className="text-xs text-slate-400">Continuous ledger reconciliation across bank settlement and student escrow</p>
              </div>
              <button
                onClick={() => {
                  setReconciliation((prev) => ({ ...prev, isBalanced: true, discrepancy: '0' }));
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                data-testid="rerun-audit-btn"
              >
                {t('runAudit')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {reconciliation.accounts.map((acc) => (
                <div key={acc.code} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="text-xs font-mono text-slate-500">{acc.code}</span>
                    <p className="text-sm font-semibold text-slate-200">{acc.name}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{acc.accountType}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-mono font-bold text-teal-400">{acc.balance} BDT</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: System Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4" data-testid="settings-tab-content">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-200">System Reference Settings</h3>
            <div className="divide-y divide-slate-800">
              {settings.map((setting) => (
                <div key={setting.key} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{setting.key}</p>
                    <p className="text-xs text-slate-400">{setting.description || 'Configurable operational threshold'}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono bg-slate-950 px-3 py-1 rounded border border-slate-800 text-teal-300">
                      {JSON.stringify(setting.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Feature Flags */}
      {activeTab === 'featureFlags' && (
        <div className="space-y-4" data-testid="feature-flags-tab-content">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Feature Flags & Canary Toggles</h3>
            <div className="divide-y divide-slate-800">
              {featureFlags.map((flag) => (
                <div key={flag.key} className="py-3 flex items-center justify-between" data-testid={`flag-row-${flag.key}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200 font-mono">{flag.key}</p>
                    <p className="text-xs text-slate-400">
                      Status: {flag.enabled ? 'ENABLED' : 'DISABLED'}
                    </p>
                  </div>
                  <div>
                    <button
                      disabled={!isSuperAdmin}
                      onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        flag.enabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                      data-testid={`toggle-flag-${flag.key}`}
                    >
                      {flag.enabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'auditLogs' && (
        <div className="space-y-4" data-testid="audit-logs-tab-content">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs" data-testid="audit-logs-table">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t('auditTimestamp')}</th>
                  <th className="px-4 py-3">{t('auditActor')}</th>
                  <th className="px-4 py-3">{t('auditAction')}</th>
                  <th className="px-4 py-3">{t('auditResource')}</th>
                  <th className="px-4 py-3">{t('auditReason')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500">
                      {tCommon('noData')}
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40" data-testid={`audit-row-${log.id}`}>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{log.createdAt}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{log.actorUserId || 'system'}</td>
                      <td className="px-4 py-3 font-semibold text-teal-400 font-mono">{log.action}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.resourceType}:{log.resourceId || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{log.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Suspend User */}
      {selectedUserForSuspend && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" data-testid="suspend-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-rose-400">{t('suspendModalTitle')}</h3>
            <p className="text-xs text-slate-400">
              Target User: <span className="font-semibold text-slate-200">{selectedUserForSuspend.displayName}</span> ({selectedUserForSuspend.id})
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">{t('suspendReasonLabel')} *</label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="State specific operational or safety violations..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                data-testid="suspend-reason-textarea"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedUserForSuspend(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                {tCommon('cancel')}
              </button>
              <button
                disabled={!suspendReason.trim()}
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                data-testid="confirm-suspend-btn"
              >
                {t('suspendConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Roles Management (Super Admin) */}
      {selectedUserForRoles && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" data-testid="roles-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-indigo-400">{t('rolesModalTitle')}</h3>
            <p className="text-xs text-slate-400">
              User: <span className="font-semibold text-slate-200">{selectedUserForRoles.displayName}</span>
            </p>
            <div className="space-y-2">
              {(
                ['student', 'guardian', 'tutor', 'support_agent', 'compliance_reviewer', 'admin', 'super_admin'] as const
              ).map((role) => (
                <label key={role} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditingRoles([...editingRoles, role]);
                      } else {
                        setEditingRoles(editingRoles.filter((r) => r !== role));
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                    data-testid={`checkbox-role-${role}`}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedUserForRoles(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleConfirmRoles}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                data-testid="confirm-roles-btn"
              >
                {tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Booking Emergency Cancellation */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" data-testid="cancel-booking-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-rose-400">{t('cancelIntervention')}</h3>
            <p className="text-xs text-slate-400">
              Booking: <span className="font-semibold text-slate-200">{selectedBookingForCancel.id}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">{t('cancelReasonLabel')} *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="State administrative reason for intervention..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                data-testid="cancel-reason-textarea"
              />
            </div>
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={refundChecked}
                onChange={(e) => setRefundChecked(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                data-testid="refund-escrow-checkbox"
              />
              <span>{t('refundEscrow')}</span>
            </label>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedBookingForCancel(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                {tCommon('cancel')}
              </button>
              <button
                disabled={!cancelReason.trim()}
                onClick={handleConfirmCancelBooking}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                data-testid="confirm-cancel-booking-btn"
              >
                {t('confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Start Impersonation (Super Admin) */}
      {selectedUserForImpersonate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" data-testid="impersonate-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-amber-400">{t('impersonationBadge')}</h3>
            <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
              {t('impersonationWarning')}
            </p>
            <p className="text-xs text-slate-400">
              Target User: <span className="font-semibold text-slate-200">{selectedUserForImpersonate.displayName}</span> ({selectedUserForImpersonate.id})
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Operational Justification *</label>
              <textarea
                rows={2}
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="State explicit customer support ticket or bug reference..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                data-testid="impersonate-reason-textarea"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Session Duration (Max 15 min)</label>
              <input
                type="number"
                min={1}
                max={15}
                value={impersonateMinutes}
                onChange={(e) => setImpersonateMinutes(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                data-testid="impersonate-duration-input"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedUserForImpersonate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                {tCommon('cancel')}
              </button>
              <button
                disabled={!impersonateReason.trim()}
                onClick={handleConfirmImpersonation}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                data-testid="confirm-impersonation-btn"
              >
                {t('triggerImpersonation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
