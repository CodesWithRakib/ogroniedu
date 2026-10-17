'use client';

import React, { useState } from 'react';
import { Star, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateReviewMutation } from '@/store/services/trust-api';
import { StarSelector } from './starSelector';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tutorName?: string;
  subjectName?: string;
  locale?: 'bn' | 'en';
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  tutorName = 'Tutor',
  subjectName = 'Session',
  locale = 'bn',
}: ReviewModalProps) {
  const isBn = locale === 'bn';

  const [createReview, { isLoading }] = useCreateReviewMutation();

  const [rating, setRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [teachingClarityRating, setTeachingClarityRating] = useState(5);
  const [subjectMasteryRating, setSubjectMasteryRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (comment.trim().length < 10) {
      setErrorMessage(
        isBn
          ? 'অনুগ্রহ করে কমপক্ষে ১০ অক্ষরের একটি গঠনমূলক রিভিউ বা মন্তব্য লিখুন।'
          : 'Please provide at least 10 characters of constructive review feedback.',
      );
      return;
    }

    try {
      await createReview({
        bookingId,
        rating,
        punctualityRating,
        teachingClarityRating,
        subjectMasteryRating,
        comment: comment.trim(),
      }).unwrap();

      playAudioTone('success');
      toast.success(isBn ? 'রিভিউ সফলভাবে জমা দেওয়া হয়েছে!' : 'Review Submitted Successfully!', {
        description: isBn
          ? 'আপনার মতামত প্ল্যাটফর্মে প্রকাশিত হবে এবং শিক্ষক রেটিংয়ে যুক্ত হবে।'
          : 'Your feedback has been verified and added to the tutor profile.',
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to submit review')
          : 'Failed to submit review';
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="review-modal"
        className="w-full max-w-lg bg-card border-border rounded-2xl p-6 md:p-8 shadow-2xl space-y-5 text-foreground max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <DialogHeader className="border-b border-border pb-4 text-left">
          <div className="flex items-center gap-2.5 text-warning">
            <div className="p-2 rounded-xl bg-warning/10 border border-warning/30">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-1.5">
                <span>{isBn ? 'শিক্ষকের মূল্যায়ন ও রিভিউ' : 'Tutor Rating & Review'}</span>
                <Sparkles className="w-4 h-4 text-warning" />
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {subjectName} • {tutorName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Verified Booking Notice */}
        <Alert className="bg-primary-soft border border-primary/25 text-primary-soft-foreground text-xs flex items-center gap-2 p-3.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <AlertDescription>
            {isBn
              ? 'এটি একটি ১০০% যাচাইকৃত বুকিং রিভিউ। আপনার সৎ মূল্যায়ন অন্য শিক্ষার্থীদের সাহায্য করবে।'
              : 'This is a verified booking review. Your genuine feedback guides fellow students.'}
          </AlertDescription>
        </Alert>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Rating */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
            <StarSelector
              label={isBn ? 'সামগ্রিক সন্তুষ্টি (Overall Rating)' : 'Overall Rating'}
              value={rating}
              onChange={setRating}
              locale={locale}
            />
          </div>

          {/* Breakdown Criteria Ratings */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <span className="text-xs font-semibold text-muted-foreground block">
              {isBn ? 'বিস্তারিত ক্রাইটেরিয়া মূল্যায়ন:' : 'Detailed Criteria Breakdown:'}
            </span>

            <StarSelector
              label={isBn ? 'সময়নিষ্ঠতা ও নিয়মানুবর্তিতা' : 'Punctuality'}
              value={punctualityRating}
              onChange={setPunctualityRating}
              locale={locale}
            />

            <StarSelector
              label={isBn ? 'বোঝানোর স্পষ্টতা ও শিক্ষাদান কৌশল' : 'Teaching Clarity'}
              value={teachingClarityRating}
              onChange={setTeachingClarityRating}
              locale={locale}
            />

            <StarSelector
              label={isBn ? 'পাঠ্যবিষয়ে দক্ষতা ও প্রস্তুতি' : 'Subject Mastery'}
              value={subjectMasteryRating}
              onChange={setSubjectMasteryRating}
              locale={locale}
            />
          </div>

          {/* Comment / Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="review-comment" className="text-xs font-semibold text-foreground block">
              {isBn
                ? 'আপনার বিস্তারিত অভিজ্ঞতা ও মন্তব্য (ন্যূনতম ১০ অক্ষর):'
                : 'Written Review (Min 10 chars):'}
            </Label>
            <Textarea
              id="review-comment"
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isBn
                  ? 'শিক্ষকের পাঠদান পদ্ধতি কেমন ছিল? শিক্ষার্থী কি উপকৃত হয়েছে? বিস্তারিত লিখুন...'
                  : 'How was the tutor’s teaching style? Did the student improve? Share specific feedback...'
              }
              className="w-full rounded-xl bg-card border border-border p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-primary leading-relaxed"
              data-testid="review-comment-textarea"
            />
            <div className="text-[11px] text-muted-foreground text-right">
              {comment.trim().length} / 1000 {isBn ? 'অক্ষর' : 'characters'}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive" className="p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-border text-muted-foreground text-xs rounded-xl"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              className="text-xs rounded-xl font-semibold px-5"
              data-testid="submit-review-btn"
            >
              {isBn ? 'রিভিউ প্রকাশ করুন' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
