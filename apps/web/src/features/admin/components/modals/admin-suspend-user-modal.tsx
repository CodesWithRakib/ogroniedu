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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-bold text-rose-400">{t('suspendModalTitle')}</h3>
        <p className="text-xs text-slate-400">
          Target User: <span className="font-semibold text-slate-200">{user.displayName}</span> (
          {user.id})
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {t('suspendReasonLabel')} *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State specific operational or safety violations..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            data-testid="suspend-reason-textarea"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          >
            {tCommon('cancel')}
          </button>
          <button
            disabled={!reason.trim()}
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            data-testid="confirm-suspend-btn"
          >
            {t('suspendConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
