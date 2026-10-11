'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface ReviewFormModalProps {
  bookingId: string;
  tutorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (review: unknown) => void;
  onSubmitReview?: (payload: {
    bookingId: string;
    rating: number;
    punctualityRating: number;
    teachingClarityRating: number;
    subjectMasteryRating: number;
    comment: string;
  }) => Promise<unknown>;
}

export function ReviewFormModal({
  bookingId,
  tutorName,
  isOpen,
  onClose,
  onSubmitSuccess,
  onSubmitReview,
}: ReviewFormModalProps) {
  const t = useTranslations('trust');
  const [rating, setRating] = useState<number>(5);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [teachingClarity, setTeachingClarity] = useState<number>(5);
  const [subjectMastery, setSubjectMastery] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please write a constructive comment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!onSubmitReview) {
        throw new Error('Sign in to submit a verified review.');
      }
      const saved = await onSubmitReview({
        bookingId,
        rating,
        punctualityRating: punctuality,
        teachingClarityRating: teachingClarity,
        subjectMasteryRating: subjectMastery,
        comment,
      });

      setSuccessMsg(t('reviewSubmitted'));
      if (onSubmitSuccess) {
        onSubmitSuccess(saved);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred while submitting review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarSelector = (label: string, value: number, onChange: (val: number) => void) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}
        >
          {label}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
          {'★'.repeat(value)}
          {'☆'.repeat(5 - value)} ({value}/5)
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              flex: 1,
              padding: '6px',
              border:
                star <= value ? '1px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: star <= value ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              color: star <= value ? '#f59e0b' : 'var(--text-muted, #94a3b8)',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'all 0.15s ease',
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

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
          backgroundColor: 'var(--card-bg, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, #e2e8f0)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t('writeReview')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
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
            </div>
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

        {/* Anti-Self Review Disclaimer Banner */}
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
          {renderStarSelector(t('overallRating'), rating, setRating)}
          {renderStarSelector(t('punctuality'), punctuality, setPunctuality)}
          {renderStarSelector(t('teachingClarity'), teachingClarity, setTeachingClarity)}
          {renderStarSelector(t('subjectMastery'), subjectMastery, setSubjectMastery)}

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
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
              }}
            >
              {isSubmitting ? 'Submitting...' : t('submitReview')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
