'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trustModalShell';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { SafetyReportModalProps } from '@/features/trust/types/trust.types';
import {
  Label,
  Textarea,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

export type { SafetyReportModalProps } from '@/features/trust/types/trust.types';

export function SafetyReportModal({
  reportedUserId,
  bookingId,
  isOpen,
  onClose,
  onReportSuccess,
  onSubmitReport,
}: SafetyReportModalProps) {
  const t = useTranslations('trust');
  const locale = useLocale();
  const [category, setCategory] = useState<string>('harassment');
  const [severity, setSeverity] = useState<string>('medium');
  const [description, setDescription] = useState<string>('');
  const submit = useModalSubmit<unknown>({
    successMessage: t('reportSubmitted'),
    fallbackError: 'Error filing report.',
    closeDelayMs: 1800,
    onClose,
    onSuccess: onReportSuccess,
  });

  if (!isOpen) return null;

  const isUrgent = category === 'child_safety' || severity === 'critical';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      submit.setErrorMsg('Please describe the incident in at least 10 characters.');
      return;
    }
    await submit.run(async () => {
      if (!onSubmitReport) {
        throw new Error('Sign in to file a safety report.');
      }
      return onSubmitReport({ reportedUserId, bookingId, category, severity, description });
    });
  };

  return (
    <TrustModalShell
      icon="🚨"
      title={t('safetyReportTitle')}
      subtitle={t('safetyReportSubtitle')}
      maxWidth={540}
      onClose={onClose}
      closeLabel={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
    >
      {isUrgent && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 mb-4 text-xs text-destructive leading-relaxed font-medium">
          ⚠️ {t('urgentEscalationNotice')}
        </div>
      )}

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="incident-category"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t('category')}
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="incident-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harassment">{t('categoryHarassment')}</SelectItem>
                <SelectItem value="child_safety">{t('categoryChildSafety')}</SelectItem>
                <SelectItem value="inappropriate_content">{t('categoryInappropriate')}</SelectItem>
                <SelectItem value="off_platform_payment">{t('categoryOffPlatform')}</SelectItem>
                <SelectItem value="fraud_billing">{t('categoryFraud')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="incident-severity"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t('severity')}
            </Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="incident-severity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('severityLow')}</SelectItem>
                <SelectItem value="medium">{t('severityMedium')}</SelectItem>
                <SelectItem value="high">{t('severityHigh')}</SelectItem>
                <SelectItem value="critical">{t('severityCritical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="incident-description"
            className="text-xs font-semibold text-muted-foreground"
          >
            Description of Incident
          </Label>
          <Textarea
            id="incident-description"
            rows={4}
            maxLength={5000}
            placeholder="Describe what occurred, dates, and any relevant details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submit.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isUrgent ? 'destructive' : 'primary'}
            size="sm"
            isLoading={submit.isSubmitting}
          >
            {submit.isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </TrustModalShell>
  );
}
