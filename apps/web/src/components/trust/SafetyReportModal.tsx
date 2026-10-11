'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface SafetyReportModalProps {
  reportedUserId?: string;
  bookingId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSuccess?: (report: unknown) => void;
  onSubmitReport?: (payload: {
    reportedUserId?: string;
    bookingId?: string;
    category: string;
    severity: string;
    description: string;
  }) => Promise<unknown>;
}

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isUrgent = category === 'child_safety' || severity === 'critical';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setErrorMsg('Please describe the incident in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!onSubmitReport) {
        throw new Error('Sign in to file a safety report.');
      }
      const report = await onSubmitReport({
        reportedUserId,
        bookingId,
        category,
        severity,
        description,
      });

      setSuccessMsg(t('reportSubmitted'));
      if (onReportSuccess) {
        onReportSuccess(report);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error filing report.');
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
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
              <span style={{ fontSize: '1.25rem' }}>🚨</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {t('safetyReportTitle')}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {t('safetyReportSubtitle')}
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

        {/* Emergency Escalation Notice */}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label
                htmlFor="incident-category"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#334155',
                }}
              >
                {t('category')}
              </label>
              <select
                id="incident-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="harassment">{t('categoryHarassment')}</option>
                <option value="child_safety">{t('categoryChildSafety')}</option>
                <option value="inappropriate_content">{t('categoryInappropriate')}</option>
                <option value="off_platform_payment">{t('categoryOffPlatform')}</option>
                <option value="fraud_billing">{t('categoryFraud')}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="incident-severity"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#334155',
                }}
              >
                {t('severity')}
              </label>
              <select
                id="incident-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="low">{t('severityLow')}</option>
                <option value="medium">{t('severityMedium')}</option>
                <option value="high">{t('severityHigh')}</option>
                <option value="critical">{t('severityCritical')}</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="incident-description"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#334155',
              }}
            >
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
                background: isUrgent
                  ? 'linear-gradient(135deg, #e11d48, #be123c)'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
