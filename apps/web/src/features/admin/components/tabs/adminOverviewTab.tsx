'use client';

import { useTranslations } from 'next-intl';
import type { AdminReconciliationData } from '../../types/admin.types';

/** Overview tab: reconciliation snapshot + audit-trail policy notice. */
export function AdminOverviewTab({ reconciliation }: { reconciliation: AdminReconciliationData }) {
  const t = useTranslations('admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="overview-tab-content">
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-foreground flex items-center justify-between">
          <span>{t('reconciliationTitle')}</span>
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              reconciliation.isBalanced
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            {reconciliation.isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
            <p className="text-sm font-mono font-bold text-foreground mt-1">
              {reconciliation.totalDebits} BDT
            </p>
          </div>
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
            <p className="text-sm font-mono font-bold text-foreground mt-1">
              {reconciliation.totalCredits} BDT
            </p>
          </div>
          <div className="bg-surface/75 p-3.5 rounded-2xl border border-border/70 shadow-2xs">
            <p className="text-xs text-muted-foreground font-medium">{t('discrepancy')}</p>
            <p
              className={`text-sm font-mono font-bold mt-1 ${
                reconciliation.discrepancy === '0' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {reconciliation.discrepancy}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
        <h3 className="text-base font-bold text-foreground">{t('auditTrailTitle')}</h3>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
          <span>🛡️</span>
          <span>{t('auditRedactedNotice')}</span>
        </p>
        <div className="text-xs text-muted-foreground space-y-2">
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
