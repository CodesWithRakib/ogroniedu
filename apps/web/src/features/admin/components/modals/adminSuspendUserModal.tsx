import React from 'react';
import { useTranslations } from 'next-intl';
import type { AdminUserItem } from '../../types/admin.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
  Textarea,
  Button,
} from '@/components/ui';

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full flex flex-col gap-4" data-testid="suspend-modal">
        <DialogHeader className="text-left flex flex-col gap-1">
          <DialogTitle className="text-lg font-bold text-destructive">
            {t('suspendModalTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Target User: <span className="font-semibold text-foreground">{user.displayName}</span> (
            {user.id})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="suspend-reason" className="text-xs font-medium text-foreground">
            {t('suspendReasonLabel')} *
          </Label>
          <Textarea
            id="suspend-reason"
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State specific operational or safety violations..."
            data-testid="suspend-reason-textarea"
          />
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
            data-testid="confirm-suspend-btn"
          >
            {t('suspendConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
