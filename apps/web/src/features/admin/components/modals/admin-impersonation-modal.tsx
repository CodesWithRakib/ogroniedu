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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-bold text-amber-400">{t('impersonationBadge')}</h3>
        <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
          {t('impersonationWarning')}
        </p>
        <p className="text-xs text-slate-400">
          Target User: <span className="font-semibold text-slate-200">{user.displayName}</span> (
          {user.id})
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Operational Justification *
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State explicit customer support ticket or bug reference..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            data-testid="impersonate-reason-textarea"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Session Duration (Max 15 min)
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
            data-testid="impersonate-duration-input"
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
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            data-testid="confirm-impersonation-btn"
          >
            {t('triggerImpersonation')}
          </button>
        </div>
      </div>
    </div>
  );
}
