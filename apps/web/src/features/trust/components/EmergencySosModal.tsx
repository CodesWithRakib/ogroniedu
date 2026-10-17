'use client';

import React, { useEffect } from 'react';
import { PhoneCall, ShieldAlert, AlertTriangle, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { playAudioTone } from '@/lib/audio/notification-sound';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFileReport?: () => void;
  locale?: 'bn' | 'en';
}

export function EmergencySosModal({
  isOpen,
  onClose,
  onOpenFileReport,
  locale = 'bn',
}: EmergencySosModalProps) {
  const isBn = locale === 'bn';

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

  const hotlines = [
    {
      number: '১০৯৮',
      telNumber: '1098',
      titleBn: 'জাতীয় শিশু হেল্পলাইন (Child Helpline)',
      titleEn: 'National Child Helpline',
      subtitleBn:
        '২৪/৭ শিশুদের সুরক্ষা, নির্যাতন প্রতিরোধ ও জরুরি সহায়তা সেল (বিনামূল্যে টোল-ফ্রি)',
      subtitleEn: '24/7 Child Protection & Anti-abuse Helpline (Toll-Free)',
      color: 'border-red-500/40 bg-red-950/40 text-red-400',
      badge: isBn ? 'সর্বোচ্চ অগ্রাধিকার' : 'Highest Priority',
    },
    {
      number: '৯৯৯',
      telNumber: '999',
      titleBn: 'জাতীয় জরুরি সেবা (National Emergency Service)',
      titleEn: 'Bangladesh Police & Emergency',
      subtitleBn: 'জরুরি পুলিশি নিরাপত্তা, অ্যাম্বুলেন্স ও উদ্ধার সহায়তা',
      subtitleEn: 'Immediate Police Assistance, Ambulance & Fire Service',
      color: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
      badge: isBn ? 'পুলিশ ও উদ্ধার' : 'Police & Rescue',
    },
    {
      number: '১০৯',
      telNumber: '109',
      titleBn: 'নারী ও শিশু নির্যাতন প্রতিরোধ সেল',
      titleEn: 'Women & Children Violence Helpline',
      subtitleBn: 'মহিলা ও শিশু বিষয়ক মন্ত্রণালয় কর্তৃক পরিচালিত সরকারি টোল-ফ্রি সহায়তা',
      subtitleEn: 'Govt. Toll-Free Violence Protection Cell',
      color: 'border-rose-500/40 bg-rose-950/40 text-rose-400',
      badge: isBn ? 'সুরক্ষা সেল' : 'Safety Cell',
    },
    {
      number: '+৮৮০ ৯৬১২-৩৪৫৬৭৮',
      telNumber: '+8809612345678',
      titleBn: 'অগ্রণী এডু ২৪/৭ ট্রাস্ট ও সেফটি ট্রায়াজ',
      titleEn: 'OgroniEdu Safety Triage Desk',
      subtitleBn: 'অনুপযুক্ত শিক্ষক আচরণ, ব্ল্যাকমেইল বা অবৈধ লেনদেন রোধে সরাসরি সহায়তা',
      subtitleEn: 'Dedicated Platform Incident & Immediate Escalation Team',
      color: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-400',
      badge: isBn ? 'প্ল্যাটফর্ম হেল্প' : 'Platform Support',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-xl bg-slate-950 border border-red-500/50 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto"
        data-testid="emergency-sos-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
          <div className="flex items-center gap-3 text-red-500">
            <div className="p-2.5 rounded-2xl bg-red-500/20 border border-red-500/40 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>
                  {isBn ? 'জরুরি নিরাপত্তা ও এসওএস হেল্পলাইন' : 'Emergency SOS & Safety Hub'}
                </span>
              </h3>
              <p className="text-xs text-red-300 font-medium">
                {isBn
                  ? 'শিশুর শারীরিক, মানসিক ও আর্থিক সুরক্ষায় যেকোনো মুহূর্তে সরাসরি যোগাযোগ করুন'
                  : 'Zero-tolerance safeguarding: instant access to emergency law enforcement & hotlines'}
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

        {/* Hotlines Grid */}
        <div className="space-y-3">
          {hotlines.map((item) => (
            <div
              key={item.telNumber}
              className={`p-4 rounded-2xl border ${item.color} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:scale-[1.01]`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white tracking-wider font-mono">
                    {item.number}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {item.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white">
                  {isBn ? item.titleBn : item.titleEn}
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isBn ? item.subtitleBn : item.subtitleEn}
                </p>
              </div>

              <a
                href={`tel:${item.telNumber}`}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-950 transition-all"
                data-testid={`dial-${item.telNumber}`}
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isBn ? 'কল করুন' : 'Fast Dial'}</span>
              </a>
            </div>
          ))}
        </div>

        {/* File Immediate Incident Report CTA */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>
                {isBn
                  ? 'প্ল্যাটফর্মে আনুষ্ঠানিক নিরাপত্তা অভিযোগ'
                  : 'Formal Safety Incident Report'}
              </span>
            </span>
            <p className="text-[11px] text-slate-400">
              {isBn
                ? 'অনুপযুক্ত চ্যাট, হয়রানি বা অবৈধ ফি দাবির প্রমাণ সহ সরাসরি অ্যাডমিনের কাছে অভিযোগ দাখিল করুন।'
                : 'Escalate abusive conduct, child safety, or off-platform payment threats to admin triage.'}
            </p>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              onClose();
              if (onOpenFileReport) onOpenFileReport();
            }}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
            data-testid="open-incident-form-btn"
          >
            {isBn ? 'অভিযোগ ফর্ম খুলুন' : 'File Incident Report'}
          </Button>
        </div>

        {/* Footer & Privacy Assurance */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
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
            className="border-slate-800 text-slate-400 text-xs rounded-xl h-8"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
