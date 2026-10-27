'use client';

import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, Send, Scale, Lock, CheckCircle2 } from 'lucide-react';
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
import { useCreateDisputeMutation } from '@/store/services/trust-api';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  bookingId: string;
  tutorName?: string | null;
  priceBdt?: number | null;
}

export function DisputeModal({
  isOpen,
  onClose,
  locale,
  bookingId,
  tutorName,
  priceBdt,
}: DisputeModalProps) {
  const isBn = locale === 'bn';
  const [createDispute, { isLoading }] = useCreateDisputeMutation();

  const [reasonCode, setReasonCode] = useState<string>('tutor_no_show');
  const [description, setDescription] = useState<string>('');
  const [claimedAmount, setClaimedAmount] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.trim().length < 10) {
      setErrorMessage(
        isBn
          ? 'অনুগ্রহ করে বিরোধের বিস্তারিত বিবরণ দিন (কমপক্ষে ১০ অক্ষর)।'
          : 'Please provide detailed complaint explanation (minimum 10 characters).',
      );
      return;
    }

    try {
      const disputedAmountMinor = claimedAmount.trim()
        ? Math.round(Number(claimedAmount) * 100)
        : undefined;

      await createDispute({
        bookingId,
        reasonCode,
        description: description.trim(),
        disputedAmountMinor,
      }).unwrap();

      playAudioTone('alert');

      toast.error(isBn ? 'বিরোধ কেস নিবন্ধিত হয়েছে' : 'Dispute Opened Successfully', {
        description: isBn
          ? 'এসক্রো ফান্ড সাময়িক স্থগিত করা হয়েছে। আমাদের ট্রাস্ট টিম তদন্ত করবে।'
          : 'Escrow settlement is now frozen pending investigation.',
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        setClaimedAmount('');
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const errObj = err as { data?: { error?: { message?: string } } } | undefined;
      setErrorMessage(
        errObj?.data?.error?.message ||
          (isBn ? 'বিরোধ জমা দেওয়া যায়নি।' : 'Failed to submit dispute.'),
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto text-left">
        <DialogHeader className="flex flex-col gap-1.5 border-b border-border/40 pb-3.5 text-left">
          <div className="flex items-center gap-2.5 text-amber-500">
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {isBn ? 'বুকিং বিরোধ ও অভিযোগ দায়ের' : 'File Booking Dispute & Complaint'}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-primary leading-relaxed">
                {isBn
                  ? `শিক্ষক ${tutorName ? `(${tutorName})` : ''}-এর সাথে ক্লাস বা লেনদেন সংক্রান্ত বিরোধ রিপোর্ট করুন।`
                  : `Open a formal dispute regarding session delivery or fees for this booking.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center flex flex-col items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <h4 className="text-sm font-bold text-foreground">
              {isBn ? 'অভিযোগ সফলভাবে গ্রহণ করা হয়েছে' : 'Dispute Registered'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isBn
                ? 'এসক্রো রিলিজ স্থগিত করা হয়েছে। আমাদের সাপোর্ট টিম পর্যালোচনা করছে।'
                : 'Escrow settlement is frozen. Support staff has been assigned.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            {/* Escrow Freeze Notice */}
            <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/10 text-xs flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-warning-foreground">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{isBn ? 'স্বয়ংক্রিয় এসক্রো সুরক্ষা' : 'Automated Escrow Hold'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isBn
                  ? 'বিরোধ দায়েরের সাথে সাথে বুকিংটির অবশিষ্ট এসক্রো ফান্ড লক হয়ে যাবে। বিরোধ মীমাংসা না হওয়া পর্যন্ত শিক্ষকের একাউন্টে কোনো অর্থ ছাড় করা হবে না।'
                  : 'Filing a dispute immediately freezes all milestone escrow disbursements to the tutor until formal administrative resolution.'}
              </p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Reason code */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'বিরোধের কারণ' : 'Dispute Reason'}
              </Label>
              <NativeSelect
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full text-xs h-9.5 rounded-xl bg-surface border-border"
                aria-label="Dispute reason"
              >
                <option value="tutor_no_show">
                  {isBn ? 'শিক্ষক ক্লাসে অনুপস্থিত (Tutor No-Show)' : 'Tutor Absent / No-Show'}
                </option>
                <option value="unfulfilled_hours">
                  {isBn
                    ? 'অসম্পূর্ণ পাঠদান সময় (Unfulfilled Hours)'
                    : 'Class Ended Early / Unfulfilled Hours'}
                </option>
                <option value="poor_quality">
                  {isBn
                    ? 'পাঠদানের মান দুর্বল (Unsatisfactory Teaching)'
                    : 'Unsatisfactory Teaching Quality'}
                </option>
                <option value="curriculum_mismatch">
                  {isBn ? 'পাঠ্যক্রম অমিল (Curriculum Mismatch)' : 'Curriculum / Syllabus Mismatch'}
                </option>
                <option value="inappropriate_conduct">
                  {isBn
                    ? 'অনুপযুক্ত আচরণ (Inappropriate Conduct)'
                    : 'Unprofessional / Inappropriate Conduct'}
                </option>
                <option value="billing_dispute">
                  {isBn ? 'লেনদেন বা ফি অমিল (Billing / Fee Dispute)' : 'Billing / Fee Discrepancy'}
                </option>
                <option value="other">{isBn ? 'অন্যান্য কারণ (Other)' : 'Other Grounds'}</option>
              </NativeSelect>
            </div>

            {/* Claimed Refund Amount (optional) */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {isBn ? 'দাবিকৃত রিফান্ড পরিমাণ (ঐচ্ছিক ৳)' : 'Claimed Refund Amount (Optional ৳)'}
              </Label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder={priceBdt ? `e.g. ${priceBdt}` : 'Amount in BDT'}
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-foreground">
                  {isBn ? 'অভিযোগের বিস্তারিত বিবরণ' : 'Detailed Explanation'}
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {description.length} / 3000
                </span>
              </div>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isBn
                    ? 'ঘটনার সুনির্দিষ্ট সময়, তারিখ এবং সমস্যার কারণ পরিষ্কারভাবে উল্লেখ করুন...'
                    : 'Describe the issue clearly, including dates, missed sessions, or curriculum failures...'
                }
                className="text-xs rounded-xl bg-surface border-border resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3 text-success" />
                {isBn ? 'গোপনীয় ও সুরক্ষিত ট্রায়াজ' : 'Confidential Triage'}
              </span>
              <div className="flex gap-2">
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
                  size="sm"
                  variant="destructive"
                  disabled={isLoading}
                  className="text-xs rounded-xl gap-1.5 font-bold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isLoading
                      ? isBn
                        ? 'প্রেরণ হচ্ছে...'
                        : 'Filing...'
                      : isBn
                        ? 'বিরোধ জমা দিন'
                        : 'Submit Dispute'}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
