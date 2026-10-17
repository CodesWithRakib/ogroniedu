'use client';

import { useTranslations } from 'next-intl';
import type { AdminReconciliationData } from '../../types/admin.types';

export function AdminReconciliationTab({
  reconciliation,
  onRunAudit,
}: {
  reconciliation: AdminReconciliationData;
  onRunAudit: () => void;
}) {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6" data-testid="reconciliation-tab-content">
      <div className="bg-card border border-border/70 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{t('reconciliationTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Continuous ledger reconciliation across bank settlement and student escrow
            </p>
          </div>
          <button
            onClick={onRunAudit}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold shadow-xs transition"
            data-testid="rerun-audit-btn"
          >
            {t('runAudit')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {reconciliation.accounts.map((acc) => (
            <div
              key={acc.code}
              className="bg-surface/75 border border-border/70 p-4 rounded-2xl flex justify-between items-center shadow-2xs"
            >
              <div>
                <span className="text-xs font-mono text-muted-foreground">{acc.code}</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{acc.name}</p>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {acc.accountType}
                </span>
              </div>
              <div className="text-right">
                <p className="text-base font-mono font-bold text-primary ">
                  {acc.balance} BDT
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
