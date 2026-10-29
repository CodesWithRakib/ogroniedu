'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="cancel-modal"
        className="bg-card border border-border rounded-xl max-w-md w-full p-6 flex flex-col gap-4 text-left text-card-foreground"
      >
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="font-black text-destructive text-lg">
            {dict.scheduling?.cancelSession || 'Cancel Session'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Cancel session confirmation and reason
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <Alert
            variant="destructive"
            className="p-3 text-xs leading-relaxed bg-destructive/10 border-destructive/30"
          >
            <AlertDescription>
              Cancelling this session will evaluate the standard cancellation policy window. If
              cancelled more than 24h in advance, full 100% refund is processed.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label className="font-semibold text-foreground text-xs">
              {dict.scheduling?.cancelReasonLabel || 'Reason for Cancellation'}
            </Label>
            <Textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are cancelling..."
              className="w-full p-2.5 rounded-xl border border-border bg-card text-foreground text-xs focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:outline-none"
              data-testid="cancel-reason-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl"
            >
              {dict.common?.cancel || 'Close'}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isSubmitting}
              data-testid="confirm-cancel-btn"
              className="rounded-xl font-semibold"
            >
              {dict.scheduling?.confirmCancel || 'Cancel Class'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
