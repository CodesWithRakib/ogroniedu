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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-muted backdrop-blur-xs animate-in fade-in"
      data-testid="cancel-modal"
    >
      <div className="bg-white  border border-border  rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border  pb-3">
          <h3 className="font-bold text-destructive ">
            {dict.scheduling?.cancelSession || 'Cancel Session'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground rounded-lg p-1"
            aria-label={locale === 'bn' ? 'মোডাল বন্ধ করুন' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-muted-foreground  leading-relaxed">
            Cancelling this session will evaluate the standard cancellation policy window. If
            cancelled more than 24h in advance, full 100% refund is processed.
          </p>

          <div className="space-y-1">
            <label className="font-medium text-foreground ">
              {dict.scheduling?.cancelReasonLabel || 'Reason for Cancellation'}
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are cancelling..."
              className="w-full p-2.5 rounded-xl border border-border  bg-white  text-foreground "
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
