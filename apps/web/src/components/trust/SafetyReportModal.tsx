'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trust-modal-shell';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { SafetyReportModalProps } from '@/features/trust/types/trust.types';

export type { SafetyReportModalProps } from '@/features/trust/types/trust.types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  backgroundColor: '#ffffff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '6px',
  color: '#334155',
};

export function SafetyReportModal({
  reportedUserId,
  bookingId,
  isOpen,
  onClose,
  onReportSuccess,
  onSubmitReport,
}: SafetyReportModalProps) {
  const t = useTranslations('trust');
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
    >
      {isUrgent && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#be123c',
            lineHeight: 1.45,
          }}
        >
          ⚠️ {t('urgentEscalationNotice')}
        </div>
      )}

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label htmlFor="incident-category" style={labelStyle}>
              {t('category')}
            </label>
            <select
              id="incident-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="harassment">{t('categoryHarassment')}</option>
              <option value="child_safety">{t('categoryChildSafety')}</option>
              <option value="inappropriate_content">{t('categoryInappropriate')}</option>
              <option value="off_platform_payment">{t('categoryOffPlatform')}</option>
              <option value="fraud_billing">{t('categoryFraud')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="incident-severity" style={labelStyle}>
              {t('severity')}
            </label>
            <select
              id="incident-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={inputStyle}
            >
              <option value="low">{t('severityLow')}</option>
              <option value="medium">{t('severityMedium')}</option>
              <option value="high">{t('severityHigh')}</option>
              <option value="critical">{t('severityCritical')}</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="incident-description" style={labelStyle}>
            Description of Incident
          </label>
          <textarea
            id="incident-description"
            rows={4}
            maxLength={5000}
            placeholder="Describe what occurred, dates, and any relevant details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              background: isUrgent
                ? 'linear-gradient(135deg, #e11d48, #be123c)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: submit.isSubmitting ? 'not-allowed' : 'pointer',
              opacity: submit.isSubmitting ? 0.7 : 1,
            }}
          >
            {submit.isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </TrustModalShell>
  );
}
