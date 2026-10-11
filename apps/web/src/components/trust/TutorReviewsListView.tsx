'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export interface ReviewItem {
  id: string;
  rating: number;
  punctualityRating?: number | null;
  teachingClarityRating?: number | null;
  subjectMasteryRating?: number | null;
  comment: string;
  isVerifiedBooking: boolean;
  tutorResponse?: string | null;
  tutorRespondedAt?: string | null;
  createdAt: string;
  reviewer?: {
    displayName?: string;
  };
}

export interface TutorReviewsListViewProps {
  tutorId: string;
  reviews: ReviewItem[];
  currentUserId?: string;
  isCurrentTutor?: boolean;
  onReply?: (reviewId: string, reply: string) => Promise<unknown>;
}

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

      setLocalReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...(updated ?? {}) } : r)),
      );
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
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
        {t('reviewsTitle')} ({localReviews.length})
      </h3>

      {localReviews.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '0.9rem',
          }}
        >
          No reviews yet. Completed session students and guardians will be able to leave feedback
          here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {localReviews.map((rev) => (
            <div
              key={rev.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                      {rev.reviewer?.displayName || 'Verified Learner'}
                    </span>
                    {rev.isVerifiedBooking && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        ✓ {t('verifiedBooking')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ color: '#f59e0b', fontSize: '1rem', fontWeight: 700 }}>
                  {'★'.repeat(rev.rating)}
                  {'☆'.repeat(5 - rev.rating)}
                </div>
              </div>

              {/* Criteria Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {rev.punctualityRating && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    ⏱ {t('punctuality')}: {rev.punctualityRating}/5
                  </span>
                )}
                {rev.teachingClarityRating && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    💡 {t('teachingClarity')}: {rev.teachingClarityRating}/5
                  </span>
                )}
                {rev.subjectMasteryRating && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    📚 {t('subjectMastery')}: {rev.subjectMasteryRating}/5
                  </span>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                {rev.comment}
              </p>

              {/* Formal Tutor Response Card */}
              {rev.tutorResponse && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    backgroundColor: '#f8fafc',
                    borderLeft: '4px solid #2563eb',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                    💬 {t('tutorResponse')}
                  </div>
                  <div style={{ color: '#334155', lineHeight: 1.4 }}>{rev.tutorResponse}</div>
                </div>
              )}

              {/* Tutor Rebuttal Action Trigger */}
              {isCurrentTutor && !rev.tutorResponse && (
                <div style={{ marginTop: '12px' }}>
                  {activeReplyReviewId === rev.id ? (
                    <div style={{ marginTop: '8px' }}>
                      {replyError && activeReplyReviewId === rev.id && (
                        <p role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                          {replyError}
                        </p>
                      )}
                      <textarea
                        rows={3}
                        maxLength={1000}
                        placeholder={t('replyPlaceholder')}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '8px',
                          marginTop: '6px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveReplyReviewId(null)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPostingReply}
                          onClick={() => handlePostReply(rev.id)}
                          style={{
                            padding: '4px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isPostingReply ? 'Posting...' : t('postReply')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveReplyReviewId(rev.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + {t('tutorResponse')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
