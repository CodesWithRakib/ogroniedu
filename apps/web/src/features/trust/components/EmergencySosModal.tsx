'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { PhoneCall, ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { playAudioTone } from '@/lib/audio/notification-sound';
import { withLocale } from '@/lib/auth';

export interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFileReport?: () => void;
  locale?: 'bn' | 'en';
}

export const EMERGENCY_HOTLINES = [
  {
    number: '১০৯৮',
    telNumber: '1098',
    titleBn: 'জাতীয় শিশু হেল্পলাইন (Child Helpline)',
    titleEn: 'National Child Helpline',
    subtitleBn: '২৪/৭ শিশুদের সুরক্ষা, নির্যাতন প্রতিরোধ ও জরুরি সহায়তা সেল (বিনামূল্যে টোল-ফ্রি)',
    subtitleEn: '24/7 Child Protection & Anti-abuse Helpline (Toll-Free)',
    color: 'border-rose-300 bg-rose-50 text-slate-900',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeBn: 'সর্বোচ্চ অগ্রাধিকার',
    badgeEn: 'Highest Priority',
  },
  {
    number: '৯৯৯',
    telNumber: '999',
    titleBn: 'জাতীয় জরুরি সেবা (National Emergency 999)',
    titleEn: 'Bangladesh Police & Emergency',
    subtitleBn: 'জরুরি পুলিশি নিরাপত্তা, অ্যাম্বুলেন্স ও উদ্ধার সহায়তা',
    subtitleEn: 'Immediate Police Assistance, Ambulance & Fire Service',
    color: 'border-amber-300 bg-amber-50 text-slate-900',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeBn: 'পুলিশ ও উদ্ধার',
    badgeEn: 'Police & Rescue',
  },
  {
    number: '১০৯',
    telNumber: '109',
    titleBn: 'নারী ও শিশু নির্যাতন প্রতিরোধ সেল',
    titleEn: 'Women & Children Violence Helpline',
    subtitleBn: 'মহিলা ও শিশু বিষয়ক মন্ত্রণালয় কর্তৃক পরিচালিত সরকারি টোল-ফ্রি সহায়তা',
    subtitleEn: 'Govt. Toll-Free Violence Protection Cell',
    color: 'border-rose-300 bg-rose-50 text-slate-900',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeBn: 'সুরক্ষা সেল',
    badgeEn: 'Safety Cell',
  },
  {
    number: '+৮৮০ ৯৬১২-৩৪৫৬৭৮',
    telNumber: '+8809612345678',
    titleBn: 'অগ্রণী এডু ২৪/৭ ট্রাস্ট ও সেফটি ট্রায়াজ',
    titleEn: 'OgroniEdu Safety Triage Desk',
    subtitleBn: 'অনুপযুক্ত শিক্ষক আচরণ, ব্ল্যাকমেইল বা অবৈধ লেনদেন রোধে সরাসরি সহায়তা',
    subtitleEn: 'Dedicated Platform Incident & Immediate Escalation Team',
    color: 'border-blue-300 bg-blue-50 text-slate-900',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeBn: 'প্ল্যাটফর্ম হেল্প',
    badgeEn: 'Platform Support',
  },
];

export function EmergencySosContent({
  onClose,
  onOpenFileReport,
  locale = 'bn',
}: Omit<EmergencySosModalProps, 'isOpen'>) {
  const isBn = locale === 'bn';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 animate-pulse text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <span>
                {isBn ? 'জরুরি নিরাপত্তা ও এসওএস হেল্পলাইন' : 'Emergency SOS & Safety Hub'}
              </span>
            </h3>
            <p className="text-xs text-rose-700 font-semibold mt-0.5">
              {isBn
                ? 'শিশুর শারীরিক, মানসিক ও আর্থিক সুরক্ষায় যেকোনো মুহূর্তে সরাসরি যোগাযোগ করুন'
                : 'Zero-tolerance safeguarding: instant access to emergency law enforcement & hotlines'}
            </p>
          </div>
        </div>
      </div>

      {/* Hotlines Grid */}
      <div className="flex flex-col gap-3">
        {EMERGENCY_HOTLINES.map((item) => (
          <div
            key={item.telNumber}
            className={`p-4 rounded-xl border ${item.color} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-[transform,border-color] duration-150 hover:scale-[1.01]`}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-wider font-mono tabular-nums">
                  {item.number}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${item.badgeBg}`}
                >
                  {isBn ? item.badgeBn : item.badgeEn}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                {isBn ? item.titleBn : item.titleEn}
              </h4>
              <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                {isBn ? item.subtitleBn : item.subtitleEn}
              </p>
            </div>

            <a
              href={`tel:${item.telNumber}`}
              className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-[background-color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              data-testid={`dial-${item.telNumber}`}
            >
              <PhoneCall className="w-4 h-4" aria-hidden="true" />
              <span>{isBn ? 'কল করুন' : 'Fast Dial'}</span>
            </a>
          </div>
        ))}
      </div>

      {/* File Immediate Incident Report CTA */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              {isBn ? 'প্ল্যাটফর্মে আনুষ্ঠানিক নিরাপত্তা অভিযোগ' : 'Formal Safety Incident Report'}
            </span>
          </span>
          <p className="text-[11px] text-muted-foreground font-medium">
            {isBn
              ? 'অনুপযুক্ত চ্যাট, হয়রানি বা অবৈধ ফি দাবির প্রমাণ সহ সরাসরি অ্যাডমিনের কাছে অভিযোগ দাখিল করুন।'
              : 'Escalate abusive conduct, child safety, or off-platform payment threats to admin triage.'}
          </p>
        </div>

        {onOpenFileReport ? (
          <Button
            size="sm"
            onClick={() => {
              onClose();
              onOpenFileReport();
            }}
            className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
            data-testid="open-incident-form-btn"
          >
            {isBn ? 'অভিযোগ ফর্ম খুলুন' : 'File Incident Report'}
          </Button>
        ) : (
          <Link
            href={withLocale('/dashboard/guardian/safety-reports', locale)}
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
            data-testid="open-incident-form-btn"
          >
            {isBn ? 'অভিযোগ ফর্ম খুলুন' : 'File Incident Report'}
          </Link>
        )}
      </div>

      {/* Footer & Privacy Assurance */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
        <span className="flex items-center gap-1 font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {isBn
              ? 'সকল অভিযোগ ১০০% কঠোর গোপনীয়তায় সংরক্ষিত'
              : 'Confidentiality & Privacy Guaranteed'}
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="border-border text-foreground text-xs rounded-xl h-8 font-bold"
        >
          {isBn ? 'বন্ধ করুন' : 'Close'}
        </Button>
      </div>
    </div>
  );
}

export function EmergencySosModal({
  isOpen,
  onClose,
  onOpenFileReport,
  locale = 'bn',
}: EmergencySosModalProps) {
  useEffect(() => {
    if (isOpen) {
      try {
        playAudioTone('alert');
      } catch {
        // audio safeguard
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="emergency-sos-modal"
        className="w-full max-w-xl bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col gap-6 text-foreground max-h-[90vh] overflow-y-auto text-left"
      >
        <EmergencySosContent
          onClose={onClose}
          onOpenFileReport={onOpenFileReport}
          locale={locale}
        />
      </DialogContent>
    </Dialog>
  );
}
