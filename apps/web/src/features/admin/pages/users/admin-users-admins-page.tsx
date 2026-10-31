'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  Shield,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Key,
  LogOut,
  Trash2,
  Edit2,
  Lock,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Button, Alert, AlertDescription } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import { extractExactErrorMessage } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import {
  useListStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useForceLogoutUserMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
} from '@/store/services/admin-api';

interface StaffItem {
  id: string;
  display_name: string;
  email: string;
  phone_e164: string | null;
  status: 'active' | 'suspended' | 'banned';
  auth_epoch: number;
  roles: string[];
  created_at: string;
  last_login_at: string | null;
}

export function AdminUsersAdminsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const currentUser = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.roles?.includes('super_admin') ?? false;

  const { data: staffResponse, isLoading, refetch } = useListStaffQuery();
  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff, { isLoading: isDeleting }] = useDeleteStaffMutation();
  const [forceLogout, { isLoading: isLoggingOut }] = useForceLogoutUserMutation();
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);

  // Form Fields for Create
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'support_agent' | 'compliance_reviewer'>('admin');

  // Form Fields for Edit
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'support_agent' | 'compliance_reviewer'>('admin');

  // Raw staff from backend is already guaranteed to exclude super_admin!
  const rawStaff: StaffItem[] = (staffResponse?.data as StaffItem[]) || [];
  // Ensure frontend also strictly omits any super_admin account for security
  const staffList = rawStaff.filter((s) => !s.roles?.includes('super_admin'));

  const filtered = staffList.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      Boolean(u.email?.toLowerCase().includes(q)) ||
      Boolean(u.phone_e164 && u.phone_e164.includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createStaff({
        displayName: createName,
        email: createEmail,
        phoneE164: createPhone || undefined,
        password: createPassword,
        role: createRole,
      }).unwrap();

      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePhone('');
      setCreatePassword('');
      setActionSuccess(
        isBn
          ? 'নতুন স্টাফ মেম্বার সফলভাবে তৈরি করা হয়েছে।'
          : 'New staff member provisioned successfully.',
      );
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to create staff member'));
    }
  };

  const openEditModal = (staff: StaffItem) => {
    setSelectedStaff(staff);
    setEditName(staff.display_name);
    setEditPhone(staff.phone_e164 || '');
    setEditRole((staff.roles[0] as any) || 'admin');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionError(null);
    try {
      await updateStaff({
        id: selectedStaff.id,
        displayName: editName,
        phoneE164: editPhone || undefined,
        role: editRole,
      }).unwrap();

      setShowEditModal(false);
      setSelectedStaff(null);
      setActionSuccess(
        isBn ? 'স্টাফ বিবরণ সফলভাবে আপডেট করা হয়েছে।' : 'Staff details updated successfully.',
      );
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to update staff'));
    }
  };

  const handleForceLogout = async (staff: StaffItem) => {
    if (
      !confirm(
        isBn
          ? `আপনি কি নিশ্চিত যে ${staff.display_name}-এর সকল সক্রিয় সেশন অবিলম্বে বন্ধ করতে চান?`
          : `Terminate all active sessions for ${staff.display_name} immediately?`,
      )
    )
      return;

    setActionError(null);
    try {
      await forceLogout(staff.id).unwrap();
      setActionSuccess(
        isBn
          ? `${staff.display_name}-এর সকল লগইন সেশন তাৎক্ষণিকভাবে বাতিল করা হয়েছে (Auth Epoch বৃদ্ধি করা হয়েছে)।`
          : `All active sessions for ${staff.display_name} terminated immediately (Auth epoch incremented).`,
      );
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to terminate session'));
    }
  };

  const handleToggleSuspend = async (staff: StaffItem) => {
    const isCurrentlyActive = staff.status === 'active';
    const confirmMsg = isCurrentlyActive
      ? isBn
        ? `আপনি কি ${staff.display_name}-কে স্থগিত/ব্লক করতে চান? তাৎক্ষণিকভাবে তার সেশন টার্মিনেট হবে এবং লগইন বন্ধ হবে।`
        : `Block / Suspend ${staff.display_name}? Their active sessions will terminate immediately and logins will be blocked.`
      : isBn
        ? `আপনি কি ${staff.display_name}-এর অ্যাকাউন্ট পুনরায় সক্রিয় করতে চান?`
        : `Reactivate account access for ${staff.display_name}?`;

    if (!confirm(confirmMsg)) return;

    setActionError(null);
    try {
      if (isCurrentlyActive) {
        await suspendUser({
          id: staff.id,
          reason: 'Administrative block by platform super admin',
        }).unwrap();
        setActionSuccess(
          isBn
            ? `${staff.display_name}-কে ব্লক করা হয়েছে এবং সেশন তাৎক্ষণিক বাতিল করা হয়েছে।`
            : `${staff.display_name} has been suspended and active session terminated immediately.`,
        );
      } else {
        await reactivateUser(staff.id).unwrap();
        setActionSuccess(
          isBn
            ? `${staff.display_name}-কে সক্রিয় করা হয়েছে।`
            : `${staff.display_name} has been reactivated.`,
        );
      }
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to modify account status'));
    }
  };

  const handleDeleteStaff = async (staff: StaffItem) => {
    if (
      !confirm(
        isBn
          ? `সতর্কতা: আপনি কি স্থায়ীভাবে ${staff.display_name}-এর স্টাফ অ্যাকাউন্ট মুছে ফেলতে চান?`
          : `CAUTION: Permanently delete staff account for ${staff.display_name}?`,
      )
    )
      return;

    setActionError(null);
    try {
      await deleteStaff(staff.id).unwrap();
      setActionSuccess(
        isBn
          ? `${staff.display_name}-এর স্টাফ অ্যাকাউন্ট মুছে ফেলা হয়েছে।`
          : `Staff account for ${staff.display_name} deleted.`,
      );
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to delete staff member'));
    }
  };

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-users-admins-page">
        {/* Back Link to Hub */}
        <div>
          <Link
            href={withLocale('/dashboard/admin/users', locale)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{isBn ? 'ইউজার ও স্টাফ হাব-এ ফিরে যান' : 'Back to Users & Staff'}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'অ্যাডমিনিস্ট্রেটর রোস্টার ও স্টাফ গভর্নেন্স' : 'Administrator & Staff Roster'}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                {staffList.length} {isBn ? 'জন স্টাফ সদস্য' : 'Staff Members'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isBn
                ? 'সুপার অ্যাডমিন কর্তৃত্বাধীন প্রশাসনিক স্টাফ সদস্য ব্যবস্থাপনা, রোল অনুমতি, সেশন টার্মিনেশন ও অ্যাকাউন্ট ব্লক।'
                : 'Super Admin authority console: manage staff accounts, roles, instant session revocation, and security blocks.'}
            </p>
          </div>

          {/* Super Admin Secret Badge / Privacy Guarantee */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="font-semibold text-[11px]">
              {isBn
                ? 'প্ল্যাটফর্মের মূল মালিক (Super Admin) এই রোস্টারে সম্পূর্ণ গোপন।'
                : 'Platform Owner (Super Admin) is strictly concealed from this roster.'}
            </span>
          </div>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <Alert className="bg-success-soft text-success-soft-foreground border border-success/30">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{actionSuccess}</AlertDescription>
          </Alert>
        )}
        {actionError && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar + Create Staff Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isBn ? 'স্টাফের নাম, ইমেইল অথবা ফোন দিয়ে খুঁজুন...' : 'Search staff by name, email or phone...'
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-foreground text-xs placeholder:text-muted-foreground focus-visible:outline-none focus:ring-1 focus-visible:ring-primary"
            />
          </div>

          {isSuperAdmin && (
            <Button
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl"
              onClick={() => setShowCreateModal(true)}
              data-testid="create-staff-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isBn ? 'নতুন স্টাফ নিয়োগ' : 'Add Staff Member'}</span>
            </Button>
          )}
        </div>

        {/* Staff Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'স্টাফ নাম' : 'STAFF MEMBER'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'ইমেইল ও ফোন' : 'EMAIL & PHONE'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'অর্পিত রোল' : 'ASSIGNED ROLE'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'STATUS'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'সেশন কন্ট্রোল' : 'AUTH EPOCH'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'যোগদানের তারিখ' : 'JOINED'}
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    {isBn ? 'প্রশাসনিক অ্যাকশন' : 'GOVERNANCE ACTIONS'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      {isBn ? 'কোন স্টাফ কর্মী পাওয়া যায়নি' : 'No staff members found'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((member) => {
                    const isActive = member.status === 'active';
                    const mainRole = member.roles[0] || 'admin';

                    return (
                      <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                              {member.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{member.display_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                ID: {member.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-mono text-foreground text-[11px] font-medium">
                            {member.email || '—'}
                          </p>
                          {member.phone_e164 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              {member.phone_e164}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              mainRole === 'admin'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : mainRole === 'compliance_reviewer'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{mainRole.replace('_', ' ')}</span>
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
                            {isActive ? 'ACTIVE' : member.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-mono">
                            Epoch: {member.auth_epoch || 0}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-muted-foreground font-mono text-[11px]">
                          {new Date(member.created_at).toLocaleDateString(locale)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isSuperAdmin ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details/role */}
                              <button
                                type="button"
                                onClick={() => openEditModal(member)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title={isBn ? 'রোল ও তথ্য পরিবর্তন' : 'Edit role & details'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Instant Force Logout */}
                              <button
                                type="button"
                                onClick={() => handleForceLogout(member)}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                title={isBn ? 'সেশন টার্মিনেট করুন (Force Logout)' : 'Force Logout (Invalidate Tokens)'}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                              </button>

                              {/* Suspend / Block toggle */}
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(member)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-destructive hover:bg-destructive-soft border border-destructive/20"
                                  title={isBn ? 'অ্যাকাউন্ট ব্লক ও সেশন বাতিল' : 'Block & Invalidate Session'}
                                >
                                  {isBn ? 'ব্লক' : 'Block'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(member)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-success hover:bg-success-soft border border-success/20"
                                  title={isBn ? 'পুনরায় সক্রিয় করুন' : 'Reactivate'}
                                >
                                  {isBn ? 'সক্রিয়' : 'Activate'}
                                </button>
                              )}

                              {/* Delete Staff Member */}
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member)}
                                className="p-1.5 rounded-lg text-destructive hover:bg-destructive-soft transition-colors"
                                title={isBn ? 'মুছে ফেলুন' : 'Delete Staff'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              {isBn ? 'শুধুমাত্র রিড-অনলি' : 'Read-only access'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground gap-3">
            <div className="flex items-center gap-2">
              <span>{isBn ? 'প্রতি পাতায় সারি:' : 'Rows per page:'}</span>
              <span className="font-semibold text-foreground font-mono">{rowsPerPage}</span>
            </div>

            <div>
              <span>
                {isBn
                  ? `মোট ${filtered.length} জনের মধ্যে ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filtered.length)} প্রদর্শিত`
                  : `Showing ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} staff`}
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

        {/* Modal: Create Staff */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl relative animate-in fade-in-0 zoom-in-95">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isBn ? 'নতুন স্টাফ নিয়োগ' : 'Provision Staff Member'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isBn
                      ? 'অ্যাডমিন, সাপোর্ট অথবা কমপ্লায়েন্স রোল নির্ধারণ করুন'
                      : 'Create staff credentials and assign platform role'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'পূর্ণ নাম' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={isBn ? 'উদা: সাদিয়া রহমান' : 'e.g. Sadia Rahman'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="staff.name@ogroniedu.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'ফোন নম্বর (ঐচ্ছিক)' : 'Phone Number (Optional)'}
                  </label>
                  <input
                    type="tel"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)' : 'Password (min 8 characters)'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'প্রশাসনিক ভূমিকা (Role)' : 'Platform Staff Role'}
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="admin">Admin (System Operations & Matching)</option>
                    <option value="compliance_reviewer">Compliance Reviewer (KYC & Documents)</option>
                    <option value="support_agent">Support Agent (Disputes & Tickets)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                  >
                    {isCreating ? <LoadingSpinner /> : isBn ? 'নিশ্চিত করুন' : 'Provision Staff'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Staff */}
        {showEditModal && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl relative animate-in fade-in-0 zoom-in-95">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {isBn ? 'স্টাফ তথ্য ও রোল পরিবর্তন' : 'Edit Staff & Role'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {selectedStaff.email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'পূর্ণ নাম' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {isBn ? 'অর্পিত রোল' : 'Assigned Role'}
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="admin">Admin (System Operations & Matching)</option>
                    <option value="compliance_reviewer">Compliance Reviewer (KYC & Documents)</option>
                    <option value="support_agent">Support Agent (Disputes & Tickets)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowEditModal(false)}
                    className="text-xs"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                  >
                    {isUpdating ? <LoadingSpinner /> : isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
