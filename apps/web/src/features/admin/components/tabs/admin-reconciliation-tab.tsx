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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-200">{t('reconciliationTitle')}</h3>
            <p className="text-xs text-slate-400">
              Continuous ledger reconciliation across bank settlement and student escrow
            </p>
          </div>
          <button
            onClick={onRunAudit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            data-testid="rerun-audit-btn"
          >
            {t('runAudit')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {reconciliation.accounts.map((acc) => (
            <div
              key={acc.code}
              className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <span className="text-xs font-mono text-slate-500">{acc.code}</span>
                <p className="text-sm font-semibold text-slate-200">{acc.name}</p>
                <span className="text-[10px] text-slate-400 capitalize">{acc.accountType}</span>
              </div>
              <div className="text-right">
                <p className="text-base font-mono font-bold text-teal-400">{acc.balance} BDT</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
