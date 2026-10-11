'use client';

import { useTranslations } from 'next-intl';
import type { AdminReconciliationData } from '../../types/admin.types';

/** Overview tab: reconciliation snapshot + audit-trail policy notice. */
export function AdminOverviewTab({ reconciliation }: { reconciliation: AdminReconciliationData }) {
  const t = useTranslations('admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="overview-tab-content">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-200 flex items-center justify-between">
          <span>{t('reconciliationTitle')}</span>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              reconciliation.isBalanced
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {reconciliation.isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('totalDebits')}</p>
            <p className="text-sm font-mono font-bold text-slate-200 mt-1">
              {reconciliation.totalDebits} BDT
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('totalCredits')}</p>
            <p className="text-sm font-mono font-bold text-slate-200 mt-1">
              {reconciliation.totalCredits} BDT
            </p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-400">{t('discrepancy')}</p>
            <p
              className={`text-sm font-mono font-bold mt-1 ${
                reconciliation.discrepancy === '0' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {reconciliation.discrepancy}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-200">{t('auditTrailTitle')}</h3>
        <p className="text-xs text-emerald-400 flex items-center space-x-1.5">
          <span>🛡️</span>
          <span>{t('auditRedactedNotice')}</span>
        </p>
        <div className="text-xs text-slate-400 space-y-2">
          <p>• All mutations are recorded to PostgreSQL `audit_logs` table.</p>
          <p>
            • Credentials, passwords, card PANs, and session tokens are automatically sanitized.
          </p>
          <p>• Least-privilege role boundaries enforced at NestJS `RolesGuard` controller level.</p>
        </div>
      </div>
    </div>
  );
}
