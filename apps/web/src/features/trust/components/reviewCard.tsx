'use client';

import { useTranslations } from 'next-intl';
import type { ReviewItem } from '../types/trust.types';
import { Card, Badge, Textarea, Button, Alert, AlertDescription } from '@/components/ui';

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
    <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">
              {rev.reviewer?.displayName || 'Verified Learner'}
            </span>
            {rev.isVerifiedBooking && (
              <Badge variant="success" className="text-[10px]">
                ✓ {t('verifiedBooking')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(rev.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="text-amber-500 font-bold tracking-wider text-sm">
          {'★'.repeat(rev.rating)}
          {'☆'.repeat(5 - rev.rating)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rev.punctualityRating && (
          <Badge variant="secondary" className="text-[11px] font-normal">
            ⏱ {t('punctuality')}: {rev.punctualityRating}/5
          </Badge>
        )}
        {rev.teachingClarityRating && (
          <Badge variant="secondary" className="text-[11px] font-normal">
            💡 {t('teachingClarity')}: {rev.teachingClarityRating}/5
          </Badge>
        )}
        {rev.subjectMasteryRating && (
          <Badge variant="secondary" className="text-[11px] font-normal">
            📚 {t('subjectMastery')}: {rev.subjectMasteryRating}/5
          </Badge>
        )}
      </div>

      <p className="text-xs text-foreground/90 leading-relaxed">{rev.comment}</p>

      {rev.tutorResponse && (
        <div className="p-3.5 bg-muted/60 border-l-4 border-primary rounded-r-xl text-xs space-y-1">
          <div className="font-bold text-primary flex items-center gap-1.5">
            <span>💬</span>
            <span>{t('tutorResponse')}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{rev.tutorResponse}</p>
        </div>
      )}

      {isCurrentTutor && !rev.tutorResponse && (
        <div className="pt-1">
          {replying ? (
            <div className="space-y-2">
              {replyError && (
                <Alert variant="destructive" className="py-2 px-3 rounded-xl">
                  <AlertDescription className="text-xs">{replyError}</AlertDescription>
                </Alert>
              )}
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder={t('replyPlaceholder')}
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                className="text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancelReply}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPostingReply}
                  onClick={onPostReply}
                  isLoading={isPostingReply}
                >
                  {isPostingReply ? 'Posting...' : t('postReply')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenReply}
              className="text-primary hover:text-primary hover:bg-primary-soft text-xs h-8 px-2 font-semibold"
            >
              + {t('tutorResponse')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
