'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Award,
  Lock,
  Globe,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface AuthShellProps {
  locale: Locale;
  mode: 'login' | 'register';
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onQuickFill?: (identifier: string, pass: string) => void;
}

/**
 * The 1-click demo strip exposes the seeded dev password, so it is rendered in
 * development/test builds only - never in a production bundle.
 */
function isDemoQuickFillAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function AuthShell({ locale, title, subtitle, children, onQuickFill }: AuthShellProps) {
  const pathname = usePathname();
  const isBn = locale === 'bn';
  const targetLocale: Locale = isBn ? 'en' : 'bn';

  const targetPath = pathname
    ? pathname.replace(new RegExp(`^/${locale}`), `/${targetLocale}`)
    : `/${targetLocale}`;

  const demoAccounts = [
    {
      role: isBn ? 'শিক্ষার্থী' : 'Student',
      email: 'student.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '🎓',
    },
    {
      role: isBn ? 'অভিভাবক' : 'Guardian',
      email: 'guardian.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '🛡️',
    },
    {
      role: isBn ? 'শিক্ষক' : 'Tutor',
      email: 'tutor.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '📚',
    },
    {
      role: isBn ? 'অ্যাডমিন' : 'Admin',
      email: 'admin.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '⚡',
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-background">
      {/* Main Container Card */}
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* ======================================================== */}
        {/* LEFT PANEL: Educational Trust Showcase                    */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 text-foreground bg-muted/30 border-r border-border">
          {/* Top Bar: Brand & Badge */}
          <div className="flex items-center justify-between">
            <Link href={withLocale('/', locale)} className="inline-flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold transition-transform group-hover:scale-105">
                <GraduationCap className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-foreground leading-none">
                  Ogroni
                  <span className="text-primary font-bold text-sm ml-0.5">
                    {isBn ? 'এডু' : 'Edu'}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {isBn ? 'নির্ভরযোগ্য টিউটরিং প্ল্যাটফর্ম' : 'Trusted Learning & Mentorship'}
                </span>
              </div>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{isBn ? 'স্মার্ট লার্নিং' : 'Smart Learning'}</span>
            </span>
          </div>

          {/* Middle: Educational Pillars */}
          <div className="my-auto py-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {isBn ? 'বিশ্বাস ও নিরাপত্তা' : 'Educational Trust & Security'}
              </span>
              <h2 className="text-xl xl:text-2xl font-bold tracking-tight text-foreground font-bengali leading-snug">
                {isBn
                  ? 'যাচাইকৃত শিক্ষক ও গ্যারান্টেড ক্লাস'
                  : 'Verified Mentorship & Guaranteed Classes'}
              </h2>
            </div>

            {/* Emblem */}
            <div className="flex items-center justify-start py-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="h-6 w-6 stroke-[2.3]" />
              </div>
            </div>

            {/* Feature Cards */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-foreground">
                    {isBn ? '১০০% এসক্রো সুরক্ষিত পেমেন্ট' : '100% Escrow Payment Protection'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'ক্লাস সম্পন্ন হওয়ার পরেই অর্থ শিক্ষককে প্রদান করা হয়।'
                      : 'Funds are securely released only upon verified session completion.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-foreground">
                    {isBn ? '৫০,০০০+ সফল সেশন সম্পন্ন' : '50,000+ Completed Learning Sessions'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'সারাদেশের শিক্ষার্থী ও অভিভাবকদের আস্থার প্রতীক।'
                      : 'Trusted by students, guardians & educators nationwide.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-foreground">
                    {isBn ? 'দেশসেরা বিশ্ববিদ্যালয়ের শিক্ষকবৃন্দ' : 'Top University Mentors'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'জাতীয় পরিচয়পত্র ও সনদপত্র যাচাইকৃত মেধা।'
                      : 'Every educator verified with government NID & academic credentials.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Note */}
          <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {isBn ? '⭐ ৪.৯/৫.০ শিক্ষার্থী সন্তুষ্টি' : '⭐ 4.9/5.0 Student Rating'}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {isBn ? '১২,০০০+ সক্রিয় শিক্ষার্থী' : '12,000+ Active Students'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Auth Form Container                         */}
        {/* ======================================================== */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 xl:p-10 bg-card">
          {/* Top Utilities */}
          <div className="flex items-center justify-between gap-2 pb-4">
            <Link
              href={withLocale('/', locale)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>{isBn ? 'হোমে ফিরে যান' : 'Back to Home'}</span>
            </Link>

            <Link
              href={targetPath}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all"
              title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            >
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </Link>
          </div>

          {/* Form Header & Content */}
          <div className="my-auto py-2 max-w-md w-full mx-auto flex flex-col gap-5">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <div className="lg:hidden flex items-center justify-center sm:justify-start gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <GraduationCap className="h-5 w-5 stroke-[2.3]" />
                </div>
                <span className="text-base font-bold tracking-tight text-foreground">
                  Ogroni<span className="text-primary">{isBn ? 'এডু' : 'Edu'}</span>
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-bengali">
                {title}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* 1-Click Demo Accounts Quick-Fill Strip */}
            {onQuickFill && isDemoQuickFillAllowed() && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>
                      {isBn ? '১ ক্লিকে টেস্ট অ্যাকাউন্ট পূরণ করুন:' : '1-Click Demo Quick Fill:'}
                    </span>
                  </span>
                  <span className="text-[10px] text-primary font-mono font-bold">
                    OgroniDev#2026
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => onQuickFill(acc.email, acc.pass)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border border-border bg-card text-xs font-medium transition-all cursor-pointer hover:bg-accent active:scale-95 text-foreground',
                      )}
                    >
                      <span>{acc.icon}</span>
                      <span>{acc.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Slot */}
            {children}
          </div>

          {/* Bottom Security Seals */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <Lock className="h-3.5 w-3.5" />
              <span>
                {isBn ? '২৫৬-বিট সুরক্ষিত এসএসএল এনক্রিপশন' : '256-bit Secure SSL Encryption'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Link
                href={withLocale('/privacy', locale)}
                className="hover:text-foreground hover:underline"
              >
                {isBn ? 'গোপনীয়তা' : 'Privacy'}
              </Link>
              <span>•</span>
              <Link
                href={withLocale('/terms', locale)}
                className="hover:text-foreground hover:underline"
              >
                {isBn ? 'শর্তাবলী' : 'Terms'}
              </Link>
              <span>•</span>
              <Link
                href={withLocale('/safety', locale)}
                className="hover:text-foreground hover:underline"
              >
                {isBn ? 'নিরাপত্তা' : 'Safety'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
