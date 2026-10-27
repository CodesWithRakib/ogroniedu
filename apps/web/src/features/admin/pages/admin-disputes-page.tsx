'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CreditCard, LifeBuoy, CheckCircle2, ArrowUpDown, Scale, ShieldAlert } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner, Alert, AlertDescription } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { useAdminActions } from '../hooks/use-admin-actions';
import { AdminReconciliationTab } from '../components/tabs/adminReconciliationTab';
import { AdminSupportTab } from '../components/tabs/adminSupportTab';
import { AdminDisputesTab } from '../components/tabs/adminDisputesTab';
import { AdminSafetyTab } from '../components/tabs/adminSafetyTab';

export function AdminDisputesPage({
  locale,
  initialSub,
}: {
  locale: Locale;
  initialSub?: 'disputes' | 'safety' | 'reconciliation' | 'support';
}) {
  const t = useTranslations('admin');
  const searchParams = useSearchParams();
  const subParam = searchParams?.get('sub') || searchParams?.get('tab');
  const resolvedSub =
    subParam === 'safety'
      ? 'safety'
      : subParam === 'reconciliation'
        ? 'reconciliation'
        : subParam === 'support'
          ? 'support'
          : subParam === 'disputes'
            ? 'disputes'
            : initialSub || 'disputes';

  const admin = useAdminDashboard(locale);
  const [subSection, setSubSection] = React.useState<
    'disputes' | 'safety' | 'reconciliation' | 'support'
  >(resolvedSub);

  const actions = useAdminActions({
    initialReconciliation: admin.reconciliation,
    initialTickets: admin.tickets,
    onUpdateTicketStatus: admin.onUpdateTicketStatus,
    onRerunReconciliation: admin.onRunReconciliation,
  });

  const isBalanced = admin.reconciliation?.isBalanced ?? true;
  const openTicketsCount = admin.tickets.filter(
    (tk) => tk.status === 'submitted' || tk.status === 'in_review',
  ).length;

  return (
    <AdminLayout locale={locale}>
      {admin.loading && !admin.tickets.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex flex-col gap-6 py-6" data-testid="admin-disputes-page">
          {actions.actionError && (
            <Alert variant="destructive" data-testid="admin-action-error">
              <AlertDescription role="alert">{actions.actionError}</AlertDescription>
            </Alert>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {locale === 'bn'
                    ? 'আর্থিক রিকনসিলিয়েশন ও বিরোধ নিষ্পত্তি'
                    : 'Financial Reconciliation & Disputes'}
                </h1>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    isBalanced
                      ? 'bg-success-soft text-success-soft-foreground border-success/30'
                      : 'bg-destructive/15 text-destructive-soft-foreground border-destructive/40'
                  }`}
                >
                  {isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1.5">
                {locale === 'bn'
                  ? 'ডাবল-এন্ট্রি এসক্রো হিসাবপত্র নিরীক্ষা এবং শিক্ষার্থী ও অভিভাবকদের সাপোর্ট ও বিরোধ টিকেট ট্রায়াজ'
                  : 'Double-entry escrow ledger reconciliation and user dispute ticket resolution'}
              </p>
            </div>

            {/* Sub-section Switcher */}
            <div className="flex flex-wrap bg-surface/80 p-1 rounded-2xl border border-border gap-1">
              <button
                onClick={() => setSubSection('disputes')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'disputes'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-disputes-btn"
              >
                <Scale className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'বুকিং বিরোধ' : 'Booking Disputes'}
              </button>
              <button
                onClick={() => setSubSection('safety')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'safety'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-safety-btn"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'শিশু সুরক্ষা' : 'Child Safety'}
              </button>
              <button
                onClick={() => setSubSection('reconciliation')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'reconciliation'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-reconciliation-btn"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'লেজার হিসাব' : 'Ledger Accounts'}
              </button>
              <button
                onClick={() => setSubSection('support')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'support'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-support-btn"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'সাপোর্ট টিকিট' : 'Support Tickets'}
                {openTicketsCount > 0 && <span className="w-2 h-2 rounded-full bg-warning" />}
              </button>
            </div>
          </div>

          {/* 3 Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
                <p className="text-2xl font-black text-foreground mt-1 font-mono">
                  {admin.reconciliation?.totalDebits || '0'} BDT
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-interactive/10 border border-info/40 flex items-center justify-center text-info-soft-foreground">
                <ArrowUpDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
                <p className="text-2xl font-black text-foreground mt-1 font-mono">
                  {admin.reconciliation?.totalCredits || '0'} BDT
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-success-soft border border-success/30 flex items-center justify-center text-success-soft-foreground">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'উন্মুক্ত সাপোর্ট টিকিট' : 'Open Dispute Tickets'}
                </p>
                <p className="text-2xl font-black text-warning-soft-foreground mt-1 font-mono">
                  {openTicketsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/40 flex items-center justify-center text-warning-soft-foreground">
                <LifeBuoy className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Content Card based on subSection */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
            {subSection === 'disputes' && <AdminDisputesTab locale={locale} />}
            {subSection === 'safety' && <AdminSafetyTab locale={locale} />}
            {subSection === 'reconciliation' && (
              <AdminReconciliationTab
                reconciliation={actions.reconciliation}
                onRunAudit={actions.rerunReconciliation}
                locale={locale}
              />
            )}
            {subSection === 'support' && (
              <AdminSupportTab
                tickets={actions.tickets}
                onUpdateStatus={actions.updateTicketStatus}
              />
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
