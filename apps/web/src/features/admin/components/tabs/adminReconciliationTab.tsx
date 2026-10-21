'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatBDTMinor } from '@/lib/format';
import type { Locale } from '@/lib/i18n';
import type { AdminReconciliationData } from '../../types/admin.types';

export function AdminReconciliationTab({
  reconciliation,
  onRunAudit,
  locale = 'bn',
}: {
  reconciliation: AdminReconciliationData;
  onRunAudit: () => void | Promise<void>;
  locale?: Locale;
}) {
  const t = useTranslations('admin');
  const isBn = locale === 'bn';
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      await onRunAudit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isBn
            ? 'রিকনসিলিয়েশন চালানো যায়নি।'
            : 'Could not run reconciliation.',
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="reconciliation-tab-content">
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{t('reconciliationTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isBn
                ? 'ব্যাংক নিষ্পত্তি ও শিক্ষার্থী এসক্রোর দ্বৈত-এন্ট্রি লেজার যাচাই'
                : 'Double-entry ledger checks across bank settlement and student escrow'}
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-500/25 transition disabled:opacity-60 inline-flex items-center gap-1.5"
            data-testid="rerun-audit-btn"
          >
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('runAudit')}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-xs text-destructive-soft-foreground flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface/75 p-3">
            <p className="text-[11px] text-muted-foreground">
              {isBn ? 'মোট ডেবিট' : 'Total debits'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatBDTMinor(reconciliation.totalDebits, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/75 p-3">
            <p className="text-[11px] text-muted-foreground">
              {isBn ? 'মোট ক্রেডিট' : 'Total credits'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatBDTMinor(reconciliation.totalCredits, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/75 p-3">
            <p className="text-[11px] text-muted-foreground">
              {isBn ? 'সমন্বয় অবস্থা' : 'Balance state'}
            </p>
            <p
              className={`text-sm font-bold inline-flex items-center gap-1 ${
                reconciliation.isBalanced ? 'text-success' : 'text-destructive'
              }`}
            >
              {reconciliation.isBalanced ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {reconciliation.isBalanced
                ? isBn
                  ? 'সমন্বিত'
                  : 'Balanced'
                : isBn
                  ? `অসঙ্গতি: ${formatBDTMinor(reconciliation.discrepancy, locale)}`
                  : `Discrepancy: ${formatBDTMinor(reconciliation.discrepancy, locale)}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {reconciliation.accounts.map((acc) => (
            <div
              key={acc.code}
              className="bg-surface/75 border border-border p-4 rounded-2xl flex justify-between items-center"
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
                  {formatBDTMinor(acc.balance, locale)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {reconciliation.accounts.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isBn
              ? 'কোনো লেজার অ্যাকাউন্ট পাওয়া যায়নি।'
              : 'No ledger accounts are available yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
