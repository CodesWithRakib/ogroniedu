'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';

export function AdminSuspendUserModal({
  user,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  user: AdminUserItem;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      data-testid="suspend-modal"
    >
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-destructive">{t('suspendModalTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          Target User: <span className="font-semibold text-foreground">{user.displayName}</span> (
          {user.id})
        </p>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t('suspendReasonLabel')} *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State specific operational or safety violations..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/25"
            data-testid="suspend-reason-textarea"
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
            className="px-4 py-2 bg-destructive hover:bg-destructive/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition"
            data-testid="confirm-suspend-btn"
          >
            {t('suspendConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
