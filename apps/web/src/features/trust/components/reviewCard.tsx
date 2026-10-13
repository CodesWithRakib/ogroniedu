'use client';

import { useTranslations } from 'next-intl';
import type { ReviewItem } from '../types/trust.types';

/** One review card: ratings, criteria tags, comment, tutor response, reply thread. */
export function ReviewCard({
  review,
  isCurrentTutor,
  replying,
  replyText,
  isPostingReply,
  replyError,
  onReplyTextChange,
  onOpenReply,
  onCancelReply,
  onPostReply,
}: {
  review: ReviewItem;
  isCurrentTutor: boolean;
  replying: boolean;
  replyText: string;
  isPostingReply: boolean;
  replyError: string | null;
  onReplyTextChange: (text: string) => void;
  onOpenReply: () => void;
  onCancelReply: () => void;
  onPostReply: () => void;
}) {
  const t = useTranslations('trust');
  const rev = review;

  return (
    <div
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

      {isCurrentTutor && !rev.tutorResponse && (
        <div style={{ marginTop: '12px' }}>
          {replying ? (
            <div style={{ marginTop: '8px' }}>
              {replyError && (
                <p role="alert" style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                  {replyError}
                </p>
              )}
              <textarea
                rows={3}
                maxLength={1000}
                placeholder={t('replyPlaceholder')}
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
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
                  onClick={onCancelReply}
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
                  onClick={onPostReply}
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
              onClick={onOpenReply}
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
  );
}
