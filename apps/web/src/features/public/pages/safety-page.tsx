'use client';

import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getDictionary, type Locale } from '@/lib/i18n';

/** Public safety entry: protection pillars plus emergency-reporting guidance. */
export function SafetyPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.safetyPage;

  const safetyPillars = [
    {
      icon: UserCheck,
      title: p.minorPolicyHeading,
      desc: p.minorPolicyDesc,
      badge: locale === 'bn' ? 'অভিভাবক সম্মতি' : 'Minor Consent',
    },
    {
      icon: ShieldCheck,
      title: p.screeningHeading,
      desc: p.screeningDesc,
      badge: locale === 'bn' ? 'NID ও সনদ স্ক্রীনিং' : 'Background Screening',
    },
    {
      icon: MessageSquare,
      title: p.monitoredChatHeading,
      desc: p.monitoredChatDesc,
      badge: locale === 'bn' ? 'ফিল্টার্ড ইন-অ্যাপ চ্যাট' : 'Monitored Chat',
    },
    {
      icon: AlertTriangle,
      title: p.emergencyEscalationHeading,
      desc: p.emergencyEscalationDesc,
      badge: locale === 'bn' ? 'জরুরি এসকেলেশন' : '24/7 Escalation',
    },
    {
      icon: RotateCcw,
      title: p.replacementGuaranteeHeading,
      desc: p.replacementGuaranteeDesc,
      badge: locale === 'bn' ? '১০০% রিপ্লেসমেন্ট' : 'Guarantee Claim',
    },
  ];

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

      {/* Safety Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {safetyPillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <Card
              key={idx}
              className="bg-card border-border/80 rounded-2xl shadow-xs hover:shadow-card hover:border-primary/40 transition-all relative overflow-hidden"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 p-6 pb-2">
                <div className="h-12 w-12 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <Badge
                  variant="outline"
                  className="text-xs rounded-full px-2.5 py-0.5 border-border/80 text-muted-foreground"
                >
                  {pillar.badge}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 p-6 pt-2">
                <CardTitle className="text-lg font-bold font-bengali text-foreground">
                  {pillar.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground font-bengali leading-relaxed">
                  {pillar.desc}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Emergency Reporting Guidance */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-destructive font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
            <span>
              {locale === 'bn' ? 'জরুরি নিরাপত্তা সাপোর্ট' : 'Emergency Child Safety Protocol'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground font-bengali max-w-xl leading-relaxed">
            {locale === 'bn'
              ? 'যেকোনো অসদাচরণ বা অনৈতিক আচরণ পরিলক্ষিত হলে অবিলম্বে রিপোর্ট করুন। আমাদের নিরাপত্তা দল তাৎক্ষণিক তদন্ত শুরু করবে।'
              : 'If you encounter any inappropriate conduct or safety violation, file a report immediately. Our Dhaka compliance team prioritizes incident reviews.'}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full px-6 font-semibold font-bengali whitespace-nowrap border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Link href={`/${locale}/contact`} className="flex items-center gap-2">
            <span>{dict.nav.contact}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
