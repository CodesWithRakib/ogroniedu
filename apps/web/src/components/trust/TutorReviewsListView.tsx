'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReviewCard } from '@/features/trust/components/reviewCard';
import type { ReviewItem, TutorReviewsListViewProps } from '@/features/trust/types/trust.types';

export type { ReviewItem, TutorReviewsListViewProps } from '@/features/trust/types/trust.types';

export function TutorReviewsListView({
  tutorId,
  reviews,
  currentUserId,
  isCurrentTutor = false,
  onReply,
}: TutorReviewsListViewProps) {
  void tutorId;
  void currentUserId;
  const t = useTranslations('trust');
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isPostingReply, setIsPostingReply] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [localReviews, setLocalReviews] = useState<ReviewItem[]>(reviews);

  React.useEffect(() => {
    setLocalReviews(reviews);
  }, [reviews]);

  const handlePostReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsPostingReply(true);
    setReplyError(null);

    try {
      if (!onReply) {
        throw new Error('Sign in as the tutor to reply to reviews.');
      }
      const updated = (await onReply(reviewId, replyText.trim())) as Partial<ReviewItem> | null;

      setLocalReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...updated } : r)));
      setActiveReplyReviewId(null);
      setReplyText('');
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsPostingReply(false);
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--foreground)' }}>
        {t('reviewsTitle')} ({localReviews.length})
      </h3>

      {localReviews.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: 'var(--muted-foreground)',
            fontSize: '0.9rem',
          }}
        >
          No reviews yet. Completed session students and guardians will be able to leave feedback
          here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {localReviews.map((rev) => (
            <ReviewCard
              key={rev.id}
              review={rev}
              isCurrentTutor={isCurrentTutor}
              replying={activeReplyReviewId === rev.id}
              replyText={replyText}
              isPostingReply={isPostingReply}
              replyError={activeReplyReviewId === rev.id ? replyError : null}
              onReplyTextChange={setReplyText}
              onOpenReply={() => setActiveReplyReviewId(rev.id)}
              onCancelReply={() => setActiveReplyReviewId(null)}
              onPostReply={() => handlePostReply(rev.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
