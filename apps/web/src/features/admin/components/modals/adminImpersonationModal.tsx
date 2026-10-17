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
  Input,
  Button,
  Alert,
  AlertDescription,
} from '@/components/ui';

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md w-full space-y-4"
        data-testid="impersonate-modal"
      >
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-bold text-warning-soft-foreground">
            {t('impersonationBadge')}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Target User: <span className="font-semibold text-foreground">{user.displayName}</span> ({user.id})
          </DialogDescription>
        </DialogHeader>

        <Alert className="rounded-xl border-warning/40 bg-warning/10 text-warning-soft-foreground">
          <AlertDescription className="text-xs font-medium">
            {t('impersonationWarning')}
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label htmlFor="impersonate-reason" className="text-xs font-medium text-foreground">
            Operational Justification *
          </Label>
          <Textarea
            id="impersonate-reason"
            rows={2}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="State explicit customer support ticket or bug reference..."
            data-testid="impersonate-reason-textarea"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="impersonate-duration" className="text-xs font-medium text-foreground">
            Session Duration (Max 15 min)
          </Label>
          <Input
            id="impersonate-duration"
            type="number"
            min={1}
            max={15}
            value={minutes}
            onChange={(e) => onMinutesChange(Number(e.target.value))}
            className="w-24"
            data-testid="impersonate-duration-input"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="warning"
            size="sm"
            disabled={!reason.trim()}
            onClick={onConfirm}
            data-testid="confirm-impersonation-btn"
          >
            {t('triggerImpersonation')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
