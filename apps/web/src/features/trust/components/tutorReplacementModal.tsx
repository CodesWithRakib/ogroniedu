'use client';

import React, { useState } from 'react';
import { RefreshCw, X, Send, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCreateReplacementCaseMutation } from '@/store/services/trust-api';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

interface TutorReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  bookingId: string;
  tutorName?: string | null;
  subjectName?: string | null;
}

export function TutorReplacementModal({
  isOpen,
  onClose,
  locale,
  bookingId,
  tutorName,
  subjectName,
}: TutorReplacementModalProps) {
  const isBn = locale === 'bn';
  const [createReplacementCase, { isLoading }] = useCreateReplacementCaseMutation();

  const [reasonCode, setReasonCode] = useState<string>('teaching_mismatch');
  const [explanation, setExplanation] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (explanation.trim().length < 5) {
      setErrorMessage(
        isBn
          ? 'অনুগ্রহ করে রিপ্লেসমেন্ট চাওয়ার কারণ সংক্ষেপে ব্যাখ্যা করুন।'
          : 'Please explain the reason for requesting replacement.',
      );
      return;
    }

    try {
      await createReplacementCase({
        bookingId,
        reasonCode,
        explanation: explanation.trim(),
      }).unwrap();

      // Play chime tone
      playAudioTone('chime');

      toast.success(isBn ? 'রিপ্লেসমেন্ট কেস নিবন্ধিত হয়েছে' : 'Replacement Case Filed', {
        description: isBn
          ? 'আমাদের অপারেশন টিম ৪৮ ঘণ্টার মধ্যে বিকল্প শিক্ষক ম্যাচ করবে।'
          : 'Matching team will offer alternative verified tutor within 48h.',
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'data' in err &&
        typeof (err as { data?: { message?: string } }).data?.message === 'string'
          ? (err as { data: { message: string } }).data.message
          : isBn
            ? 'রিপ্লেসমেন্ট অনুরোধ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
            : 'Failed to file replacement request.';
      setErrorMessage(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      data-testid="tutor-replacement-modal"
    >
      <div className="w-full max-w-xl rounded-3xl border border-primary/30 bg-surface-muted p-6 text-foreground shadow-sm relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-10 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-success-soft-foreground mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-foreground">
              {isBn ? 'রিপ্লেসমেন্ট দাবি সফলভাবে গৃহীত হয়েছে' : 'Guarantee Request Active'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isBn
                ? '৪৮ ঘণ্টার কাউন্টডাউন শুরু হয়েছে। আমাদের ম্যাচিং টিম আপনার সাথে যোগাযোগ করবে।'
                : 'The 48-hour guarantee clock has started. Our team is curating matching replacement tutors.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-primary/20 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {isBn
                    ? '৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি'
                    : '48-Hour Tutor Replacement Guarantee'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tutorName && subjectName
                    ? isBn
                      ? `${tutorName} (${subjectName})-এর বিকল্প শিক্ষক দাবি করুন`
                      : `Request alternative tutor for ${tutorName} (${subjectName})`
                    : isBn
                      ? 'অসন্তোষজনক অভিজ্ঞতা হলে বিনামূল্যে শিক্ষক পরিবর্তন বা ১০০% রিফান্ড'
                      : 'Free replacement matching or 100% money-back guarantee'}
                </p>
              </div>
            </div>

            {/* SLA Guarantee Banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-primary-soft border border-primary/30 text-xs">
              <div className="flex items-center gap-2 text-primary-soft-foreground">
                <ShieldCheck className="w-4 h-4 text-success-soft-foreground shrink-0" />
                <span>
                  {isBn
                    ? '১০০% অভিভাবক সুরক্ষা: ৪৮ ঘণ্টার মধ্যে নতুন যাচাইকৃত শিক্ষক অথবা সম্পূর্ণ ফান্ড ফেরত।'
                    : '100% Trust Guarantee: New verified tutor within 48h or full escrow refund.'}
                </span>
              </div>
              <div className="flex items-center gap-1 font-bold text-success-soft-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>৪৮ ঘণ্টা</span>
              </div>
            </div>

            {/* Reason Code Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {isBn ? 'পরিবর্তন চাওয়ার কারণ:' : 'Reason for Replacement:'}
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-xl bg-card border border-border p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                id="replacement-reason-select"
              >
                <option value="teaching_mismatch">
                  {isBn
                    ? 'পাঠদান পদ্ধতি শিক্ষার্থীর সাথে মিলছে না (Teaching Style Mismatch)'
                    : 'Teaching Style Mismatch'}
                </option>
                <option value="tutor_no_show">
                  {isBn
                    ? 'শিক্ষক নির্ধারিত ক্লাসে অনুপস্থিত ছিলেন (Tutor No-Show)'
                    : 'Tutor No-Show'}
                </option>
                <option value="frequent_tutor_cancellation">
                  {isBn
                    ? 'ঘন ঘন ক্লাস বাতিল বা সময় পরিবর্তন (Frequent Reschedules)'
                    : 'Frequent Cancellations & Rescheduling'}
                </option>
                <option value="unprofessional_conduct">
                  {isBn
                    ? 'পেশাগত দায়িত্বহীনতা বা অসদাচরণ (Unprofessional Conduct)'
                    : 'Unprofessional Conduct'}
                </option>
                <option value="trial_dissatisfaction">
                  {isBn
                    ? 'প্রথম/ট্রায়াল ক্লাসের ফলাফল সন্তোষজনক নয় (Trial Dissatisfaction)'
                    : 'Trial Class Dissatisfaction'}
                </option>
                <option value="other">{isBn ? 'অন্যান্য কারণ (Other)' : 'Other Reason'}</option>
              </select>
            </div>

            {/* Explanation Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {isBn
                  ? 'বিস্তারিত প্রত্যাশা ও বিবরণ (কী ধরণের শিক্ষক চাচ্ছেন?):'
                  : 'Requirements for New Tutor:'}
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={4}
                placeholder={
                  isBn
                    ? 'নতুন শিক্ষকের কাছ থেকে আপনার নির্দিষ্ট প্রত্যাশা, সময়সূচি বা কোনো অগ্রাধিকার উল্লেখ করুন...'
                    : 'Specify preferred background, schedule adjustments, or pedagogical style...'
                }
                className="w-full rounded-2xl bg-card border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                id="replacement-explanation-input"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive-soft border border-destructive/40 text-xs text-destructive-soft-foreground">
                <AlertTriangle className="w-4 h-4 shrink-0 text-destructive-soft-foreground" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs border-border hover:bg-surface-hover"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-4"
                id="btn-submit-replacement-request"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isLoading
                    ? isBn
                      ? 'জমা হচ্ছে...'
                      : 'Submitting...'
                    : isBn
                      ? 'রিপ্লেসমেন্ট ক্লেইম করুন'
                      : 'Claim Replacement'}
                </span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
