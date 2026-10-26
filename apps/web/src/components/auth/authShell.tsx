'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Award,
  Star,
  Lock,
  Globe,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
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
 * development/test builds only — never in a production bundle.
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
      badgeClass: 'hover:border-primary/50 hover:bg-primary-soft text-foreground',
    },
    {
      role: isBn ? 'অভিভাবক' : 'Guardian',
      email: 'guardian.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '🛡️',
      badgeClass: 'hover:border-warning/50 hover:bg-warning-soft text-foreground',
    },
    {
      role: isBn ? 'শিক্ষক' : 'Tutor',
      email: 'tutor.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '👨‍🏫',
      badgeClass: 'hover:border-primary/50 hover:bg-primary-soft text-foreground',
    },
    {
      role: isBn ? 'অ্যাডমিন' : 'Admin',
      email: 'admin.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '⚡',
      badgeClass: 'hover:border-interactive/50 hover:bg-interactive-soft text-foreground',
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden">
      {/* Background Ambient Lighting & Micro-Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-100/60 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-100/50 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Container Card: Modern Elevated Split-Screen */}
      <div className="w-full max-w-5xl rounded-3xl border border-border/90 bg-card shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] transition-all">
        {/* ======================================================== */}
        {/* LEFT PANEL: Universal Abstract Educational Showcase      */}
        {/* Strictly NO human photos, NO personal names             */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 xl:p-10 overflow-hidden text-foreground bg-gradient-to-br from-blue-50/70 via-surface to-indigo-50/30 border-r border-border">
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar on Visual Panel: Brand & Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <Link href={withLocale('/', locale)} className="inline-flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-foreground leading-none">
                  Ogroni
                  <span className="text-primary font-sans font-extrabold text-sm ml-0.5">
                    {isBn ? 'এডু' : 'Edu'}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {isBn ? 'বিশ্বস্ত শিক্ষা ও মেন্টরিং' : 'Trusted Learning & Mentorship'}
                </span>
              </div>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-border shadow-2xs text-[11px] font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
              <span>{isBn ? 'স্মার্ট লার্নিং' : 'Smart Learning'}</span>
            </span>
          </div>

          {/* Middle: Universal Educational Pillars & Abstract Visual */}
          <div className="relative z-10 my-auto py-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBn ? 'শিক্ষা ও নিরাপত্তার অঙ্গীকার' : 'Educational Trust & Security'}
              </span>
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-foreground font-bengali leading-snug">
                {isBn
                  ? 'সঠিক শিক্ষক ও নিশ্চিত ক্লাস।'
                  : 'Verified Mentorship & Guaranteed Classes.'}
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                  {isBn ? 'সুপ্ত মেধার শ্রেষ্ঠ বিকাশ।' : 'Unlock Boundless Potential.'}
                </span>
              </h2>
            </div>

            {/* Glowing Abstract Educational Emblem */}
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-teal-400/20 blur-xl animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/20 ring-4 ring-white/80">
                <GraduationCap className="h-8 w-8 stroke-[2.3]" />
              </div>
            </div>

            {/* Universal Feature Metric Cards (Face-Free, Name-Free) */}
            <div className="space-y-3 pt-1">
              {/* Card 1: Escrow Protection */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/90 border border-border/80 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? '১০০% সুরক্ষিত এসক্রো পেমেন্ট' : '100% Escrow Payment Protection'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'ক্লাস সম্পন্ন ও সন্তুষ্টির পরই কেবল পেমেন্ট রিলিজ হয়।'
                      : 'Funds are securely released only upon verified session completion.'}
                  </p>
                </div>
              </div>

              {/* Card 2: Completed Sessions */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/90 border border-border/80 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <TrendingUp className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? '৫০,০০০+ সফল লার্নিং সেশন' : '50,000+ Verified Learning Sessions'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'সারাদেশের শিক্ষার্থী ও অভিভাবকদের নিয়মিত পছন্দ ও আস্থা।'
                      : 'Trusted everyday by students, parents & educators nationwide.'}
                  </p>
                </div>
              </div>

              {/* Card 3: Top University Mentorship */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/90 border border-border/80 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Award className="h-5 w-5 stroke-[2.2]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? 'বুয়েট, ঢাবি ও মেডিকেল টিউটর' : 'BUET, DU & Medical Mentors'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? '১০০% এনআইডি ও অ্যাকাডেমিক সার্টিফিকেট যাচাইকৃত।'
                      : 'Every educator verified with government NID & academic credentials.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof Bar (Universal Platform Trust, No Personal Names) */}
          <div className="relative z-10 rounded-2xl border border-border/80 bg-white/95 p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center text-amber-500 text-xs tracking-tighter"
                aria-hidden="true"
              >
                ★★★★★
              </div>
              <span className="text-xs font-black text-foreground">৪.৯/৫.০</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-semibold truncate">
              {isBn ? '১২,০০০+ সন্তুষ্ট শিক্ষার্থীর আস্থা' : 'Trusted by 12,000+ students'}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Auth Form Container                         */}
        {/* ======================================================== */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 xl:p-10 bg-card">
          {/* Top Utilities: Back Link + Language Switcher */}
          <div className="flex items-center justify-between gap-2 pb-4">
            <Link
              href={withLocale('/', locale)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>{isBn ? 'প্রচ্ছদে ফিরে যান' : 'Back to Home'}</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href={targetPath}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface hover:bg-surface-hover text-xs font-bold text-foreground shadow-2xs transition-all active:scale-95"
                title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              >
                <Globe className="h-3.5 w-3.5 text-interactive" />
                <span>{isBn ? 'English' : 'বাংলা'}</span>
              </Link>
            </div>
          </div>

          {/* Form Header */}
          <div className="my-auto py-2 max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="lg:hidden flex items-center justify-center sm:justify-start gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <GraduationCap className="h-5 w-5 stroke-[2.3]" />
                </div>
                <span className="text-base font-extrabold tracking-tight text-foreground">
                  Ogroni<span className="text-primary">{isBn ? 'এডু' : 'Edu'}</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-bengali">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* 1-Click Demo Accounts Quick-Fill Strip (development/test builds only) */}
            {onQuickFill && isDemoQuickFillAllowed() && (
              <div className="rounded-2xl border border-border/80 bg-surface/70 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400" />
                    <span>
                      {isBn ? 'এক ক্লিকে ডেমো অ্যাকাউন্ট নির্বাচন:' : '1-Click Demo Quick Fill:'}
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
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border border-border/80 bg-card text-xs font-semibold transition-all cursor-pointer hover:border-primary/40 hover:shadow-2xs active:scale-95',
                        acc.badgeClass,
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

          {/* Bottom Security Seals & Compliance Note */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
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
