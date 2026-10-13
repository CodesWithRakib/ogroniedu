'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';

/** Cancel dialog: policy notice + reason, delegates persistence to onConfirm. */
export function CancelSessionModal({
  locale,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  locale: Locale;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const dict = getDictionary(locale);
  const [reason, setReason] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onConfirm(reason);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
      data-testid="cancel-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-rose-600 dark:text-rose-400">
            {dict.scheduling?.cancelSession || 'Cancel Session'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Cancelling this session will evaluate the standard cancellation policy window. If
            cancelled more than 24h in advance, full 100% refund is processed.
          </p>

          <div className="space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              {dict.scheduling?.cancelReasonLabel || 'Reason for Cancellation'}
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are cancelling..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              data-testid="cancel-reason-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {dict.common?.cancel || 'Close'}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isSubmitting}
              data-testid="confirm-cancel-btn"
            >
              {dict.scheduling?.confirmCancel || 'Cancel Class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
