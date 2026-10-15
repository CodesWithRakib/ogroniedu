'use client';

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

/** Public how-it-works entry: student and tutor step guides with HowTo microdata. */
export function HowItWorksPage({ locale }: { locale: Locale }) {
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
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
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
        <Badge
          variant="outline"
          className="text-primary border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
        >
          {p.badge}
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-bengali">
          {p.title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-bengali leading-relaxed">
          {p.subtitle}
        </p>
      </div>

      {/* Section 1: For Students & Guardians */}
      <section className="space-y-8">
        <div className="border-b border-border/70 pb-4">
          <h2 className="text-2xl font-bold text-foreground font-bengali flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span>{p.forStudentsHeading}</span>
          </h2>
          <p className="text-sm text-muted-foreground font-bengali mt-1">
            {p.forStudentsSubheading}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={idx}
                className="bg-card/85 backdrop-blur-sm border-border/80 rounded-3xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-soft text-primary font-mono">
                    {step.tag}
                  </span>
                </div>
                <CardHeader className="p-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 mb-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-bold font-bengali text-foreground">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground font-bengali leading-relaxed">
                    {step.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link href={`/${locale}/tutors`}>
            <Button
              size="lg"
              className="rounded-full px-8 font-bold shadow-md shadow-primary/25 font-bengali"
            >
              {dict.nav.findTutors}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 2: For Tutors */}
      <section className="space-y-8 pt-8">
        <div className="border-b border-border/70 pb-4">
          <h2 className="text-2xl font-bold text-foreground font-bengali flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span>{p.forTutorsHeading}</span>
          </h2>
          <p className="text-sm text-muted-foreground font-bengali mt-1">{p.forTutorsSubheading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={idx}
                className="bg-card/85 backdrop-blur-sm border-border/80 rounded-3xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface-muted text-muted-foreground font-mono">
                    {step.tag}
                  </span>
                </div>
                <CardHeader className="p-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 mb-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-bold font-bengali text-foreground">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground font-bengali leading-relaxed">
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
