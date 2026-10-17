'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrustModalShell, TrustFormAlert } from '@/features/trust/components/trustModalShell';
import { StarSelector } from '@/features/trust/components/starSelector';
import { useModalSubmit } from '@/features/trust/hooks/use-modal-submit';
import type { ReviewFormModalProps } from '@/features/trust/types/trust.types';
import { Button, Textarea, Label, Badge } from '@/components/ui';

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
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{tutorName}</span>
          <Badge variant="success" className="text-[11px]">
            ✓ {t('verifiedBooking')}
          </Badge>
        </div>
      }
      onClose={onClose}
    >
      <div className="rounded-xl border border-info/40 bg-interactive/10 p-3 mb-4 text-xs text-info-soft-foreground leading-relaxed">
        ℹ️ {t('antiSelfReviewNotice')}
      </div>

      {submit.errorMsg && <TrustFormAlert tone="error">{submit.errorMsg}</TrustFormAlert>}
      {submit.successMsg && <TrustFormAlert tone="success">{submit.successMsg}</TrustFormAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-1.5 pt-2">
          <Label htmlFor="review-comment" className="text-xs font-semibold text-muted-foreground">
            {t('writeReview')}
          </Label>
          <Textarea
            id="review-comment"
            rows={4}
            maxLength={2000}
            placeholder={t('commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {comment.length} / 2000
          </div>
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
          <Button type="submit" size="sm" isLoading={submit.isSubmitting}>
            {submit.isSubmitting ? 'Submitting...' : t('submitReview')}
          </Button>
        </div>
      </form>
    </TrustModalShell>
  );
}
