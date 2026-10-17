'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ShieldCheck,
  Users,
  Search,
  CreditCard,
  BarChart3,
  FileText,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';

export function AdminOverviewPage({ locale }: { locale: Locale }) {
  const t = useTranslations('admin');
  const user = useAppSelector((s) => s.auth.user);
  const admin = useAdminDashboard(locale);
  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;

  const quickLaunchItems = [
    {
      titleBn: 'ব্যবহারকারী ব্যবস্থাপনা',
      titleEn: 'User Management',
      descBn: 'নিবন্ধিত অ্যাকাউন্ট, রোল পারমিশন এবং নিরাপত্তা স্ট্যাটাস পরিচালনা',
      descEn: 'Manage accounts, staff roles, suspensions and security access',
      href: `/${locale}/dashboard/admin/users`,
      icon: Users,
      accent: 'from-brand to-primary/10 border-info/40 text-info-soft-foreground',
      actionTextBn: 'ইউজার ম্যানেজার খুলুন',
      actionTextEn: 'Open User Manager',
    },
    {
      titleBn: 'শিক্ষক যাচাই কিউ',
      titleEn: 'Tutor Verification',
      descBn: 'টিউটরদের এনআইডি, ডিগ্রি সনদ ও যোগ্যতা নিরীক্ষা ও অনুমোদন',
      descEn: 'Inspect NID, degree certificates and approve tutor credentials',
      href: `/${locale}/dashboard/admin/verification`,
      icon: Search,
      accent: 'from-primary/20 to-primary/10 border-primary/40 text-success-soft-foreground',
      actionTextBn: 'ভেরিফিকেশন কিউ খুলুন',
      actionTextEn: 'Open Verification Queue',
    },
    {
      titleBn: 'লেজার ও বিরোধ নিষ্পত্তি',
      titleEn: 'Reconciliation & Disputes',
      descBn: 'ডাবল-এন্ট্রি এসক্রো হিসাবপত্র ও কাস্টমার সাপোর্ট টিকেট ট্রায়াজ',
      descEn: 'Continuous ledger audit and customer dispute resolution',
      href: `/${locale}/dashboard/admin/disputes`,
      icon: CreditCard,
      accent: 'from-warning/20 to-warning/10 border-warning/40 text-warning-soft-foreground',
      actionTextBn: 'লেজার ও বিরোধ খুলুন',
      actionTextEn: 'Open Disputes & Ledger',
    },
    {
      titleBn: 'এক্সিকিউটিভ অ্যানালিটিক্স',
      titleEn: 'Platform Analytics',
      descBn: 'কনভার্সন ফানেল, টিউটর পারফরম্যান্স ও রাজস্ব মেট্রিক্স রিপোর্ট',
      descEn: 'Conversion funnel, GMV, and operational reporting',
      href: `/${locale}/dashboard/admin/analytics`,
      icon: BarChart3,
      accent: 'from-interactive/20 to-interactive/10 border-interactive/30 text-interactive',
      actionTextBn: 'অ্যানালিটিক্স ড্যাশবোর্ড',
      actionTextEn: 'Open Analytics',
    },
  ];

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'অ্যাডমিন' : 'Admin'}>
      {admin.loading && !admin.users.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-8 py-6" data-testid="admin-overview-page">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {t('title')}
                </h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-interactive/15 text-info-soft-foreground border border-info/40 shadow-xs">
                  {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-primary/15 text-success-soft-foreground border border-primary/40">
                  <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  {locale === 'bn' ? 'সিস্টেম সক্রিয়' : 'System Active'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">{t('subtitle')}</p>
            </div>
            <div className="text-left md:text-right bg-surface/60 border border-border/60 p-3 rounded-2xl">
              <p className="text-xs text-muted-foreground">Authenticated Operator</p>
              <p className="text-sm font-semibold text-foreground">
                {user?.displayName || 'Admin'}
              </p>
            </div>
          </div>

          {/* 5 Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <Link
              href={`/${locale}/dashboard/admin/verification`}
              className="bg-card hover:bg-surface-hover/80 border border-border/70 hover:border-info/40 rounded-2xl p-4.5 transition-all shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground font-medium">
                  {t('tutorVerificationQueue')}
                </p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-info-soft-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-2xl font-black text-info-soft-foreground mt-2 font-mono">
                {admin.metrics.pendingTutorVerifications}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">Pending Dossiers</p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/disputes`}
              className="bg-card hover:bg-surface-hover/80 border border-border/70 hover:border-warning/40 rounded-2xl p-4.5 transition-all shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground font-medium">{t('replacementQueue')}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-warning-soft-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-2xl font-black text-warning-soft-foreground mt-2 font-mono">
                {admin.metrics.activeReplacementCases}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">Active Cases</p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/disputes`}
              className="bg-card hover:bg-surface-hover/80 border border-border/70 hover:border-destructive/40 rounded-2xl p-4.5 transition-all shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground font-medium">{t('safetyQueue')}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-destructive-soft-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-2xl font-black text-destructive-soft-foreground mt-2 font-mono">
                {admin.metrics.openSafetyReports}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">Open Reports</p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/bookings`}
              className="bg-card hover:bg-surface-hover/80 border border-border/70 hover:border-primary/40 rounded-2xl p-4.5 transition-all shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground font-medium">{t('activeBookings')}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-success-soft-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-2xl font-black text-success-soft-foreground mt-2 font-mono">
                {admin.metrics.activeBookingsCount}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">In Progress</p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/users`}
              className="col-span-2 lg:col-span-1 bg-card hover:bg-surface-hover/80 border border-border/70 hover:border-primary/40 rounded-2xl p-4.5 transition-all shadow-xs group"
            >
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground font-medium">{t('totalUsers')}</p>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary-soft-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-2xl font-black text-foreground mt-2 font-mono">
                {admin.metrics.totalRegisteredUsers}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">Total Catalog</p>
            </Link>
          </div>

          {/* Quick Launch Control Hub */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-info-soft-foreground" />
                {locale === 'bn' ? 'প্রশাসনিক কন্ট্রোল হাব' : 'Administrative Control Hub'}
              </h2>
              <span className="text-xs text-muted-foreground">
                {locale === 'bn' ? 'সরাসরি পেজে নেভিগেট করুন' : 'Navigate directly to sections'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLaunchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-card hover:bg-surface-hover border border-border/70 hover:border-border rounded-3xl p-5 sm:p-6 transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br border ${item.accent}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-info-soft-foreground group-hover:underline flex items-center gap-1">
                          {locale === 'bn' ? item.actionTextBn : item.actionTextEn}
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">
                        {locale === 'bn' ? item.titleBn : item.titleEn}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {locale === 'bn' ? item.descBn : item.descEn}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Double-Entry Ledger Integrity Snapshot */}
          <div className="bg-card border border-border/70 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-success-soft-foreground" />
                  <span>{t('reconciliationTitle')}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'bn'
                    ? 'ব্যাংক সেটেলমেন্ট ও স্টুডেন্ট এসক্রো পুলের লাইভ অখণ্ডতা'
                    : 'Continuous ledger reconciliation across bank settlement and student escrow'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    admin.reconciliation?.isBalanced
                      ? 'bg-primary/15 text-success-soft-foreground border-primary/40'
                      : 'bg-destructive/15 text-destructive-soft-foreground border-destructive/40'
                  }`}
                >
                  {admin.reconciliation?.isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
                </span>
                <Link
                  href={`/${locale}/dashboard/admin/disputes`}
                  className="px-3.5 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-semibold text-foreground transition"
                >
                  {locale === 'bn' ? 'বিস্তারিত লেজার দেখুন' : 'View Full Ledger'}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-surface/80 p-4 rounded-2xl border border-border/70">
                <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">
                  {admin.reconciliation?.totalDebits || '0'} BDT
                </p>
              </div>
              <div className="bg-surface/80 p-4 rounded-2xl border border-border/70">
                <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">
                  {admin.reconciliation?.totalCredits || '0'} BDT
                </p>
              </div>
              <div className="bg-surface/80 p-4 rounded-2xl border border-border/70">
                <p className="text-xs text-muted-foreground font-medium">{t('discrepancy')}</p>
                <p
                  className={`text-lg font-mono font-bold mt-1 ${
                    admin.reconciliation?.discrepancy === '0' ? 'text-success-soft-foreground' : 'text-destructive-soft-foreground'
                  }`}
                >
                  {admin.reconciliation?.discrepancy || '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Security & Audit Policy Card */}
          <div className="bg-card border border-border/70 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success-soft-foreground text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('auditRedactedNotice')}</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {locale === 'bn'
                  ? 'সকল প্রশাসনিক ক্রিয়া PostgreSQL audit_logs টেবিলে সংরক্ষণ করা হয়। পাসওয়ার্ড, সেশন টোকেন এবং কার্ড নম্বর স্বয়ংক্রিয়ভাবে মাস্ক করা থাকে।'
                  : 'All mutations are recorded to PostgreSQL audit_logs. Credentials, passwords, card PANs, and session tokens are strictly sanitized.'}
              </p>
            </div>
            <Link
              href={`/${locale}/admin?tab=audit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {locale === 'bn' ? 'অডিট হিস্ট্রি খুলুন' : 'Inspect Audit Trail'}
            </Link>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
