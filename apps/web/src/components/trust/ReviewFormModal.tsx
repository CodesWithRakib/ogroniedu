'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trustModalShell';
import { StarSelector } from '@/features/trust/components/starSelector';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { ReviewFormModalProps } from '@/features/trust/types/trust.types';

export type { ReviewFormModalProps } from '@/features/trust/types/trust.types';

export function ReviewFormModal({
  bookingId,
  tutorName,
  isOpen,
  onClose,
  onSubmitSuccess,
  onSubmitReview,
}: ReviewFormModalProps) {
  const t = useTranslations('trust');
  const locale = (useLocale() === 'bn' ? 'bn' : 'en') as 'bn' | 'en';
  const [rating, setRating] = useState<number>(5);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [teachingClarity, setTeachingClarity] = useState<number>(5);
  const [subjectMastery, setSubjectMastery] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const submit = useModalSubmit<unknown>({
    successMessage: t('reviewSubmitted'),
    fallbackError: 'An error occurred while submitting review.',
    closeDelayMs: 1500,
    onClose,
    onSuccess: onSubmitSuccess,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      submit.setErrorMsg('Please write a constructive comment.');
      return;
    }
    await submit.run(async () => {
      if (!onSubmitReview) {
        throw new Error('Sign in to submit a verified review.');
      }
      return onSubmitReview({
        bookingId,
        rating,
        punctualityRating: punctuality,
        teachingClarityRating: teachingClarity,
        subjectMasteryRating: subjectMastery,
        comment,
      });
    });
  };

  return (
    <TrustModalShell
      icon="⭐"
      title={t('writeReview')}
      closeLabel={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
      headerExtra={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{tutorName}</span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              fontWeight: 600,
              border: '1px solid #a7f3d0',
            }}
          >
            ✓ {t('verifiedBooking')}
          </span>
        </span>
      }
      onClose={onClose}
    >
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.8rem',
          color: '#1e40af',
          lineHeight: 1.4,
        }}
      >
        ℹ️ {t('antiSelfReviewNotice')}
      </div>

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit}>
        <StarSelector
          label={t('overallRating')}
          value={rating}
          onChange={setRating}
          locale={locale}
        />
        <StarSelector
          label={t('punctuality')}
          value={punctuality}
          onChange={setPunctuality}
          locale={locale}
        />
        <StarSelector
          label={t('teachingClarity')}
          value={teachingClarity}
          onChange={setTeachingClarity}
          locale={locale}
        />
        <StarSelector
          label={t('subjectMastery')}
          value={subjectMastery}
          onChange={setSubjectMastery}
          locale={locale}
        />

        <div style={{ marginTop: '16px', marginBottom: '20px' }}>
          <label
            htmlFor="review-comment"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '6px',
              color: '#334155',
            }}
          >
            {t('writeReview')}
          </label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={2000}
            placeholder={t('commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '4px',
            }}
          >
            {comment.length} / 2000
          </div>
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
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: submit.isSubmitting ? 'not-allowed' : 'pointer',
              opacity: submit.isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
            }}
          >
            {submit.isSubmitting ? 'Submitting...' : t('submitReview')}
          </button>
        </div>
      </form>
    </TrustModalShell>
  );
}
