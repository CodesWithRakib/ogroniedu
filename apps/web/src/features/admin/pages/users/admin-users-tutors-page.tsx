'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, GraduationCap, ShieldCheck, Star } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../../hooks/use-admin-dashboard';

export function AdminUsersTutorsPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const admin = useAdminDashboard(locale);
  const [search, setSearch] = useState('');

  const tutors = admin.users.filter((u) => u.roles.includes('tutor'));
  const filtered = tutors.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.displayName.toLowerCase().includes(q) ||
      Boolean(t.email?.toLowerCase().includes(q)) ||
      Boolean(t.phoneE164 && t.phoneE164.includes(q))
    );
  });

  return (
    <AdminLayout locale={locale}>
      <div className="space-y-6 py-6" data-testid="admin-users-tutors-page">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isBn ? 'শিক্ষক ও টিউটর ডিরেক্টরি' : 'Tutor & Teacher Directory'}
              </h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-success-soft text-success-soft-foreground border border-success/20">
                {tutors.length} {isBn ? 'জন শিক্ষক' : 'Educators'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {isBn
                ? 'প্ল্যাটফর্মের নিবন্ধিত ও অনুমোদিত শিক্ষকদের তালিকা, বিষয়ভিত্তিক দক্ষতা ও প্রোফাইল।'
                : 'Oversee certified tutors, inspect teaching performance, review ratings, and manage instructor profiles.'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={
              isBn ? 'শিক্ষকের নাম বা ইমেইল দিয়ে খুঁজুন...' : 'Search tutor by name or email...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-foreground text-xs"
          />
        </div>

        {/* Tutors Grid/Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] font-bold text-muted-foreground border-b border-border">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'শিক্ষক' : 'TUTOR'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'যোগাযোগ' : 'CONTACT'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'ভেরিফিকেশন' : 'VERIFICATION'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'স্ট্যাটাস' : 'STATUS'}
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    {isBn ? 'যোগদানের তারিখ' : 'JOINED'}
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    {isBn ? 'অ্যাকশন' : 'ACTION'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {admin.loading && !filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      {isBn ? 'কোন শিক্ষক পাওয়া যায়নি' : 'No tutors found'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((tutor) => (
                    <tr key={tutor.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-success-soft border border-success/20 text-success font-bold flex items-center justify-center text-xs">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{tutor.displayName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {tutor.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                        {tutor.email || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success-soft-foreground border border-success/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tutor.status === 'active'
                              ? 'bg-success-soft text-success-soft-foreground border border-success/30'
                              : 'bg-destructive-soft text-destructive-soft-foreground border border-destructive/30'
                          }`}
                        >
                          {tutor.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(tutor.createdAt).toLocaleDateString(locale)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={withLocale(`/dashboard/admin/verification/${tutor.id}`, locale)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
                        >
                          <span>{isBn ? 'পূর্ণ প্রোফাইল ও সনদ পরিদর্শন' : 'Inspect 360°'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
