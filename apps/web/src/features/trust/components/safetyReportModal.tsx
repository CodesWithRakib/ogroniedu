'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, Send, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCreateSafetyReportMutation } from '@/store/services/trust-api';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { toast } from 'sonner';
import type { Locale } from '@/lib/i18n';

interface SafetyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  defaultBookingId?: string;
  defaultReportedUserId?: string;
  reportedUserName?: string | null;
}

export function SafetyReportModal({
  isOpen,
  onClose,
  locale,
  defaultBookingId,
  defaultReportedUserId,
  reportedUserName,
}: SafetyReportModalProps) {
  const isBn = locale === 'bn';
  const [createSafetyReport, { isLoading }] = useCreateSafetyReportMutation();

  const [category, setCategory] = useState<string>('child_safety');
  const [severity, setSeverity] = useState<string>('high');
  const [description, setDescription] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.trim().length < 10) {
      setErrorMessage(
        isBn
          ? 'অনুগ্রহ করে ঘটনার বিস্তারিত বিবরণ দিন (কমপক্ষে ১০ অক্ষর)।'
          : 'Please provide detailed incident description (min 10 characters).',
      );
      return;
    }

    try {
      await createSafetyReport({
        bookingId: defaultBookingId,
        reportedUserId: defaultReportedUserId,
        category,
        severity,
        description: description.trim(),
      }).unwrap();

      // Play high-priority alert chime
      playAudioTone('alert');

      toast.error(isBn ? 'শিশু সুরক্ষা সতর্কতা গ্রহণ করা হয়েছে' : 'Safety Alert Registered', {
        description: isBn
          ? 'রিপোর্টটি জরুরি কমপ্লায়েন্স ও নিরাপত্তা ট্রায়াজে প্রেরণ করা হয়েছে।'
          : 'Escalated to 24/7 Security & Compliance triage.',
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
            ? 'রিপোর্ট প্রেরণে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
            : 'Failed to submit report. Please retry.';
      setErrorMessage(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      data-testid="safety-report-modal"
    >
      <div className="w-full max-w-xl rounded-3xl border border-red-500/30 bg-slate-950 p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-10 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white">
              {isBn ? 'রিপোর্ট সফলভাবে গৃহীত হয়েছে' : 'Report Filed Successfully'}
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              {isBn
                ? 'আমাদের নিরাপত্তা টিম অবিলম্বে ব্যবস্থা নিচ্ছে। আপনার যেকোনো প্রয়োজনে ২৪/৭ হটলাইনে যোগাযোগ করুন।'
                : 'Our security ops team is taking immediate action. We will contact you shortly.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isBn ? 'শিশু সুরক্ষা ও নিরাপত্তা সতর্কতা' : 'Child Safety & Protection Alert'}
                </h3>
                <p className="text-xs text-red-300">
                  {reportedUserName
                    ? isBn
                      ? `${reportedUserName}-এর বিরুদ্ধে জরুরি রিপোর্ট`
                      : `Filing confidential incident report against ${reportedUserName}`
                    : isBn
                      ? 'অসদাচরণ বা শিশু সুরক্ষার যেকোনো হুমকি রিপোর্ট করুন'
                      : 'Report misconduct, harassment or any child safety concern'}
                </p>
              </div>
            </div>

            {/* Emergency Hotline Notice */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-red-950/40 border border-red-800/40 text-xs">
              <div className="flex items-center gap-2 text-red-200">
                <PhoneCall className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  {isBn
                    ? 'জরুরি বিপদ? জাতীয় শিশু হেল্পলাইন ১০৯৮ বা ৯৯৯ এ কল করুন।'
                    : 'Immediate danger? Call National Child Helpline 1098 or 999.'}
                </span>
              </div>
              <span className="font-bold text-red-400 text-xs">২৪/৭ সক্রিয়</span>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isBn ? 'ঘটনার শ্রেণি / ক্যাটাগরি:' : 'Incident Category:'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                id="safety-category-select"
              >
                <option value="child_safety">
                  {isBn
                    ? 'শিশু সুরক্ষা ও মানসিক/শারীরিক আঘাত (Child Safety - Priority)'
                    : 'Child Safety & Well-being (Priority)'}
                </option>
                <option value="harassment">
                  {isBn
                    ? 'অনুপযুক্ত আচরণ বা হয়রানি (Harassment)'
                    : 'Harassment & Inappropriate Behavior'}
                </option>
                <option value="off_platform_payment">
                  {isBn
                    ? 'প্ল্যাটফর্মের বাইরে অর্থ লেনদেন দাবি (Off-Platform Payment)'
                    : 'Off-Platform Direct Payment Solicitation'}
                </option>
                <option value="academic_dishonesty">
                  {isBn
                    ? 'পরীক্ষায় প্রতারণা বা অসদুপায় (Academic Dishonesty)'
                    : 'Academic Dishonesty'}
                </option>
                <option value="fraud_billing">
                  {isBn
                    ? 'ক্লাস বা উপস্থিতি জালিয়াতি (Fraud / Absenteeism)'
                    : 'Fraud / Billing Discrepancy'}
                </option>
                <option value="other">{isBn ? 'অন্যান্য অভিযোগ (Other)' : 'Other Concern'}</option>
              </select>
            </div>

            {/* Severity Radio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isBn ? 'বিপদের মাত্রা (Severity):' : 'Urgency Level:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    id: 'critical',
                    bn: 'জরুরি (Critical)',
                    en: 'Critical',
                    color: 'border-red-600 bg-red-950/40 text-red-300',
                  },
                  {
                    id: 'high',
                    bn: 'উচ্চ (High)',
                    en: 'High',
                    color: 'border-amber-600 bg-amber-950/40 text-amber-300',
                  },
                  {
                    id: 'medium',
                    bn: 'মাঝারি (Med)',
                    en: 'Medium',
                    color: 'border-yellow-600 bg-yellow-950/40 text-yellow-300',
                  },
                  {
                    id: 'low',
                    bn: 'সাধারণ (Low)',
                    en: 'Low',
                    color: 'border-slate-700 bg-slate-900 text-slate-300',
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                      severity === s.id
                        ? `${s.color} ring-2 ring-red-500/50 shadow-sm`
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isBn ? s.bn : s.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isBn
                  ? 'ঘটনার বিস্তারিত বিবরণ (কমপক্ষে ১০ অক্ষর):'
                  : 'Detailed Incident Description:'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={
                  isBn
                    ? 'কী ঘটেছে, কখন ঘটেছে এবং শিক্ষার্থীর উপর কী প্রভাব পড়েছে তা স্পষ্টভাবে লিখুন...'
                    : 'Describe what happened, timestamp, and any safety impact on the student...'
                }
                className="w-full rounded-2xl bg-slate-900 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                id="safety-description-input"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs border-slate-700 hover:bg-slate-800"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4"
                id="btn-submit-safety-report"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isLoading
                    ? isBn
                      ? 'প্রেরণ হচ্ছে...'
                      : 'Submitting...'
                    : isBn
                      ? 'জরুরি রিপোর্ট দায়ের করুন'
                      : 'Submit Safety Report'}
                </span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
