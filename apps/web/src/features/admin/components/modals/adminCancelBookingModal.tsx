'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminBookingItem } from '../../types/admin.types';

export function AdminCancelBookingModal({
  booking,
  reason,
  refundEscrow,
  onReasonChange,
  onRefundChange,
  onClose,
  onConfirm,
}: {
  booking: AdminBookingItem;
  reason: string;
  refundEscrow: boolean;
  onReasonChange: (value: string) => void;
  onRefundChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      data-testid="cancel-booking-modal"
    >
      <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-rose-500">{t('cancelIntervention')}</h3>
        <p className="text-xs text-muted-foreground">
          Booking: <span className="font-semibold text-foreground">{booking.id}</span>
        </p>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t('cancelReasonLabel')} *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State administrative reason for intervention..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/25"
            data-testid="cancel-reason-textarea"
          />
        </div>
        <label className="flex items-center space-x-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={refundEscrow}
            onChange={(e) => onRefundChange(e.target.checked)}
            className="rounded border-border bg-surface text-primary focus:ring-0"
            data-testid="refund-escrow-checkbox"
          />
          <span>{t('refundEscrow')}</span>
        </label>
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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition"
            data-testid="confirm-cancel-booking-btn"
          >
            {t('confirmCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
