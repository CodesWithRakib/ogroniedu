'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, BookOpen, Users, User } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';

export function AdminUsersStudentsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const admin = useAdminDashboard(locale);
  const [search, setSearch] = useState('');

  const learners = admin.users.filter(
    (u) => u.roles.includes('student') || u.roles.includes('guardian'),
  );
  const filtered = learners.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.displayName.toLowerCase().includes(q) ||
      Boolean(l.email?.toLowerCase().includes(q)) ||
      Boolean(l.phoneE164 && l.phoneE164.includes(q))
    );
  });

  return (
    <AdminLayout
      locale={locale}
      title={isBn ? 'শিক্ষার্থী ও অভিভাবক ডিরেক্টরি' : 'Students & Guardians Directory'}
    >
      <div className="space-y-6 py-6" data-testid="admin-users-students-page">
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
                {isBn ? 'শিক্ষার্থী ও অভিভাবক ডিরেক্টরি' : 'Students & Guardians'}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {learners.length} {isBn ? 'টি অ্যাকাউন্ট' : 'Accounts'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isBn
                ? 'সক্রিয় শিক্ষার্থী ও অভিভাবক অ্যাকাউন্ট, টিউশন এনরোলমেন্ট ও প্রোফাইল তথ্য।'
                : 'Monitor active student enrollments, guardian accounts, assigned tuition sessions, and family profiles.'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={
              isBn
                ? 'শিক্ষার্থী বা অভিভাবকের নাম বা ইমেইল দিয়ে খুঁজুন...'
                : 'Search student or guardian...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs shadow-2xs"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border/60">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'অ্যাকাউন্ট' : 'ACCOUNT'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'যোগাযোগ' : 'EMAIL / PHONE'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'ভূমিকা' : 'ROLE'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'স্ট্যাটাস' : 'STATUS'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'নিবন্ধনের তারিখ' : 'REGISTERED'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {admin.loading && !filtered.length ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      {isBn
                        ? 'কোন শিক্ষার্থী বা অভিভাবক পাওয়া যায়নি'
                        : 'No students or guardians found'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isGuardian = item.roles.includes('guardian');
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                              {isGuardian ? (
                                <Users className="w-4 h-4" />
                              ) : (
                                <BookOpen className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{item.displayName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                          <p>{item.email || '—'}</p>
                          {item.phoneE164 && <p className="text-[10px] mt-0.5">{item.phoneE164}</p>}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 uppercase">
                            {isGuardian ? 'GUARDIAN' : 'STUDENT'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'active'
                                ? 'bg-success-soft text-success-soft-foreground border border-success/30'
                                : 'bg-destructive-soft text-destructive-soft-foreground border border-destructive/30'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-muted-foreground font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleDateString(locale)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
