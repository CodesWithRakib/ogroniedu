'use client';

import React, { useState } from 'react';
import { RefreshCw, Send, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateReplacementCaseMutation } from '@/store/services/trust-api';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';
import type { TutorReplacementModalProps } from '../types/trust.types';

export function TutorReplacementModalForm({
  onClose,
  locale,
  bookingId,
  tutorName,
  subjectName,
  onSuccess,
}: Omit<TutorReplacementModalProps, 'isOpen'>) {
  const isBn = locale === 'bn';
  const [createReplacementCase, { isLoading }] = useCreateReplacementCaseMutation();

  const [reasonCode, setReasonCode] = useState<string>('teaching_mismatch');
  const [explanation, setExplanation] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      onSuccess?.();
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
    <div data-testid="tutor-replacement-modal-content" className="flex flex-col gap-4">
      {isSuccess ? (
        <div className="py-10 text-center flex flex-col gap-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
          <h3 className="text-xl font-black text-foreground">
            {isBn ? 'রিপ্লেসমেন্ট দাবি সফলভাবে গৃহীত হয়েছে' : 'Guarantee Request Active'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isBn
              ? '৪৮ ঘণ্টার কাউন্টডাউন শুরু হয়েছে। আমাদের ম্যাচিং টিম আপনার সাথে যোগাযোগ করবে।'
              : 'The 48-hour guarantee clock has started. Our team is curating matching replacement tutors.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="border-b border-border/40 pb-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">
                  {isBn
                    ? '৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি'
                    : '48-Hour Tutor Replacement Guarantee'}
                </h3>
                <p className="text-xs font-semibold text-primary mt-0.5">
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
          </div>

          {/* SLA Guarantee Banner */}
          <Alert className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <AlertDescription className="text-xs text-foreground font-medium">
                {isBn
                  ? '১০০% অভিভাবক সুরক্ষা: ৪৮ ঘণ্টার মধ্যে নতুন যাচাইকৃত শিক্ষক অথবা সম্পূর্ণ ফান্ড ফেরত।'
                  : '100% Trust Guarantee: New verified tutor within 48h or full escrow refund.'}
              </AlertDescription>
            </div>
            <div className="flex items-center gap-1 font-bold text-primary shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>৪৮ ঘণ্টা</span>
            </div>
          </Alert>

          {/* Reason Code Select */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="replacement-reason-select"
              className="text-xs font-semibold text-foreground"
            >
              {isBn ? 'পরিবর্তন চাওয়ার কারণ:' : 'Reason for Replacement:'}
            </Label>
            <NativeSelect
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="text-xs"
              id="replacement-reason-select"
            >
              <option value="teaching_mismatch">
                {isBn
                  ? 'পাঠদান পদ্ধতি শিক্ষার্থীর সাথে মিলছে না (Teaching Style Mismatch)'
                  : 'Teaching Style Mismatch'}
              </option>
              <option value="tutor_no_show">
                {isBn ? 'শিক্ষক নির্ধারিত ক্লাসে অনুপস্থিত ছিলেন (Tutor No-Show)' : 'Tutor No-Show'}
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
            </NativeSelect>
          </div>

          {/* Explanation Textarea */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="replacement-explanation-input"
              className="text-xs font-semibold text-foreground"
            >
              {isBn
                ? 'বিস্তারিত প্রত্যাশা ও বিবরণ (কী ধরণের শিক্ষক চাচ্ছেন?):'
                : 'Requirements for New Tutor:'}
            </Label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              placeholder={
                isBn
                  ? 'নতুন শিক্ষকের কাছ থেকে আপনার নির্দিষ্ট প্রত্যাশা, সময়সূচি বা কোনো অগ্রাধিকার উল্লেখ করুন...'
                  : 'Specify preferred background, schedule adjustments, or pedagogical style...'
              }
              className="w-full rounded-xl bg-card border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
              id="replacement-explanation-input"
            />
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="flex items-center gap-2 p-3 rounded-xl text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 text-xs font-bold px-4 rounded-xl"
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
  );
}

export function TutorReplacementModal({ isOpen, onClose, ...rest }: TutorReplacementModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="tutor-replacement-modal"
        className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl max-h-[90vh] overflow-y-auto text-left"
      >
        <TutorReplacementModalForm onClose={onClose} {...rest} />
      </DialogContent>
    </Dialog>
  );
}
