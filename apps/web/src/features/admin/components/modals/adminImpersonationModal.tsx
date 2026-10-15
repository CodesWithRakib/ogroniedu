'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';

export function AdminImpersonationModal({
  user,
  reason,
  minutes,
  onReasonChange,
  onMinutesChange,
  onClose,
  onConfirm,
}: {
  user: AdminUserItem;
  reason: string;
  minutes: number;
  onReasonChange: (value: string) => void;
  onMinutesChange: (value: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      data-testid="impersonate-modal"
    >
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">
          {t('impersonationBadge')}
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl font-medium">
          {t('impersonationWarning')}
        </p>
        <p className="text-xs text-muted-foreground">
          Target User: <span className="font-semibold text-foreground">{user.displayName}</span> (
          {user.id})
        </p>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Operational Justification *
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State explicit customer support ticket or bug reference..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/25"
            data-testid="impersonate-reason-textarea"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Session Duration (Max 15 min)
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="w-24 px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            data-testid="impersonate-duration-input"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl text-xs font-semibold transition"
          >
            {tCommon('cancel')}
          </button>
          <button
            disabled={!reason.trim()}
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition"
            data-testid="confirm-impersonation-btn"
          >
            {t('triggerImpersonation')}
          </button>
        </div>
      </div>
    </div>
  );
}
