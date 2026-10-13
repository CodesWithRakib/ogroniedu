'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trustModalShell';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { TutorReplacementModalProps } from '@/features/trust/types/trust.types';

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
      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '18px',
          fontSize: '0.85rem',
          color: '#166534',
          lineHeight: 1.45,
        }}
      >
        ✓ {t('slaNotice')}
      </div>

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="reason-code"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '6px',
              color: '#334155',
            }}
          >
            {t('reasonCode')}
          </label>
          <select
            id="reason-code"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
            }}
          >
            <option value="trial_dissatisfaction">{t('reasonTrial')}</option>
            <option value="frequent_tutor_cancellation">{t('reasonCancellation')}</option>
            <option value="tutor_no_show">{t('reasonNoShow')}</option>
            <option value="teaching_mismatch">{t('reasonMismatch')}</option>
            <option value="unprofessional_conduct">{t('reasonConduct')}</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="replacement-explanation"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '6px',
              color: '#334155',
            }}
          >
            Details / Explanation
          </label>
          <textarea
            id="replacement-explanation"
            rows={4}
            maxLength={3000}
            placeholder={t('explanationPlaceholder')}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submit.isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submit.isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: submit.isSubmitting ? 'not-allowed' : 'pointer',
              opacity: submit.isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)',
            }}
          >
            {submit.isSubmitting ? 'Submitting...' : t('submitReplacement')}
          </button>
        </div>
      </form>
    </TrustModalShell>
  );
}
