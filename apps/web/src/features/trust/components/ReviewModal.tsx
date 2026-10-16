'use client';

import React, { useState } from 'react';
import { Star, ShieldCheck, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
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
      toast.success(
        isBn ? 'রিভিউ সফলভাবে জমা দেওয়া হয়েছে!' : 'Review Submitted Successfully!',
        {
          description: isBn
            ? 'আপনার মতামত প্ল্যাটফর্মে প্রকাশিত হবে এবং শিক্ষক রেটিংয়ে যুক্ত হবে।'
            : 'Your feedback has been verified and added to the tutor profile.',
        },
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto"
        data-testid="review-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                <span>{isBn ? 'শিক্ষকের মূল্যায়ন ও রিভিউ' : 'Tutor Rating & Review'}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                {subjectName} • {tutorName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified Booking Notice */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isBn
              ? 'এটি একটি ১০০% যাচাইকৃত বুকিং রিভিউ। আপনার সৎ মূল্যায়ন অন্য শিক্ষার্থীদের সাহায্য করবে।'
              : 'This is a verified booking review. Your genuine feedback guides fellow students.'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Rating */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <StarSelector
              label={isBn ? 'সামগ্রিক সন্তুষ্টি (Overall Rating)' : 'Overall Rating'}
              value={rating}
              onChange={setRating}
              locale={locale}
            />
          </div>

          {/* Breakdown Criteria Ratings */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <span className="text-xs font-bold text-slate-300 block">
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
            <label htmlFor="review-comment" className="text-xs font-bold text-slate-300 block">
              {isBn ? 'আপনার বিস্তারিত অভিজ্ঞতা ও মন্তব্য (ন্যূনতম ১০ অক্ষর):' : 'Written Review (Min 10 chars):'}
            </label>
            <textarea
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
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
              data-testid="review-comment-textarea"
            />
            <div className="text-[11px] text-slate-500 text-right">
              {comment.trim().length} / 1000 {isBn ? 'অক্ষর' : 'characters'}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-slate-300 text-xs rounded-xl"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isLoading}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-900/30 px-5"
              data-testid="submit-review-btn"
            >
              {isBn ? 'রিভিউ প্রকাশ করুন' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
