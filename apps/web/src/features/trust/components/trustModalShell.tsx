'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Shared dialog chrome for the trust modals (review / safety / replacement):
 * Built on shadcn Dialog & Alert components.
 */
export function TrustModalShell({
  icon,
  title,
  subtitle,
  headerExtra,
  maxWidth = 520,
  onClose,
  closeLabel = 'Close',
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  maxWidth?: number;
  onClose: () => void;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={{ maxWidth: `${maxWidth}px` }}
        className="w-full p-6 rounded-2xl bg-card border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        aria-label={closeLabel}
      >
        <DialogHeader className="border-b border-border/70 pb-3 text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
          </div>
          {subtitle && (
            <DialogDescription className="text-xs text-muted-foreground">
              {subtitle}
            </DialogDescription>
          )}
          {headerExtra}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function TrustFormAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success';
  children: React.ReactNode;
}) {
  if (tone === 'error') {
    return (
      <Alert variant="destructive" className="mb-3.5 p-3 text-xs font-medium">
        <AlertDescription className="flex items-center gap-1.5">
          <span>⚠️</span>
          <span>{children}</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-3.5 p-3 text-xs font-medium bg-primary-soft border border-primary/25 text-primary-soft-foreground">
      <AlertDescription className="flex items-center gap-1.5">
        <span>✓</span>
        <span>{children}</span>
      </AlertDescription>
    </Alert>
  );
}
