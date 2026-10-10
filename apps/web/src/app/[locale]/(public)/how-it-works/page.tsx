'use client';

import React, { use } from 'react';
import Link from 'next/link';
import {
  Search,
  Send,
  CreditCard,
  BookOpen,
  ShieldCheck,
  Award,
  Calendar,
  DollarSign,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function HowItWorksPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const dict = getDictionary(locale);
  const p = dict.howItWorksPage;

  const studentSteps = [
    {
      icon: Search,
      title: p.studentStep1Title,
      desc: p.studentStep1Desc,
      tag: locale === 'bn' ? 'ধাপ ১' : 'Step 1',
    },
    {
      icon: Send,
      title: p.studentStep2Title,
      desc: p.studentStep2Desc,
      tag: locale === 'bn' ? 'ধাপ ২' : 'Step 2',
    },
    {
      icon: CreditCard,
      title: p.studentStep3Title,
      desc: p.studentStep3Desc,
      tag: locale === 'bn' ? 'ধাপ ৩' : 'Step 3',
    },
    {
      icon: BookOpen,
      title: p.studentStep4Title,
      desc: p.studentStep4Desc,
      tag: locale === 'bn' ? 'ধাপ ৪' : 'Step 4',
    },
    {
      icon: ShieldCheck,
      title: p.studentStep5Title,
      desc: p.studentStep5Desc,
      tag: locale === 'bn' ? 'ধাপ ৫' : 'Step 5',
    },
  ];

  const tutorSteps = [
    {
      icon: GraduationCap,
      title: p.tutorStep1Title,
      desc: p.tutorStep1Desc,
      tag: locale === 'bn' ? 'ধাপ ১' : 'Step 1',
    },
    {
      icon: Award,
      title: p.tutorStep2Title,
      desc: p.tutorStep2Desc,
      tag: locale === 'bn' ? 'ধাপ ২' : 'Step 2',
    },
    {
      icon: Calendar,
      title: p.tutorStep3Title,
      desc: p.tutorStep3Desc,
      tag: locale === 'bn' ? 'ধাপ ৩' : 'Step 3',
    },
    {
      icon: BookOpen,
      title: p.tutorStep4Title,
      desc: p.tutorStep4Desc,
      tag: locale === 'bn' ? 'ধাপ ৪' : 'Step 4',
    },
    {
      icon: DollarSign,
      title: p.tutorStep5Title,
      desc: p.tutorStep5Desc,
      tag: locale === 'bn' ? 'ধাপ ৫' : 'Step 5',
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Schema.org HowTo Microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: p.title,
            description: p.subtitle,
            step: studentSteps.map((s, idx) => ({
              '@type': 'HowToStep',
              position: idx + 1,
              name: s.title,
              text: s.desc,
            })),
          }),
        }}
      />

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

      {/* Section 1: For Students & Guardians */}
      <section className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            {p.forStudentsHeading}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bengali mt-1">
            {p.forStudentsSubheading}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={idx}
                className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {step.tag}
                  </span>
                </div>
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-bold font-bengali text-slate-900 dark:text-slate-100">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                    {step.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link href={`/${locale}/tutors`}>
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-bengali px-6">
              {dict.nav.findTutors}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 2: For Tutors */}
      <section className="space-y-8 pt-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-bengali flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            {p.forTutorsHeading}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bengali mt-1">
            {p.forTutorsSubheading}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={idx}
                className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {step.tag}
                  </span>
                </div>
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-bold font-bengali text-slate-900 dark:text-slate-100">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bengali leading-relaxed">
                    {step.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
