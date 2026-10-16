'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, LifeBuoy, CheckCircle2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { LoadingSpinner } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { useAdminActions } from '../hooks/use-admin-actions';
import { AdminReconciliationTab } from '../components/tabs/adminReconciliationTab';
import { AdminSupportTab } from '../components/tabs/adminSupportTab';

export function AdminDisputesPage({ locale }: { locale: Locale }) {
  const t = useTranslations('admin');
  const admin = useAdminDashboard(locale);
  const [subSection, setSubSection] = React.useState<'reconciliation' | 'support'>('reconciliation');

  const actions = useAdminActions({
    initialReconciliation: admin.reconciliation,
    initialTickets: admin.tickets,
    onUpdateTicketStatus: admin.onUpdateTicketStatus,
  });

  const isBalanced = admin.reconciliation?.isBalanced ?? true;
  const ticketsCount = admin.tickets.length;
  const openTicketsCount = admin.tickets.filter((tk) => tk.status === 'submitted' || tk.status === 'in_review').length;

  return (
    <AdminLayout locale={locale} title={locale === 'bn' ? 'লেজার ও বিরোধ' : 'Ledger & Disputes'}>
      {admin.loading && !admin.tickets.length ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6 py-6" data-testid="admin-disputes-page">
          {actions.actionError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300"
              data-testid="admin-action-error"
            >
              {actions.actionError}
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {locale === 'bn' ? 'আর্থিক রিকনসিলিয়েশন ও বিরোধ নিষ্পত্তি' : 'Financial Reconciliation & Disputes'}
                </h1>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    isBalanced
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
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
            <div className="flex bg-surface/80 p-1 rounded-2xl border border-border/80">
              <button
                onClick={() => setSubSection('reconciliation')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'reconciliation'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'লেজার হিসাব' : 'Ledger Accounts'}
              </button>
              <button
                onClick={() => setSubSection('support')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  subSection === 'support'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                {locale === 'bn' ? 'বিরোধ ও সাপোর্ট টিকেট' : 'Dispute Tickets'}
                {openTicketsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            </div>
          </div>

          {/* 3 Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">
                  {admin.reconciliation?.totalDebits || '0'} BDT
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ArrowUpDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">
                  {admin.reconciliation?.totalCredits || '0'} BDT
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-2xl p-4.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {locale === 'bn' ? 'উন্মুক্ত সাপোর্ট টিকিট' : 'Open Dispute Tickets'}
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                  {openTicketsCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <LifeBuoy className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Content Card based on subSection */}
          <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4">
            {subSection === 'reconciliation' ? (
              <AdminReconciliationTab
                reconciliation={actions.reconciliation}
                onRunAudit={actions.rerunReconciliation}
              />
            ) : (
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
