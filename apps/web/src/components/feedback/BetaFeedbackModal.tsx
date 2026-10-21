'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FeedbackCategory } from '@ogroniedu/contracts';

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
      setErrorMsg(isBn ? 'শিরোনাম কমপক্ষে ৩ অক্ষরের হতে হবে।' : 'Title must be at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg(isBn ? 'বিবরণ কমপক্ষে ১০ অক্ষরের হতে হবে।' : 'Description must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category,
        title: title.trim(),
        description: description.trim(),
        route: defaultRoute || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        reproductionSteps: reproductionSteps.trim() || undefined,
        diagnosticMetadata: includeDiagnostics && typeof window !== 'undefined'
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
        throw new Error(errJson?.error?.message || (isBn ? 'মতামত পাঠাতে সমস্যা হয়েছে।' : 'Failed to submit feedback.'));
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
      setErrorMsg(err instanceof Error ? err.message : (isBn ? 'অপ্রত্যাশিত ত্রুটি ঘটেছে।' : 'An unexpected error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label={isBn ? 'বেটা মতামত পাঠান' : 'Send Beta Feedback'}
        data-testid="beta-feedback-trigger"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>{isBn ? 'মতামত দিন (Beta)' : 'Feedback (Beta)'}</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="beta-feedback-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-emerald-600" />
                <h3
                  id="beta-feedback-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  {isBn ? 'বেটা মতামত ও বাগ রিপোর্ট' : 'Beta Feedback & Bug Report'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success State */}
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-bounce" />
                <h4 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                  {isBn ? 'ধন্যবাদ! আপনার মতামত সফলভাবে জমা হয়েছে।' : 'Thank you! Your feedback has been submitted.'}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {isBn
                    ? 'আমাদের ইঞ্জিনিয়ারিং টিম আপনার রিপোর্ট পর্যালোচনা করে দ্রুত পদক্ষেপ নিবে।'
                    : 'Our engineering team will review your report and take appropriate action.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Category Select */}
                <div>
                  <label htmlFor="feedback-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isBn ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title Input */}
                <div>
                  <label htmlFor="feedback-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isBn ? 'সংক্ষিপ্ত শিরোনাম' : 'Short Title'}
                  </label>
                  <input
                    id="feedback-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isBn ? 'যেমন: পেমেন্ট বাটনে ক্লিক করার পর কাজ করছে না' : 'e.g. Payment button unresponsive'}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Description Textarea */}
                <div>
                  <label htmlFor="feedback-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isBn ? 'বিস্তারিত বিবরণ' : 'Description'}
                  </label>
                  <textarea
                    id="feedback-description"
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isBn ? 'সমস্যা বা প্রস্তাবনা বিস্তারিত লিখুন...' : 'Describe what happened or what you suggest...'}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Reproduction Steps */}
                <div>
                  <label htmlFor="feedback-steps" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isBn ? 'পুনরাবৃত্তির ধাপ (ঐচ্ছিক)' : 'Reproduction Steps (Optional)'}
                  </label>
                  <textarea
                    id="feedback-steps"
                    rows={2}
                    value={reproductionSteps}
                    onChange={(e) => setReproductionSteps(e.target.value)}
                    placeholder={isBn ? '১. টিউটর পেজে যাই ২. সময় নির্বাচন করি...' : '1. Navigated to tutor page 2. Clicked slot...'}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Diagnostic Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    id="include-diagnostics"
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="include-diagnostics" className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'ডিভাইসের স্ক্রিন সাইজ ও ব্রাউজার তথ্য যুক্ত করুন (কোনো গোপন পাসওয়ার্ড যাবে না)'
                      : 'Include screen dimensions and browser details (no passwords or PII)'}
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? (isBn ? 'পাঠানো হচ্ছে...' : 'Submitting...') : (isBn ? 'জমা দিন' : 'Submit')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
