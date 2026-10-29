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
import type { ReviewSubmitPayload } from '../types/trust.types';

export interface ReviewModalFormProps {
  bookingId: string;
  tutorName?: string;
  subjectName?: string;
  locale?: 'bn' | 'en';
  onClose: () => void;
  onSuccess?: () => void;
  onSubmitReview?: (payload: ReviewSubmitPayload) => Promise<unknown>;
}

export function ReviewModalForm({
  bookingId,
  tutorName = 'Tutor',
  subjectName = 'Session',
  locale = 'bn',
  onClose,
  onSuccess,
  onSubmitReview,
}: ReviewModalFormProps) {
  const isBn = locale === 'bn';
  const [createReviewMutation, { isLoading: isApiLoading }] = useCreateReviewMutation();

  const [rating, setRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [teachingClarityRating, setTeachingClarityRating] = useState(5);
  const [subjectMasteryRating, setSubjectMasteryRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      const payload: ReviewSubmitPayload = {
        bookingId,
        rating,
        punctualityRating,
        teachingClarityRating,
        subjectMasteryRating,
        comment: comment.trim(),
      };

      if (onSubmitReview) {
        await onSubmitReview(payload);
      } else {
        await createReviewMutation(payload).unwrap();
      }

      playAudioTone('success');
      toast.success(isBn ? 'রিভিউ সফলভাবে জমা দেওয়া হয়েছে!' : 'Review Submitted Successfully!', {
        description: isBn
          ? 'আপনার মতামত প্ল্যাটফর্মে প্রকাশিত হবে এবং শিক্ষক রেটিংয়ে যুক্ত হবে।'
          : 'Your feedback has been verified and added to the tutor profile.',
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Failed to submit review')
          : err instanceof Error
            ? err.message
            : 'Failed to submit review';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isApiLoading || isSubmitting;

  return (
    <div data-testid="review-modal-form" className="flex flex-col gap-5 text-left">
      {/* Header Info */}
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-600">
            <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground flex items-center gap-1.5">
              <span>{isBn ? 'শিক্ষকের মূল্যায়ন ও রিভিউ' : 'Tutor Rating & Review'}</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-xs font-bold text-primary mt-0.5">
              {subjectName} • {tutorName}
            </p>
          </div>
        </div>
      </div>

      {/* Verified Booking Notice */}
      <Alert className="bg-primary/5 border border-primary/20 text-foreground text-xs flex items-center gap-2.5 p-3.5 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <AlertDescription className="font-bold text-foreground">
          {isBn
            ? 'এটি একটি ১০০% যাচাইকৃত বুকিং রিভিউ। আপনার সৎ মূল্যায়ন অন্য শিক্ষার্থীদের সাহায্য করবে।'
            : 'This is a verified booking review. Your genuine feedback guides fellow students.'}
        </AlertDescription>
      </Alert>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Overall Rating */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-1">
          <StarSelector
            label={isBn ? 'সামগ্রিক সন্তুষ্টি (Overall Rating)' : 'Overall Rating'}
            value={rating}
            onChange={setRating}
            locale={locale}
          />
        </div>

        {/* Breakdown Criteria Ratings */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-3.5">
          <span className="text-xs font-black text-foreground block uppercase tracking-wider">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-comment" className="text-xs font-bold text-foreground block">
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
            className="w-full rounded-xl bg-background border border-border p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
            data-testid="review-comment-textarea"
          />
          <div className="text-[11px] font-medium text-muted-foreground text-right">
            {comment.trim().length} / 1000 {isBn ? 'অক্ষর' : 'characters'}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <Alert
            variant="destructive"
            className="p-3.5 rounded-xl text-xs flex items-center gap-2 border-destructive/30 bg-destructive/10 text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
            <AlertDescription className="font-bold">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-border text-foreground bg-background hover:bg-muted font-bold text-xs rounded-xl"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="text-xs rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="submit-review-btn"
          >
            {isBn ? 'রিভিউ প্রকাশ করুন' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tutorName?: string;
  subjectName?: string;
  locale?: 'bn' | 'en';
  onSuccess?: () => void;
  onSubmitReview?: (payload: ReviewSubmitPayload) => Promise<unknown>;
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  tutorName,
  subjectName,
  locale = 'bn',
  onSuccess,
  onSubmitReview,
}: ReviewModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="review-modal"
        className="w-full max-w-lg bg-card border border-border rounded-xl p-6 md:p-8 text-foreground max-h-[90vh] overflow-y-auto text-left"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {locale === 'bn' ? 'শিক্ষকের মূল্যায়ন ও রিভিউ' : 'Tutor Rating & Review'}
          </DialogTitle>
          <DialogDescription>
            {subjectName} • {tutorName}
          </DialogDescription>
        </DialogHeader>

        <ReviewModalForm
          bookingId={bookingId}
          tutorName={tutorName}
          subjectName={subjectName}
          locale={locale}
          onClose={onClose}
          onSuccess={onSuccess}
          onSubmitReview={onSubmitReview}
        />
      </DialogContent>
    </Dialog>
  );
}
