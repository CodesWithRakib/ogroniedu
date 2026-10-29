'use client';

import { useTranslations } from 'next-intl';
import type { AdminReconciliationData } from '../../types/admin.types';

/** Overview tab: reconciliation snapshot + audit-trail policy notice. */
export function AdminOverviewTab({ reconciliation }: { reconciliation: AdminReconciliationData }) {
  const t = useTranslations('admin');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="overview-tab-content">
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <h3 className="text-base font-bold text-foreground flex items-center justify-between">
          <span>{t('reconciliationTitle')}</span>
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              reconciliation.isBalanced
                ? 'bg-primary/15 text-primary  border-primary/30'
                : 'bg-destructive/15 text-destructive  border-destructive/30'
            }`}
          >
            {reconciliation.isBalanced ? t('statusBalanced') : t('statusDiscrepancy')}
          </span>
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-surface p-3.5 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground font-medium">{t('totalDebits')}</p>
            <p className="text-sm font-mono font-bold text-foreground mt-1">
              {reconciliation.totalDebits} BDT
            </p>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground font-medium">{t('totalCredits')}</p>
            <p className="text-sm font-mono font-bold text-foreground mt-1">
              {reconciliation.totalCredits} BDT
            </p>
          </div>
          <div className="bg-surface p-3.5 rounded-xl border border-border">
            <p className="text-xs text-muted-foreground font-medium">{t('discrepancy')}</p>
            <p
              className={`text-sm font-mono font-bold mt-1 ${
                reconciliation.discrepancy === '0' ? 'text-primary ' : 'text-destructive '
              }`}
            >
              {reconciliation.discrepancy}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 flex flex-col gap-3">
        <h3 className="text-base font-bold text-foreground">{t('auditTrailTitle')}</h3>
        <p className="text-xs text-primary  font-semibold flex items-center gap-1.5">
          <span>🛡️</span>
          <span>{t('auditRedactedNotice')}</span>
        </p>
        <div className="text-xs text-muted-foreground flex flex-col gap-2">
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
