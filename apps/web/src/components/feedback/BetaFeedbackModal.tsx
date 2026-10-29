'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FeedbackCategory } from '@ogroniedu/contracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BetaFeedbackModalProps {
  locale?: 'bn' | 'en';
  defaultRoute?: string;
  onSuccess?: () => void;
}

export function BetaFeedbackModal({
  locale = 'bn',
  defaultRoute,
  onSuccess,
}: BetaFeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const isBn = locale === 'bn';

  const categoryOptions: Array<{ value: FeedbackCategory; label: string }> = [
    { value: 'bug', label: isBn ? 'ত্রুটি / সমস্যা (Bug)' : 'Bug or Issue' },
    { value: 'usability', label: isBn ? 'ব্যবহারযোগ্যতা (Usability)' : 'Usability / Confusion' },
    { value: 'feature_request', label: isBn ? 'নতুন ফিচারের অনুরোধ (Feature)' : 'Feature Request' },
    { value: 'performance', label: isBn ? 'গতি / স্লোনেস (Performance)' : 'Performance / Speed' },
    { value: 'accessibility', label: isBn ? 'অ্যাক্সেসিবিলিটি (A11y)' : 'Accessibility' },
    { value: 'other', label: isBn ? 'অন্যান্য মন্তব্য (Other)' : 'Other Feedback' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < 3) {
      setErrorMsg(
        isBn ? 'শিরোনাম কমপক্ষে ৩ অক্ষরের হতে হবে।' : 'Title must be at least 3 characters.',
      );
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg(
        isBn ? 'বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।' : 'Description must be at least 10 characters.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category,
        title: title.trim(),
        description: description.trim(),
        route:
          defaultRoute || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        reproductionSteps: reproductionSteps.trim() || undefined,
        diagnosticMetadata:
          includeDiagnostics && typeof window !== 'undefined'
            ? {
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                userAgent: navigator.userAgent,
                locale,
              }
            : undefined,
      };

      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson?.error?.message ||
            (isBn ? 'মতামত পাঠাতে সমস্যা হয়েছে।' : 'Failed to submit feedback.'),
        );
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setTitle('');
        setDescription('');
        setReproductionSteps('');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isBn
            ? 'অপ্রত্যাশিত ত্রুটি ঘটেছে।'
            : 'An unexpected error occurred.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button - Royal Sapphire Blue Brand Pattern */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
        aria-label={isBn ? 'বেটা মতামত পাঠান' : 'Send Beta Feedback'}
        data-testid="beta-feedback-trigger"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>{isBn ? 'মতামত দিন (Beta)' : 'Feedback (Beta)'}</span>
      </button>

      {/* Shadcn Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          data-testid="beta-feedback-modal"
          className="w-[94vw] max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 rounded-xl border border-border bg-card shadow-lg text-left"
        >
          {/* Header */}
          <DialogHeader className="flex flex-col gap-1.5 border-b border-border pb-3.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary border border-primary/20 shadow-2xs">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle
                  id="beta-feedback-modal-title"
                  className="text-base sm:text-lg font-black tracking-tight text-foreground"
                >
                  {isBn ? 'বেটা মতামত ও বাগ রিপোর্ট' : 'Beta Feedback & Bug Report'}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-primary">
                  {isBn
                    ? 'প্ল্যাটফর্ম উন্নত করতে আপনার মতামত বা সমস্যার বিবরণ দিন'
                    : 'Help us improve the platform with your feedback or bug reports'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Success State */}
          {isSuccess ? (
            <Alert className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
              <h4 className="mt-3 text-base font-black text-emerald-950">
                {isBn
                  ? 'ধন্যবাদ! আপনার মতামত সফলভাবে জমা হয়েছে।'
                  : 'Thank you! Your feedback has been submitted.'}
              </h4>
              <AlertDescription className="mt-1 text-xs font-semibold text-emerald-800">
                {isBn
                  ? 'আমাদের ইঞ্জিনিয়ারিং টিম আপনার রিপোর্ট পর্যালোচনা করে দ্রুত পদক্ষেপ নিবে।'
                  : 'Our engineering team will review your report and take appropriate action.'}
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
              {errorMsg && (
                <Alert variant="destructive" className="rounded-xl p-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="font-semibold">{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Category Select */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feedback-category" className="text-xs font-bold text-foreground">
                  {isBn ? 'ক্যাটাগরি' : 'Category'}
                </Label>
                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val as FeedbackCategory)}
                >
                  <SelectTrigger
                    id="feedback-category"
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="rounded-xl border border-border bg-card shadow-md"
                  >
                    {categoryOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs sm:text-sm font-medium text-foreground"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feedback-title" className="text-xs font-bold text-foreground">
                  {isBn ? 'সংক্ষিপ্ত শিরোনাম' : 'Short Title'}
                </Label>
                <Input
                  id="feedback-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isBn
                      ? 'যেমন: পেমেন্ট বাটনে ক্লিক করার পর কাজ করছে না'
                      : 'e.g. Payment button unresponsive'
                  }
                  className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/20"
                />
              </div>

              {/* Description Textarea */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feedback-description" className="text-xs font-bold text-foreground">
                  {isBn ? 'বিস্তারিত বিবরণ' : 'Description'}
                </Label>
                <Textarea
                  id="feedback-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isBn
                      ? 'সমস্যা বা প্রস্তাবনা বিস্তারিত লিখুন...'
                      : 'Describe what happened or what you suggest...'
                  }
                  className="min-h-20 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/20"
                />
              </div>

              {/* Reproduction Steps */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feedback-steps" className="text-xs font-bold text-foreground">
                  {isBn ? 'পুনরাবৃত্তির ধাপ (ঐচ্ছিক)' : 'Reproduction Steps (Optional)'}
                </Label>
                <Textarea
                  id="feedback-steps"
                  rows={2}
                  value={reproductionSteps}
                  onChange={(e) => setReproductionSteps(e.target.value)}
                  placeholder={
                    isBn
                      ? '১. টিউটর পেজে যাই ২. সময় নির্বাচন করি...'
                      : '1. Navigated to tutor page 2. Clicked slot...'
                  }
                  className="min-h-14 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-2xs hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/20"
                />
              </div>

              {/* Diagnostic Checkbox */}
              <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <Checkbox
                  id="include-diagnostics"
                  checked={includeDiagnostics}
                  onCheckedChange={(checked) => setIncludeDiagnostics(checked === true)}
                />
                <Label
                  htmlFor="include-diagnostics"
                  className="text-xs font-medium text-muted-foreground cursor-pointer"
                >
                  {isBn
                    ? 'ডিভাইসের স্ক্রিন সাইজ ও ব্রাউজার তথ্য যুক্ত করুন (কোনো গোপন পাসওয়ার্ড যাবে না)'
                    : 'Include screen dimensions and browser details (no passwords or PII)'}
                </Label>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-border bg-card text-foreground hover:bg-surface-muted font-bold text-xs"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="md"
                  isLoading={isSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{isBn ? 'জমা দিন' : 'Submit'}</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
