'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Lock } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { AdminAuditLogsTab } from '../components/tabs/adminAuditLogsTab';

export function AdminAuditLogsPage({ locale }: { locale: Locale }) {
  const t = useTranslations('admin');
  const admin = useAdminDashboard(locale);

  const totalLogs = admin.logs.length;

  return (
    <AdminLayout locale={locale}>
      {admin.loading && !admin.logs.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 py-6" data-testid="admin-audit-logs-page">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {locale === 'bn'
                    ? 'প্ল্যাটফর্ম সিকিউরিটি ও অডিট লগ'
                    : 'Platform Security & Audit Trail'}
                </h1>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-info-soft text-info-soft-foreground">
                  {totalLogs} {locale === 'bn' ? 'ইভেন্ট রেকর্ড' : 'Events'}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">
                {locale === 'bn'
                  ? 'সকল প্রশাসনিক ক্রিয়া, নিরাপত্তা ইভেন্ট এবং রোল পরিবর্তনের অপরিবর্তনীয় রেকর্ড'
                  : 'Immutable record of platform mutations, security events, and operator actions'}
              </p>
            </div>
          </div>

          {/* Security & Sanitization Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success-soft-foreground" />
              <span>{t('auditTrailTitle')}</span>
            </h3>
            <p className="text-xs text-success-soft-foreground font-semibold flex items-center space-x-1.5">
              <Lock className="w-4 h-4" />
              <span>{t('auditRedactedNotice')}</span>
            </p>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>
                •{' '}
                {locale === 'bn'
                  ? 'সকল মিউটেশন অপরিবর্তনীয়ভাবে PostgreSQL `audit_logs` টেবিলে সংরক্ষিত হয়।'
                  : 'All mutations are recorded to PostgreSQL `audit_logs` table.'}
              </p>
              <p>
                •{' '}
                {locale === 'bn'
                  ? 'ক্রেডেনশিয়াল, পাসওয়ার্ড, কার্ড নম্বর ও সেশন টোকেন স্বয়ংক্রিয়ভাবে মাস্ক করা হয়।'
                  : 'Credentials, passwords, card PANs, and session tokens are strictly sanitized.'}
              </p>
              <p>
                •{' '}
                {locale === 'bn'
                  ? 'কন্ট্রোলার লেভেলে NestJS `RolesGuard` দ্বারা লিস্ট-প্রিভিলেজ কার্যকর।'
                  : 'Least-privilege role boundaries enforced at NestJS `RolesGuard` controller level.'}
              </p>
            </div>
          </div>

          {/* Audit Logs Table Card */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4">
            <AdminAuditLogsTab auditLogs={admin.logs} locale={locale} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
