'use client';

import Link from 'next/link';
import {
  DollarSign,
  Shield,
  Sparkles,
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/slider';
import { getDictionary, formatLocalizedNumber, type Locale } from '@/lib/i18n';
import { formatGroupedNumber } from '@/lib/format';
import { usePricingCalculator } from '../hooks/use-pricing-calculator';

/** Public pricing entry: commission breakdown, interactive fee calculator, and benchmarks. */
export function PricingPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.pricingPage;
  const _isBn = locale === 'bn';
  const calc = usePricingCalculator(locale);
  const {
    hoursPerWeek,
    setHoursPerWeek,
    hourlyRate,
    setHourlyRate,
    monthlyGross,
    tutorEarnings,
    platformFee,
    tiers,
  } = calc;

  return (
    <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge
          variant="secondary"
          className="text-primary border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full"
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

      {/* Free for Students Banner */}
      <div className="rounded-2xl bg-primary-soft/40 border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs font-semibold text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {locale === 'bn' ? 'অভিভাবকদের জন্য সম্পূর্ণ ফ্রি' : '100% Free For Parents'}
            </span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground font-bengali">
            {p.studentFreeNotice}
          </p>
        </div>
        <Button
          asChild
          className="rounded-full px-7 font-semibold shadow-xs font-bengali whitespace-nowrap"
        >
          <Link href={`/${locale}/tutors`} className="flex items-center gap-2">
            <span>{dict.nav.findTutors}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* 8% Platform Commission Breakdown */}
      <section className="space-y-8">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground font-bengali flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Percent className="h-4 w-4" />
            </div>
            <span>{p.commissionTitle}</span>
          </h2>
          <p className="text-sm text-muted-foreground font-bengali mt-1">{p.commissionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Shield, text: p.commissionPoint1 },
            { icon: DollarSign, text: p.commissionPoint2 },
            { icon: Sparkles, text: p.commissionPoint3 },
            { icon: TrendingUp, text: p.commissionPoint4 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className="bg-card border-border rounded-2xl shadow-xs hover:shadow-xs hover:border-primary/40 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5"
              >
                <CardContent className="p-6 flex flex-col gap-3">
                  <div
                    className="h-11 w-11 rounded-xl bg-primary-soft flex items-center justify-center text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-bengali leading-relaxed">
                    {item.text}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interactive Calculator */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center"
            aria-hidden="true"
          >
            <Calculator className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground font-bengali">
              {locale === 'bn'
                ? 'টিউশন ফি ও পারিশ্রমিক ক্যালকুলেটর'
                : 'Tuition & Earnings Calculator'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-bengali">
              {locale === 'bn'
                ? 'ঘণ্টা ও রেট নির্বাচন করে মাসিক ফি এবং ৯২% শিক্ষক প্রাপ্তি হিসাব করুন'
                : 'Estimate monthly tuition fee and 92% net tutor payout based on hours and hourly rate'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2 font-bengali">
                <span className="text-muted-foreground">
                  {locale === 'bn' ? 'সাপ্তাহিক ঘণ্টা:' : 'Hours per week:'}
                </span>
                <span className="font-bold text-primary">
                  {formatLocalizedNumber(hoursPerWeek, locale)} {locale === 'bn' ? 'ঘণ্টা' : 'hrs'}
                </span>
              </div>
              <Slider
                min={2}
                max={20}
                step={1}
                value={[hoursPerWeek]}
                onValueChange={(val) => setHoursPerWeek(val[0] ?? 2)}
                className="w-full cursor-pointer py-1"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-2 font-bengali">
                <span className="text-muted-foreground">
                  {locale === 'bn' ? 'ঘণ্টাপ্রতি রেট:' : 'Hourly rate:'}
                </span>
                <span className="font-bold text-primary">
                  ৳{formatLocalizedNumber(hourlyRate, locale)}
                </span>
              </div>
              <Slider
                min={300}
                max={3000}
                step={50}
                value={[hourlyRate]}
                onValueChange={(val) => setHourlyRate(val[0] ?? 300)}
                className="w-full cursor-pointer py-1"
              />
            </div>
          </div>

          <div className="rounded-xl bg-muted/30 p-6 border border-border space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-bengali">
                {locale === 'bn' ? 'মাসিক মোট ফি (শিক্ষার্থী জমা):' : 'Gross Monthly Fee:'}
              </span>
              <span className="text-lg font-bold text-foreground">
                ৳{formatGroupedNumber(monthlyGross, locale)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-primary font-semibold font-bengali">
                {locale === 'bn' ? 'শিক্ষকের নিট প্রাপ্তি (৯২%):' : 'Tutor Net Payout (92%):'}
              </span>
              <span className="text-xl font-extrabold text-primary">
                ৳{formatGroupedNumber(tutorEarnings, locale)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border">
              <span className="font-bengali">
                {locale === 'bn' ? 'প্ল্যাটফর্ম সার্ভিস ফি (৮%):' : 'Platform Fee (8%):'}
              </span>
              <span className="font-semibold text-foreground">
                ৳{formatGroupedNumber(platformFee, locale)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly Benchmarks Grid */}
      <section className="space-y-8">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground font-bengali">{p.benchmarksTitle}</h2>
          <p className="text-sm text-muted-foreground font-bengali mt-1">{p.benchmarksSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier, idx) => (
            <Card
              key={idx}
              className="bg-card border-border rounded-2xl shadow-xs relative overflow-hidden hover:border-primary/40 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5"
            >
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  {tier.tag}
                </span>
              </div>
              <CardHeader className="p-6">
                <CardTitle className="text-base font-bold font-bengali text-foreground">
                  {tier.title}
                </CardTitle>
                <div className="text-xl font-extrabold text-primary pt-1 font-bengali tabular-nums">
                  {tier.range}
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="text-xs sm:text-sm text-muted-foreground font-bengali leading-relaxed">
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
