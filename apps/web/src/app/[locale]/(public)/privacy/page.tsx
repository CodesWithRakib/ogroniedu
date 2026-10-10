'use client';

import React, { use } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function PrivacyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.privacyPolicyPage;

  const sections = [
    { title: p.sec1Title, text: p.sec1Text },
    { title: p.sec2Title, text: p.sec2Text },
    { title: p.sec3Title, text: p.sec3Text },
    { title: p.sec4Title, text: p.sec4Text },
    { title: p.sec5Title, text: p.sec5Text },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4">
        <Badge
          variant="outline"
          className="text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-bengali">
          {p.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bengali">
          {p.subtitle}
        </p>
      </div>

      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-bengali leading-relaxed border-b border-slate-100 dark:border-slate-800 pb-4">
          {p.introText}
        </p>

        <div className="space-y-6">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-bengali">
                {sec.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                {sec.text}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
