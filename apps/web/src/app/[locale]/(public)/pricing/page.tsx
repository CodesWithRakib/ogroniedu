'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Check,
  Shield,
  HelpCircle,
  Sparkles,
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function PricingPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.pricingPage;

  // Interactive Fee Calculator state
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(6);
  const [hourlyRate, setHourlyRate] = useState<number>(800);

  const monthlyGross = hoursPerWeek * 4 * hourlyRate;
  const tutorEarnings = Math.round(monthlyGross * 0.92);
  const platformFee = Math.round(monthlyGross * 0.08);

  const tiers = [
    {
      title: p.tierPrimaryTitle,
      range: p.tierPrimaryRange,
      desc: p.tierPrimaryDesc,
      tag: 'Class 1-5',
    },
    {
      title: p.tierJuniorTitle,
      range: p.tierJuniorRange,
      desc: p.tierJuniorDesc,
      tag: 'Class 6-8',
    },
    {
      title: p.tierSscTitle,
      range: p.tierSscRange,
      desc: p.tierSscDesc,
      tag: 'Class 9-10 (SSC)',
    },
    {
      title: p.tierHscTitle,
      range: p.tierHscRange,
      desc: p.tierHscDesc,
      tag: 'Class 11-12 (HSC)',
    },
    {
      title: p.tierAdmissionTitle,
      range: p.tierAdmissionRange,
      desc: p.tierAdmissionDesc,
      tag: 'Admission Test',
    },
    {
      title: p.tierEnglishMediumTitle,
      range: p.tierEnglishMediumRange,
      desc: p.tierEnglishMediumDesc,
      tag: 'O / A Levels',
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="outline" className="text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
          {p.subtitle}
        </p>
      </div>

      {/* Free for Students Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-teal-500/10 border border-emerald-500/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {locale === 'bn' ? 'অভিভাবকদের জন্য সম্পূর্ণ ফ্রি' : '100% Free For Parents'}
          </span>
          <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 font-bengali">
            {p.studentFreeNotice}
          </p>
        </div>
        <Link href={`/${locale}/tutors`}>
          <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bengali whitespace-nowrap px-6">
            {dict.nav.findTutors}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* 8% Platform Commission Breakdown */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali flex items-center gap-2">
            <Percent className="h-6 w-6 text-emerald-600" />
            {p.commissionTitle}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bengali mt-1">
            {p.commissionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Shield, text: p.commissionPoint1 },
            { icon: DollarSign, text: p.commissionPoint2 },
            { icon: Sparkles, text: p.commissionPoint3 },
            { icon: TrendingUp, text: p.commissionPoint4 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                <CardContent className="pt-6 flex flex-col gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bengali leading-relaxed">
                    {item.text}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interactive Calculator */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
              {locale === 'bn' ? 'টিউশন ফি ও পারিশ্রমিক ক্যালকুলেটর' : 'Tuition & Earnings Calculator'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bengali">
              {locale === 'bn'
                ? 'ঘণ্টা ও রেট নির্বাচন করে মাসিক ফি এবং ৯২% শিক্ষক প্রাপ্তি হিসাব করুন'
                : 'Estimate monthly tuition fee and 92% net tutor payout based on hours and hourly rate'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium mb-2 font-bengali">
                <span>{locale === 'bn' ? 'সাপ্তাহিক ঘণ্টা:' : 'Hours per week:'}</span>
                <span className="font-bold text-emerald-600">
                  {formatLocalizedNumber(hoursPerWeek, locale)} {locale === 'bn' ? 'ঘণ্টা' : 'hrs'}
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-2 font-bengali">
                <span>{locale === 'bn' ? 'ঘণ্টাপ্রতি রেট:' : 'Hourly rate:'}</span>
                <span className="font-bold text-emerald-600">
                  ৳{formatLocalizedNumber(hourlyRate, locale)}
                </span>
              </div>
              <input
                type="range"
                min="300"
                max="3000"
                step="50"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400 font-bengali">
                {locale === 'bn' ? 'মাসিক মোট ফি (শিক্ষার্থী জমা):' : 'Gross Monthly Fee:'}
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ৳{formatLocalizedNumber(monthlyGross.toLocaleString(), locale)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-bengali">
                {locale === 'bn' ? 'শিক্ষকের নিট প্রাপ্তি (৯২%):' : 'Tutor Net Payout (92%):'}
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ৳{formatLocalizedNumber(tutorEarnings.toLocaleString(), locale)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bengali">
                {locale === 'bn' ? 'প্ল্যাটফর্ম সার্ভিস ফি (৮%):' : 'Platform Fee (8%):'}
              </span>
              <span>৳{formatLocalizedNumber(platformFee.toLocaleString(), locale)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly Benchmarks Grid */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali">
            {p.benchmarksTitle}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bengali mt-1">
            {p.benchmarksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
            <Card
              key={idx}
              className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {tier.tag}
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-base font-bold font-bengali text-slate-900 dark:text-slate-100">
                  {tier.title}
                </CardTitle>
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 pt-1 font-bengali">
                  {tier.range}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                  {tier.desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
