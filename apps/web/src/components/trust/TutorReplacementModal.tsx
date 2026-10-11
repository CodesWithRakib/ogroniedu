'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface TutorReplacementModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestSuccess?: (caseData: unknown) => void;
  onSubmitReplacement?: (payload: {
    bookingId: string;
    reasonCode: string;
    explanation: string;
  }) => Promise<unknown>;
}

export function TutorReplacementModal({
  bookingId,
  isOpen,
  onClose,
  onRequestSuccess,
  onSubmitReplacement,
}: TutorReplacementModalProps) {
  const t = useTranslations('trust');
  const [reasonCode, setReasonCode] = useState<string>('trial_dissatisfaction');
  const [explanation, setExplanation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setErrorMsg('Please provide a short explanation for the replacement request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!onSubmitReplacement) {
        throw new Error('Sign in to request a tutor replacement.');
      }
      const caseData = await onSubmitReplacement({
        bookingId,
        reasonCode,
        explanation,
      });

      setSuccessMsg(
        'Your replacement guarantee claim has been registered. Our matching team will assign a replacement.',
      );
      if (onRequestSuccess) {
        onRequestSuccess(caseData);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error submitting replacement request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {t('replacementTitle')}
              </h2>
            </div>
            <p
              style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}
            >
              {t('replacementSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ✕
          </button>
        </div>

        {/* SLA Guarantee Card */}
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

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '14px',
              border: '1px solid #fecaca',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              color: '#059669',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '14px',
              border: '1px solid #a7f3d0',
            }}
          >
            ✓ {successMsg}
          </div>
        )}

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)',
              }}
            >
              {isSubmitting ? 'Submitting...' : t('submitReplacement')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
