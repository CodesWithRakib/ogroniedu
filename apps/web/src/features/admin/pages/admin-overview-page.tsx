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
  GraduationCap,
  RefreshCw,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Button } from '@/components/ui';
import { AdminPlatformTelemetryGrid, AdminTriageCommandCenter } from '../components';
import { formatLocalizedNumber, type Locale } from '@/lib/i18n';
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
      accent: 'bg-info-soft border-info/30 text-info-soft-foreground',
      actionTextBn: 'ইউজার ম্যানেজার খুলুন',
      actionTextEn: 'Open User Manager',
    },
    {
      titleBn: 'একাডেমিক ট্যাক্সোনমি ও ডেটা',
      titleEn: 'Academic Taxonomy Management',
      descBn: 'শ্রেণি, কারিকুলাম, গ্রুপ/শাখা, শিক্ষা প্রতিষ্ঠান ও বিষয় ডায়নামিক নিয়ন্ত্রণ',
      descEn:
        'Dynamically configure education levels, curricula, streams, institutions and subjects',
      href: `/${locale}/dashboard/admin/taxonomy`,
      icon: GraduationCap,
      accent: 'bg-accent-soft border-accent/30 text-accent-soft-foreground',
      actionTextBn: 'ট্যাক্সোনমি পরিচালনা',
      actionTextEn: 'Manage Taxonomy',
    },
    {
      titleBn: 'শিক্ষক যাচাই কিউ',
      titleEn: 'Tutor Verification',
      descBn: 'টিউটরদের এনআইডি, ডিগ্রি সনদ ও যোগ্যতা নিরীক্ষা ও অনুমোদন',
      descEn: 'Inspect NID, degree certificates and approve tutor credentials',
      href: `/${locale}/dashboard/admin/verification`,
      icon: Search,
      accent: 'bg-primary-soft border-primary/30 text-primary',
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
      accent: 'bg-warning-soft border-warning/30 text-warning-soft-foreground',
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
      accent: 'bg-interactive-soft border-interactive/30 text-interactive-soft-foreground',
      actionTextBn: 'অ্যানালিটিক্স ড্যাশবোর্ড',
      actionTextEn: 'Open Analytics',
    },
  ];

  return (
    <AdminLayout locale={locale}>
      {admin.loading && !admin.users.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex flex-col gap-8 py-6" data-testid="admin-overview-page">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {t('title')}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-info-soft text-info-soft-foreground border border-info/30">
                  {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-success-soft text-success-soft-foreground border border-success/30">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  {locale === 'bn' ? 'সিস্টেম সক্রিয়' : 'System Active'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">{t('subtitle')}</p>
            </div>
            <div className="text-left md:text-right bg-surface border border-border/80 p-3 rounded-2xl shadow-xs">
              <p className="text-xs text-muted-foreground">Authenticated Operator</p>
              <p className="text-sm font-semibold text-foreground">
                {user?.displayName || 'Admin'}
              </p>
            </div>
          </div>

          {/* 1. Platform Operational & Financial Telemetry */}
          <AdminPlatformTelemetryGrid
            locale={locale}
            totalGmvBdt={
              admin.metrics.gmvMinor ? Math.round(Number(admin.metrics.gmvMinor) / 100) : 0
            }
            activeEscrowPoolBdt={
              admin.metrics.escrowPoolMinor
                ? Math.round(Number(admin.metrics.escrowPoolMinor) / 100)
                : 0
            }
            verifiedTutorsCount={admin.metrics.verifiedTutorsCount ?? 4}
            activeStudentsCount={
              admin.metrics.activeStudentsCount ?? admin.metrics.totalRegisteredUsers
            }
            isLedgerBalanced={admin.reconciliation?.isBalanced ?? true}
          />

          {/* 2. Priority Triage Command Center */}
          <AdminTriageCommandCenter
            locale={locale}
            pendingVerifications={admin.metrics.pendingTutorVerifications}
            activeReplacements={admin.metrics.activeReplacementCases}
            openSafetyReports={admin.metrics.openSafetyReports}
          />

          {/* 3. 5 Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <Link
              href={`/${locale}/dashboard/admin/verification`}
              className="bg-card hover:bg-surface-hover/80 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {t('tutorVerificationQueue')}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 font-sans tabular-nums">
                {formatLocalizedNumber(admin.metrics.pendingTutorVerifications, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {t('captionPendingDossiers')}
              </p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/disputes`}
              className="bg-card hover:bg-surface-hover/80 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {t('replacementQueue')}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 font-sans tabular-nums">
                {formatLocalizedNumber(admin.metrics.activeReplacementCases, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {t('captionActiveCases')}
              </p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/disputes`}
              className="bg-card hover:bg-surface-hover/80 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-destructive-soft text-destructive flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {t('safetyQueue')}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 font-sans tabular-nums">
                {formatLocalizedNumber(admin.metrics.openSafetyReports, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {t('captionOpenReports')}
              </p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/bookings`}
              className="bg-card hover:bg-surface-hover/80 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {t('activeBookings')}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 font-sans tabular-nums">
                {formatLocalizedNumber(admin.metrics.activeBookingsCount, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {t('captionInProgress')}
              </p>
            </Link>

            <Link
              href={`/${locale}/dashboard/admin/users`}
              className="col-span-2 lg:col-span-1 bg-card hover:bg-surface-hover/80 border border-border/80 hover:border-primary/40 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs hover:shadow-sm group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {t('totalUsers')}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3 font-sans tabular-nums">
                {formatLocalizedNumber(admin.metrics.totalRegisteredUsers, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {t('captionTotalCatalog')}
              </p>
            </Link>
          </div>

          {/* Quick Launch Control Hub */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
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
                    className="bg-card hover:bg-surface-hover border border-border hover:border-primary/40 rounded-2xl p-5 sm:p-6 transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${item.accent}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1">
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
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-success" />
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
                      ? 'bg-success-soft text-success-soft-foreground border-success/30'
                      : 'bg-destructive-soft text-destructive-soft-foreground border-destructive/30'
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
              <div className="bg-surface p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">
                  {admin.reconciliation?.totalDebits || '0'} BDT
                </p>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
                <p className="text-lg font-mono font-bold text-foreground mt-1">
                  {admin.reconciliation?.totalCredits || '0'} BDT
                </p>
              </div>
              <div className="bg-surface p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground font-medium">{t('discrepancy')}</p>
                <p
                  className={`text-lg font-mono font-bold mt-1 ${
                    admin.reconciliation?.discrepancy === '0'
                      ? 'text-success-soft-foreground'
                      : 'text-destructive-soft-foreground'
                  }`}
                >
                  {admin.reconciliation?.discrepancy || '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Security & Audit Policy Card */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-success-soft-foreground text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>{t('auditRedactedNotice')}</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {locale === 'bn'
                  ? 'সকল প্রশাসনিক ক্রিয়া PostgreSQL audit_logs টেবিলে সংরক্ষণ করা হয়। পাসওয়ার্ড, সেশন টোকেন এবং কার্ড নম্বর স্বয়ংক্রিয়ভাবে মাস্ক করা থাকে।'
                  : 'All mutations are recorded to PostgreSQL audit_logs. Credentials, passwords, card PANs, and session tokens are strictly sanitized.'}
              </p>
            </div>
            <Button asChild size="sm" className="whitespace-nowrap shrink-0">
              <Link href={`/${locale}/admin?tab=audit`}>
                <FileText className="w-4 h-4" />
                <span>{locale === 'bn' ? 'অডিট হিস্ট্রি খুলুন' : 'Inspect Audit Trail'}</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
