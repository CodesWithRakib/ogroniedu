'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  MoreVertical,
  Shield,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Key,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Button, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';
import { useAdminActions } from '../../hooks/use-admin-actions';
import { useAdminViewState } from '../../hooks/use-admin-view-state';
import { AdminRolesModal } from '../../components/modals/adminRolesModal';
import { AdminSuspendUserModal } from '../../components/modals/adminSuspendUserModal';
import { AdminImpersonationModal } from '../../components/modals/adminImpersonationModal';
import type { AdminUserItem } from '../../types/admin.types';

export function AdminUsersAdminsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const view = useAdminViewState('users');
  const actions = useAdminActions({
    initialUsers: admin.users,
    onSuspendUser: admin.onSuspendUser,
    onReactivateUser: admin.onReactivateUser,
    onUpdateRoles: admin.onUpdateRoles,
    onStartImpersonation: admin.onStartImpersonation,
  });

  // Filter only administrative and staff accounts (Image 2)
  const staffRoles = ['super_admin', 'admin', 'support_agent', 'compliance_reviewer'];
  const allStaffUsers = admin.users.filter((u) => u.roles.some((r) => staffRoles.includes(r)));

  const filtered = allStaffUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      Boolean(u.email?.toLowerCase().includes(q)) ||
      Boolean(u.phoneE164 && u.phoneE164.includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleConfirmRoles = async () => {
    if (!view.selectedUserForRoles) return;
    await actions.updateRoles(view.selectedUserForRoles.id, view.editingRoles);
    view.closeRolesModal();
  };

  const handleConfirmSuspend = async () => {
    if (!view.selectedUserForSuspend || !view.suspendReason.trim()) return;
    await actions.suspendUser(view.selectedUserForSuspend.id, view.suspendReason.trim());
    view.resetSuspendForm();
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
    <AdminLayout
      locale={locale}
      title={isBn ? 'অ্যাডমিন ও স্টাফ ম্যানেজমেন্ট' : 'Admin Management'}
    >
      <div className="space-y-6 py-6" data-testid="admin-users-admins-page">
        {/* Back Link to Hub (Matching Image 2: "← Back to Users & Staff") */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users', locale)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? '← ইউজার ও স্টাফ হাব-এ ফিরে যান' : '← Back to Users & Staff'}</span>
          </Link>
        </div>

        {/* Page Header (Matching Image 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isBn ? 'অ্যাডমিন ও স্টাফ ম্যানেজমেন্ট' : 'Admin Management'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isBn
                ? 'প্রশাসনিক অ্যাকাউন্ট তৈরি করুন, সুনির্দিষ্ট অনুমতি নির্ধারণ করুন এবং অ্যাক্সেস নিয়ন্ত্রণ করুন।'
                : 'Create administrative accounts, assign granular permissions, and control access.'}
            </p>
          </div>
        </div>

        {actions.actionError && (
          <Alert variant="destructive" data-testid="admin-action-error">
            <AlertDescription role="alert">{actions.actionError}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar + New Admin Button (Image 2 Layout) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={isBn ? 'নাম, ইমেইল অথবা ফোন দিয়ে খুঁজুন...' : 'Search by name, email or phone...'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          {isSuperAdmin && (
            <Button
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
              onClick={() => {
                const dummyId = `new_admin_${Date.now()}`;
                view.requestRoles({
                  id: dummyId,
                  displayName: 'New Admin',
                  email: '',
                  roles: ['admin'],
                  status: 'active',
                  createdAt: new Date().toISOString(),
                } as AdminUserItem);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন অ্যাডমিন' : 'New admin'}</span>
            </Button>
          )}
        </div>

        {/* Table Card (Image 2 Replica) */}
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'নাম' : 'NAME'}</th>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'ইমেইল ও যোগাযোগ' : 'EMAIL'}</th>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'রোল' : 'ROLE'}</th>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'অনুমতি' : 'PERMISSIONS'}</th>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'স্ট্যাটাস' : 'STATUS'}</th>
                  <th scope="col" className="px-5 py-3.5">{isBn ? 'সর্বশেষ লগইন' : 'LAST LOGIN'}</th>
                  <th scope="col" className="px-5 py-3.5 text-right">{isBn ? 'অ্যাকশন' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {admin.loading && !paginated.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      {isBn ? 'কোন অ্যাডমিন কর্মী পাওয়া যায়নি' : 'No administrative staff members found'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((member) => {
                    const isSuper = member.roles.includes('super_admin');
                    const isActive = member.status === 'active';

                    return (
                      <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{member.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">{member.id.slice(0, 10)}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-mono text-foreground text-[11px]">{member.email || '—'}</p>
                          {member.phoneE164 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{member.phoneE164}</p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isSuper
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {isSuper ? 'SUPER ADMIN' : member.roles[0]?.toUpperCase() ?? 'ADMIN'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-foreground">
                            <Key className="w-3 h-3 text-muted-foreground" />
                            <span>{isSuper ? 'System' : `${member.roles.length} roles`}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-success-soft text-success-soft-foreground border border-success/30'
                                : 'bg-destructive-soft text-destructive-soft-foreground border border-destructive/30'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-muted-foreground font-mono text-[11px]">
                          {new Date(member.createdAt).toLocaleDateString(locale)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => view.requestRoles(member)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-surface hover:bg-surface-hover border border-border"
                                  title="Edit permissions"
                                >
                                  {isBn ? 'রোল' : 'Roles'}
                                </button>
                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => view.setSelectedUserForSuspend(member)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-destructive hover:bg-destructive-soft"
                                    title="Suspend access"
                                  >
                                    {isBn ? 'স্থগিত' : 'Suspend'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => actions.reactivateUser(member.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-success hover:bg-success-soft"
                                    title="Reactivate access"
                                  >
                                    {isBn ? 'সক্রিয়' : 'Activate'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Matching Image 2) */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-border/60 text-xs text-muted-foreground gap-3">
            <div className="flex items-center gap-2">
              <span>{isBn ? 'প্রতি পাতায় সারি:' : 'Rows per page:'}</span>
              <span className="font-semibold text-foreground font-mono">{rowsPerPage}</span>
            </div>

            <div>
              <span>
                {isBn
                  ? `মোট ${filtered.length} জনের মধ্যে ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filtered.length)} প্রদর্শিত`
                  : `Showing ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} admins`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded-md border border-border disabled:opacity-40 hover:bg-muted"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-xs font-bold text-foreground">{page}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded-md border border-border disabled:opacity-40 hover:bg-muted"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {view.selectedUserForRoles && (
          <AdminRolesModal
            user={view.selectedUserForRoles}
            editingRoles={view.editingRoles}
            onEditingRolesChange={view.setEditingRoles}
            onClose={view.closeRolesModal}
            onConfirm={handleConfirmRoles}
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
