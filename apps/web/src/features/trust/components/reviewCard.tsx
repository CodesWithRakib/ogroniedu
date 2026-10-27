'use client';

import React from 'react';
import type { ReviewItem } from '../types/trust.types';
import { Card, Badge, Textarea, Button, Alert, AlertDescription } from '@/components/ui';
import { CheckCircle2, MessageSquare, Star } from 'lucide-react';

export interface ReviewCardProps {
  review: ReviewItem;
  isCurrentTutor?: boolean;
  replying?: boolean;
  replyText?: string;
  isPostingReply?: boolean;
  replyError?: string | null;
  locale?: 'bn' | 'en';
  onReplyTextChange?: (text: string) => void;
  onOpenReply?: () => void;
  onCancelReply?: () => void;
  onPostReply?: () => void;
}

/** High-contrast WCAG AAA Review Card with multi-criteria badges and tutor rebuttal */
export function ReviewCard({
  review,
  isCurrentTutor = false,
  replying = false,
  replyText = '',
  isPostingReply = false,
  replyError = null,
  locale = 'bn',
  onReplyTextChange,
  onOpenReply,
  onCancelReply,
  onPostReply,
}: ReviewCardProps) {
  const isBn = locale === 'bn';
  const rev = review;

  const reviewerName =
    (isBn ? rev.reviewerDisplayNameBn : rev.reviewerDisplayNameEn) ||
    rev.reviewerDisplayName ||
    rev.reviewer?.displayName ||
    (isBn ? 'যাচাইকৃত শিক্ষার্থী' : 'Verified Learner');

  const commentText = (isBn ? rev.commentBn : rev.commentEn) || rev.comment;
  const tutorReply = (isBn ? rev.tutorResponseBn : rev.tutorResponseEn) || rev.tutorResponse;

  return (
    <Card
      data-testid="review-card"
      className="p-5 border border-border bg-card rounded-2xl shadow-xs flex flex-col gap-3.5 text-foreground"
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">{reviewerName}</span>
            {rev.isVerifiedBooking && (
              <Badge
                variant="success"
                className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{isBn ? '১০০% যাচাইকৃত বুকিং' : 'Verified Booking'}</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {new Date(rev.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 border border-amber-300">
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
          <span>{rev.rating}.0</span>
        </div>
      </div>

      {/* Multi-Criteria Breakdown Badges */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {rev.punctualityRating != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground border border-border shadow-2xs">
            ⏱ {isBn ? 'সময়নিষ্ঠতা' : 'Punctuality'}: {rev.punctualityRating}/5
          </span>
        )}
        {rev.teachingClarityRating != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground border border-border shadow-2xs">
            💡 {isBn ? 'পাঠদান স্পষ্টতা' : 'Clarity'}: {rev.teachingClarityRating}/5
          </span>
        )}
        {rev.subjectMasteryRating != null && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground border border-border shadow-2xs">
            📚 {isBn ? 'বিষয় দক্ষতা' : 'Mastery'}: {rev.subjectMasteryRating}/5
          </span>
        )}
      </div>

      {/* Written Feedback */}
      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
        "{commentText}"
      </p>

      {/* Tutor Response / Rebuttal */}
      {tutorReply && (
        <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-2xl text-xs flex flex-col gap-1.5 shadow-2xs">
          <div className="font-bold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>{isBn ? 'শিক্ষকের উত্তর / প্রতিক্রিয়া' : 'Tutor Reply'}</span>
            </div>
            {rev.tutorRespondedAt && (
              <span className="text-[11px] text-muted-foreground font-medium">
                {new Date(rev.tutorRespondedAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
              </span>
            )}
          </div>
          <p className="text-foreground/80 leading-relaxed font-normal">{tutorReply}</p>
        </div>
      )}

      {/* Tutor Rebuttal Form (Tutor viewing, hasn't replied yet) */}
      {isCurrentTutor && !tutorReply && (
        <div className="pt-1">
          {replying ? (
            <div className="flex flex-col gap-2 p-3 bg-muted/40 border border-border rounded-xl">
              {replyError && (
                <Alert
                  variant="destructive"
                  className="py-2 px-3 rounded-xl border-destructive/30 bg-destructive/10 text-destructive"
                >
                  <AlertDescription className="text-xs font-bold">{replyError}</AlertDescription>
                </Alert>
              )}
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder={
                  isBn
                    ? 'শিক্ষার্থীর মতামতের একটি পেশাদার ও গঠনমূলক উত্তর লিখুন...'
                    : 'Write a professional rebuttal or gratitude response...'
                }
                value={replyText}
                onChange={(e) => onReplyTextChange?.(e.target.value)}
                className="text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                data-testid="tutor-reply-textarea"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelReply}
                  className="text-xs border-border text-foreground bg-background hover:bg-muted"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPostingReply}
                  onClick={onPostReply}
                  isLoading={isPostingReply}
                  className="text-xs font-bold"
                  data-testid="submit-tutor-reply-btn"
                >
                  {isPostingReply
                    ? isBn
                      ? 'জমা হচ্ছে...'
                      : 'Posting...'
                    : isBn
                      ? 'উত্তর প্রকাশ করুন'
                      : 'Post Reply'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenReply}
              className="text-primary border-primary/30 hover:bg-primary/5 text-xs h-8 px-3 font-bold rounded-xl"
              data-testid="open-reply-btn"
            >
              + {isBn ? 'শিক্ষক হিসেবে উত্তর দিন' : 'Reply as Tutor'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
