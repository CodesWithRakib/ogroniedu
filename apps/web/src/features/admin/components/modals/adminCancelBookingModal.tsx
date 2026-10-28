import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminBookingItem } from '../../types/admin.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
  Textarea,
  Checkbox,
  Button,
} from '@/components/ui';

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md w-full flex flex-col gap-4"
        data-testid="cancel-booking-modal"
      >
        <DialogHeader className="text-left flex flex-col gap-1">
          <DialogTitle className="text-lg font-bold text-destructive">
            {t('cancelIntervention')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Booking: <span className="font-semibold text-foreground">{booking.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason" className="text-xs font-medium text-foreground">
            {t('cancelReasonLabel')} *
          </Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State administrative reason for intervention..."
            data-testid="cancel-reason-textarea"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="refund-escrow"
            checked={refundEscrow}
            onCheckedChange={(checked) => onRefundChange(Boolean(checked))}
            data-testid="refund-escrow-checkbox"
          />
          <Label
            htmlFor="refund-escrow"
            className="text-xs text-foreground cursor-pointer font-normal"
          >
            {t('refundEscrow')}
          </Label>
        </div>

        <div className="flex justify-end flex items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!reason.trim()}
            onClick={onConfirm}
            data-testid="confirm-cancel-booking-btn"
          >
            {t('confirmCancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
