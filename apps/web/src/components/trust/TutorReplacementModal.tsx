'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trustModalShell';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { TutorReplacementModalProps } from '@/features/trust/types/trust.types';
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

export type { TutorReplacementModalProps } from '@/features/trust/types/trust.types';

export function TutorReplacementModal({
  bookingId,
  isOpen,
  onClose,
  onRequestSuccess,
  onSubmitReplacement,
}: TutorReplacementModalProps) {
  const t = useTranslations('trust');
  const locale = useLocale();
  const [reasonCode, setReasonCode] = useState<string>('trial_dissatisfaction');
  const [explanation, setExplanation] = useState<string>('');
  const submit = useModalSubmit<unknown>({
    successMessage:
      'Your replacement guarantee claim has been registered. Our matching team will assign a replacement.',
    fallbackError: 'Error submitting replacement request.',
    closeDelayMs: 1800,
    onClose,
    onSuccess: onRequestSuccess,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      submit.setErrorMsg('Please provide a short explanation for the replacement request.');
      return;
    }
    await submit.run(async () => {
      if (!onSubmitReplacement) {
        throw new Error('Sign in to request a tutor replacement.');
      }
      return onSubmitReplacement({ bookingId, reasonCode, explanation });
    });
  };

  return (
    <TrustModalShell
      icon="🛡️"
      title={t('replacementTitle')}
      subtitle={t('replacementSubtitle')}
      maxWidth={540}
      onClose={onClose}
      closeLabel={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
    >
      <div className="rounded-xl border border-success/30 bg-primary/10 p-3 mb-4 text-xs text-primary leading-relaxed font-medium">
        ✓ {t('slaNotice')}
      </div>

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="reason-code"
            className="text-xs font-semibold text-muted-foreground"
          >
            {t('reasonCode')}
          </Label>
          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger id="reason-code" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial_dissatisfaction">{t('reasonTrial')}</SelectItem>
              <SelectItem value="frequent_tutor_cancellation">{t('reasonCancellation')}</SelectItem>
              <SelectItem value="tutor_no_show">{t('reasonNoShow')}</SelectItem>
              <SelectItem value="teaching_mismatch">{t('reasonMismatch')}</SelectItem>
              <SelectItem value="unprofessional_conduct">{t('reasonConduct')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="replacement-explanation"
            className="text-xs font-semibold text-muted-foreground"
          >
            Details / Explanation
          </Label>
          <Textarea
            id="replacement-explanation"
            rows={4}
            maxLength={3000}
            placeholder={t('explanationPlaceholder')}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
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
            variant="primary"
            size="sm"
            isLoading={submit.isSubmitting}
          >
            {submit.isSubmitting ? 'Submitting...' : t('submitReplacement')}
          </Button>
        </div>
      </form>
    </TrustModalShell>
  );
}
