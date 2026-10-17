'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, UserCheck, ShieldAlert } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Alert, AlertDescription, Button } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';
import { useAdminActions } from '../../hooks/use-admin-actions';
import { useAdminViewState } from '../../hooks/use-admin-view-state';
import { AdminUsersTab } from '../../components/tabs/adminUsersTab';
import { AdminSuspendUserModal } from '../../components/modals/adminSuspendUserModal';
import { AdminRolesModal } from '../../components/modals/adminRolesModal';
import { AdminImpersonationModal } from '../../components/modals/adminImpersonationModal';

export function AdminUsersDirectoryPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
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
    u.roles.some((r) =>
      ['super_admin', 'admin', 'support_agent', 'compliance_reviewer'].includes(r),
    ),
  ).length;

  return (
    <AdminLayout locale={locale} title={isBn ? 'সকল নিবন্ধিত ইউজার' : 'All Registered Users'}>
      <div className="space-y-6 py-6" data-testid="admin-users-directory-page">
        {/* Back Link to Hub (Image 2 Pattern) */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← ইউজার ও স্টাফ হাব-এ ফিরে যান' : '← Back to Users & Staff'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'সকল নিবন্ধিত ইউজার ডিরেক্টরি' : 'All Registered Users'}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-info-soft text-info-soft-foreground border border-info/30">
                {totalUsers} {isBn ? 'অ্যাকাউন্ট' : 'Accounts'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isBn
                ? 'শিক্ষার্থী, শিক্ষক, অভিভাবক ও অ্যাডমিন কর্মীদের পূর্ণাঙ্গ তথ্য, ফিল্টারিং ও রোল নিয়ন্ত্রণ।'
                : 'Browse, search, and manage all accounts across students, tutors, guardians, and platform staff.'}
            </p>
          </div>
        </div>

        {actions.actionError && (
          <Alert variant="destructive" data-testid="admin-action-error">
            <AlertDescription role="alert">{actions.actionError}</AlertDescription>
          </Alert>
        )}

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isBn ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Accounts'}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-mono">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success-soft border border-success/30 flex items-center justify-center text-success-soft-foreground">
              <UserCheck className="w-5 h-5 text-success" />
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isBn ? 'স্থগিত অ্যাকাউন্ট' : 'Suspended Accounts'}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-mono">{suspendedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-destructive-soft border border-destructive/30 flex items-center justify-center text-destructive-soft-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isBn ? 'স্টাফ ও অপারেটর' : 'Staff & Operators'}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1 font-mono">{staffCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-info-soft border border-info/30 flex items-center justify-center text-info-soft-foreground">
              <Users className="w-5 h-5 text-info" />
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
    </AdminLayout>
  );
}
