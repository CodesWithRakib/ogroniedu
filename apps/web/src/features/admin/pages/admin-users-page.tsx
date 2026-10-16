'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserCheck, ShieldAlert, Search } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { useAdminActions } from '../hooks/use-admin-actions';
import { useAdminViewState } from '../hooks/use-admin-view-state';
import { AdminUsersTab } from '../components/tabs/adminUsersTab';
import { AdminSuspendUserModal } from '../components/modals/adminSuspendUserModal';
import { AdminRolesModal } from '../components/modals/adminRolesModal';
import { AdminImpersonationModal } from '../components/modals/adminImpersonationModal';

export function AdminUsersPage({ locale }: { locale: Locale }) {
  const t = useTranslations('admin');
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const view = useAdminViewState('users');
  const actions = useAdminActions({
    initialUsers: admin.users,
    onSuspendUser: admin.onSuspendUser,
    onReactivateUser: admin.onReactivateUser,
    onUpdateRoles: admin.onUpdateRoles,
    onStartImpersonation: admin.onStartImpersonation,
  });

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

  const totalUsers = admin.users.length;
  const activeCount = admin.users.filter((u) => u.status === 'active').length;
  const suspendedCount = admin.users.filter((u) => u.status === 'suspended').length;
  const staffCount = admin.users.filter((u) =>
    u.roles.some((r) => ['super_admin', 'admin', 'support_agent', 'compliance_reviewer'].includes(r)),
  ).length;

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'ইউজার ম্যানেজার' : 'User Manager'}>
      {admin.loading && !admin.users.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 py-6" data-testid="admin-users-page">
          {actions.actionError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300"
              data-testid="admin-action-error"
            >
              {actions.actionError}
            </div>
          )}

          {actions.activeImpersonation && (
            <div
              className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/10 animate-pulse"
              data-testid="active-impersonation-banner"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-amber-600 dark:text-amber-400 text-sm tracking-wide">
                    {t('activeImpersonationBanner')}:{' '}
                    <span className="underline">{actions.activeImpersonation.targetName}</span> (
                    {actions.activeImpersonation.targetId})
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-300/80">
                    {t('impersonationWarning')} (Session window: {actions.activeImpersonation.expiresIn}{' '}
                    min)
                  </p>
                </div>
              </div>
              <button
                onClick={actions.terminateImpersonation}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium text-xs shadow-xs transition"
                data-testid="terminate-impersonation-btn"
              >
                {t('terminateImpersonation')}
              </button>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {locale === 'bn' ? 'ব্যবহারকারী ও রোল ব্যবস্থাপনা' : 'User & Access Management'}
                </h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {totalUsers} {locale === 'bn' ? 'অ্যাকাউন্ট' : 'Accounts'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">
                {locale === 'bn'
                  ? 'সকল নিবন্ধিত শিক্ষার্থী, শিক্ষক, অভিভাবক ও অ্যাডমিন কর্মীদের তথ্য এবং রোল নিয়ন্ত্রণ'
                  : 'Manage registered student, tutor, guardian, and staff access roles'}
              </p>
            </div>
          </div>

          {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Accounts'}
                </p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{activeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'স্থগিত অ্যাকাউন্ট' : 'Suspended Accounts'}
                </p>
                <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{suspendedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'স্টাফ ও অপারেটর' : 'Staff & Operators'}
                </p>
                <p className="text-2xl font-black text-cyan-400 mt-1 font-mono">{staffCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Users Table Card */}
          <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4">
            <AdminUsersTab
              users={actions.users}
              isSuperAdmin={isSuperAdmin}
              onRequestSuspend={view.setSelectedUserForSuspend}
              onRequestRoles={view.requestRoles}
              onRequestImpersonate={view.setSelectedUserForImpersonate}
              onReactivate={actions.reactivateUser}
              searchQuery={admin.userSearch}
              onSearchChange={admin.setUserSearch}
              statusFilter={admin.userStatus}
              onStatusFilterChange={admin.setUserStatus}
            />
          </div>

          {/* Modals */}
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
      )}
    </AdminLayout>
  );
}
