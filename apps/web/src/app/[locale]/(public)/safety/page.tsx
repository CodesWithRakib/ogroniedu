'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Lock,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function SafetyPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.safetyPage;

  const safetyPillars = [
    {
      icon: UserCheck,
      title: p.minorPolicyHeading,
      desc: p.minorPolicyDesc,
      badge: locale === 'bn' ? 'অভিভাবক সম্মতি' : 'Minor Consent',
      color: 'emerald',
    },
    {
      icon: ShieldCheck,
      title: p.screeningHeading,
      desc: p.screeningDesc,
      badge: locale === 'bn' ? 'NID ও সনদ স্ক্রীনিং' : 'Background Screening',
      color: 'blue',
    },
    {
      icon: MessageSquare,
      title: p.monitoredChatHeading,
      desc: p.monitoredChatDesc,
      badge: locale === 'bn' ? 'ফিল্টার্ড ইন-অ্যাপ চ্যাট' : 'Monitored Chat',
      color: 'purple',
    },
    {
      icon: AlertTriangle,
      title: p.emergencyEscalationHeading,
      desc: p.emergencyEscalationDesc,
      badge: locale === 'bn' ? 'জরুরি এসকেলেশন' : '24/7 Escalation',
      color: 'rose',
    },
    {
      icon: RotateCcw,
      title: p.replacementGuaranteeHeading,
      desc: p.replacementGuaranteeDesc,
      badge: locale === 'bn' ? '১০০% রিপ্লেসমেন্ট' : 'Guarantee Claim',
      color: 'amber',
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge
          variant="outline"
          className="text-rose-700 border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
          {p.subtitle}
        </p>
      </div>

      {/* Safety Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {safetyPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <Card
              key={idx}
              className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200">
                  <Icon className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {pillar.badge}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className="text-lg font-bold font-bengali text-slate-900 dark:text-slate-100">
                  {pillar.title}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                  {pillar.desc}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Emergency Reporting Guidance */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
            <span>
              {locale === 'bn' ? 'জরুরি নিরাপত্তা সাপোর্ট' : 'Emergency Child Safety Protocol'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-bengali max-w-xl">
            {locale === 'bn'
              ? 'যেকোনো অসদাচরণ বা অনৈতিক আচরণ পরিলক্ষিত হলে অবিলম্বে রিপোর্ট করুন। আমাদের নিরাপত্তা দল তাৎক্ষণিক তদন্ত শুরু করবে।'
              : 'If you encounter any inappropriate conduct or safety violation, file a report immediately. Our Dhaka compliance team prioritizes incident reviews.'}
          </p>
        </div>
        <Link href={`/${locale}/contact`}>
          <Button
            variant="outline"
            className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 font-bengali whitespace-nowrap"
          >
            {dict.nav.contact}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
