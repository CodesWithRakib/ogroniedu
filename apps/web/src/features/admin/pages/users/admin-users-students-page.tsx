'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Users,
  GraduationCap,
  ShieldCheck,
  CreditCard,
  Ban,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { withLocale } from '@/lib/auth';
import { extractExactErrorMessage } from '@/lib/api-error';
import type { Locale } from '@/lib/i18n';
import {
  useListStudentsAndGuardiansQuery,
  useForceLogoutUserMutation,
  useSuspendUserMutation,
  useReactivateUserMutation,
} from '@/store/services/admin-api';

interface StudentGuardianRow {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  status: string;
  roles: string[];
  userType: 'standalone_student' | 'child_student' | 'guardian' | string;
  canMakeDirectPayment: boolean;
  personaLabelEn: string;
  personaLabelBn: string;
  linkedGuardian: { id: string; name: string; email: string } | null;
  linkedChildren: Array<{ id: string; name: string; email: string }>;
  createdAt: string;
  lastLoginAt: string | null;
}

export function AdminUsersStudentsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'standalone' | 'child' | 'guardian'>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const userTypeParam =
    activeTab === 'standalone'
      ? 'standalone_student'
      : activeTab === 'child'
        ? 'child_student'
        : activeTab === 'guardian'
          ? 'guardian'
          : undefined;

  const { data: listResponse, isLoading, refetch } = useListStudentsAndGuardiansQuery({
    page,
    limit,
    search: search.trim() || undefined,
    userType: userTypeParam,
  });

  const [forceLogout] = useForceLogoutUserMutation();
  const [suspendUser] = useSuspendUserMutation();
  const [reactivateUser] = useReactivateUserMutation();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rawList: StudentGuardianRow[] = (listResponse?.data as StudentGuardianRow[]) || [];
  const pagination = (listResponse?.meta as any)?.pagination || {
    page,
    limit,
    total: rawList.length,
    totalPages: 1,
  };

  const handleTabChange = (newTab: 'all' | 'standalone' | 'child' | 'guardian') => {
    setActiveTab(newTab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleForceLogout = async (item: StudentGuardianRow) => {
    if (
      !confirm(
        isBn
          ? `${item.displayName}-এর সক্রিয় সেশন তাৎক্ষণিকভাবে বন্ধ করতে চান?`
          : `Terminate active login session for ${item.displayName}?`,
      )
    )
      return;

    try {
      await forceLogout(item.id).unwrap();
      setActionSuccess(
        isBn
          ? `${item.displayName}-এর সকল সক্রিয় সেশন টার্মিনেট করা হয়েছে (Auth Epoch বৃদ্ধি পেয়েছে)।`
          : `Active session terminated immediately for ${item.displayName}.`,
      );
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to force logout user'));
    }
  };

  const handleToggleStatus = async (item: StudentGuardianRow) => {
    const isCurrentlyActive = item.status === 'active';
    const confirmMsg = isCurrentlyActive
      ? isBn
        ? `আপনি কি ${item.displayName}-কে স্থগিত (Suspend) করতে চান?`
        : `Suspend account for ${item.displayName}? All active sessions will terminate immediately.`
      : isBn
        ? `আপনি কি ${item.displayName}-এর অ্যাকাউন্ট সক্রিয় করতে চান?`
        : `Reactivate account for ${item.displayName}?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (isCurrentlyActive) {
        await suspendUser({ id: item.id, reason: 'Administrative suspension' }).unwrap();
        setActionSuccess(
          isBn
            ? `${item.displayName}-কে স্থগিত করা হয়েছে এবং লগইন ব্লক করা হয়েছে।`
            : `${item.displayName} suspended and active session revoked.`,
        );
      } else {
        await reactivateUser(item.id).unwrap();
        setActionSuccess(
          isBn ? `${item.displayName}-কে সক্রিয় করা হয়েছে।` : `${item.displayName} reactivated.`,
        );
      }
      refetch();
    } catch (err: any) {
      setActionError(extractExactErrorMessage(err, 'Failed to update account status'));
    }
  };

  return (
    <AdminLayout locale={locale}>
      <div className="flex flex-col gap-6 py-6" data-testid="admin-users-students-page">
        {/* Back Link with single Lucide icon (Zero double arrows) */}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'শিক্ষার্থী ও অভিভাবক গভর্নেন্স ডেস্ক' : 'Students & Guardians Governance'}
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {pagination.total} {isBn ? 'টি অ্যাকাউন্ট' : 'Accounts'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {isBn
                ? 'স্বতন্ত্র প্রাপ্তবয়স্ক শিক্ষার্থী (ডিরেক্ট পেমেন্ট ও রিকুয়েস্ট), সন্তান শিক্ষার্থী (অভিভাবক নির্ভর) ও অভিভাবকদের পারিবারিক সম্পর্ক পর্যবেক্ষণ।'
                : 'Partitioned management: Standalone Students (direct payments), Child Students (dependent minors), and Guardians.'}
            </p>
          </div>
        </div>

        {/* Action Notifications */}
        {actionSuccess && (
          <Alert className="bg-success-soft text-success-soft-foreground border-0">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{actionSuccess}</AlertDescription>
          </Alert>
        )}
        {actionError && (
          <Alert variant="destructive" className="border-0">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <AlertDescription className="text-xs font-semibold">{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Metric Cards - Seamless Flat Design */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div
            onClick={() => handleTabChange('all')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary/10 ring-2 ring-primary'
                : 'bg-card/70 hover:bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">{isBn ? 'সকল লার্নার' : 'All Learners'}</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">{activeTab === 'all' ? pagination.total : '—'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{isBn ? 'সকল প্রোফাইল' : 'Total accounts'}</p>
          </div>

          <div
            onClick={() => handleTabChange('standalone')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'standalone'
                ? 'bg-indigo-500/10 ring-2 ring-indigo-500'
                : 'bg-card/70 hover:bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">
                {isBn ? 'স্বাধীন শিক্ষার্থী' : 'Standalone Students'}
              </span>
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">{activeTab === 'standalone' ? pagination.total : '—'}</p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
              {isBn ? 'ডিরেক্ট পেমেন্ট সক্ষম' : 'Can pay & book directly'}
            </p>
          </div>

          <div
            onClick={() => handleTabChange('child')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'child'
                ? 'bg-blue-500/10 ring-2 ring-blue-500'
                : 'bg-card/70 hover:bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">
                {isBn ? 'সন্তান শিক্ষার্থী' : 'Child Students'}
              </span>
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">{activeTab === 'child' ? pagination.total : '—'}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
              {isBn ? 'অভিভাবকের অধীনস্থ (নো পেমেন্ট)' : 'Minor under guardian'}
            </p>
          </div>

          <div
            onClick={() => handleTabChange('guardian')}
            className={`p-4 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'guardian'
                ? 'bg-emerald-500/10 ring-2 ring-emerald-500'
                : 'bg-card/70 hover:bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">
                {isBn ? 'অভিভাবকবৃন্দ' : 'Guardians'}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-foreground font-mono">{activeTab === 'guardian' ? pagination.total : '—'}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {isBn ? 'পেমেন্ট ও টিউশন স্পনসর' : 'Escrow sponsor'}
            </p>
          </div>
        </div>

        {/* Search Bar - shadcn Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={
              isBn ? 'নাম, ইমেইল অথবা ফোন দিয়ে খুঁজুন...' : 'Search student or guardian by name, email, phone...'
            }
            value={search}
            onChange={handleSearchChange}
            className="pl-10 text-xs"
          />
        </div>

        {/* Table - Borderless & Seamless */}
        <div className="bg-card/70 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/30 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border/40">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'অ্যাকাউন্ট নাম' : 'ACCOUNT'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'যোগাযোগ' : 'CONTACT'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'পারসোনা ক্যাটাগরি' : 'PERSONA & ACCESS'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'পারিবারিক সম্পর্ক' : 'LINKED FAMILY'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'স্ট্যাটাস' : 'STATUS'}
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    {isBn ? 'অ্যাকশন' : 'ACTIONS'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : rawList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      {isBn
                        ? 'কোন শিক্ষার্থী বা অভিভাবক অ্যাকাউন্ট পাওয়া যায়নি'
                        : 'No accounts found matching filter'}
                    </td>
                  </tr>
                ) : (
                  rawList.map((item) => {
                    const isStandalone = item.userType === 'standalone_student';
                    const isChild = item.userType === 'child_student';
                    const isGuardian = item.userType === 'guardian';
                    const isActive = item.status === 'active';

                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                                isGuardian
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isStandalone
                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {isGuardian ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : isStandalone ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <GraduationCap className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{item.displayName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                ID: {item.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                          <p className="text-foreground">{item.email || '—'}</p>
                          {item.phoneE164 && <p className="text-[10px] mt-0.5">{item.phoneE164}</p>}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant={isGuardian ? 'default' : 'secondary'}
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              {isBn ? item.personaLabelBn : item.personaLabelEn}
                            </Badge>
                            {item.canMakeDirectPayment ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CreditCard className="w-3 h-3" />
                                <span>{isBn ? 'সরাসরি পেমেন্ট সক্ষম' : 'Can Pay & Book Directly'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Ban className="w-3 h-3" />
                                <span>{isBn ? 'পেমেন্ট অনুমোদিত নয় (নাবালক)' : 'No Direct Payment Allowed'}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Linked family using clean Lucide icons (Zero emojis) */}
                        <td className="px-5 py-4">
                          {isChild && item.linkedGuardian ? (
                            <div className="text-[11px]">
                              <p className="font-semibold text-foreground flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
                                <span>{item.linkedGuardian.name}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.linkedGuardian.email}
                              </p>
                            </div>
                          ) : isGuardian && item.linkedChildren.length > 0 ? (
                            <div className="text-[11px] space-y-0.5">
                              {item.linkedChildren.map((c) => (
                                <p key={c.id} className="font-semibold text-foreground flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" />
                                  <span>{c.name}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              {isStandalone
                                ? isBn
                                  ? 'স্বতন্ত্র (প্রাপ্তবয়স্ক)'
                                  : 'Independent Adult'
                                : '—'}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            variant={isActive ? 'outline' : 'destructive'}
                            className="text-[10px] font-bold"
                          >
                            {isActive ? 'ACTIVE' : item.status.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Manage 360° Dossier Link */}
                            <Link
                              href={withLocale(`/dashboard/admin/users/students/${item.id}`, locale)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
                              data-testid={`dossier-btn-${item.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isBn ? '৩৬০° তথ্য' : 'Manage 360°'}</span>
                            </Link>

                            {/* Force Logout */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleForceLogout(item)}
                              className="text-amber-600 dark:text-amber-400 p-1.5 h-8 w-8"
                              title={isBn ? 'সেশন টার্মিনেট করুন' : 'Force Logout'}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </Button>

                            {/* Suspend / Reactivate */}
                            {isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(item)}
                                className="text-[10px] font-bold text-destructive hover:bg-destructive/10 h-7 px-2"
                              >
                                {isBn ? 'স্থগিত' : 'Suspend'}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleStatus(item)}
                                className="text-[10px] font-bold text-success hover:bg-success/10 h-7 px-2"
                              >
                                {isBn ? 'সক্রিয়' : 'Activate'}
                              </Button>
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

          {/* Backend Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-mono">
                {isBn
                  ? `পৃষ্ঠা ${pagination.page} / ${pagination.totalPages} (মোট ${pagination.total} টি রেকর্ড)`
                  : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total accounts)`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1 text-xs"
                >
                  <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
