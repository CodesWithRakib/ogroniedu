'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Sparkles,
  ArrowLeft,
  Lock,
  Star,
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
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Outer Card: Clean Split-Screen Container */}
      <div className="w-full max-w-5xl rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] transition-all">
        {/* ======================================================== */}
        {/* LEFT PANEL: Clean Educational Trust Showcase             */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 xl:p-10 overflow-hidden text-foreground bg-gradient-to-br from-primary-soft/50 via-surface to-surface-muted border-r border-border/80">
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-interactive/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

          {/* Top Bar on Visual Panel */}
          <div className="relative z-10 flex items-center justify-between">
            <Link href={withLocale('/', locale)} className="inline-flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-foreground leading-none">
                  Ogroni
                  <span className="text-primary font-sans font-extrabold text-sm ml-0.5">
                    {isBn ? 'এডু' : 'Edu'}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {isBn ? 'বিশ্বস্ত শিক্ষা প্ল্যাটফর্ম' : 'Trusted Tutoring Platform'}
                </span>
              </div>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/70 text-[11px] font-semibold text-muted-foreground shadow-2xs">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{isBn ? 'স্মার্ট লার্নিং' : 'Smart Learning'}</span>
            </span>
          </div>

          {/* Middle: Value Proposition Pillars */}
          <div className="relative z-10 my-8 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBn ? 'শিক্ষা ও নিরাপত্তার অঙ্গীকার' : 'Educational Trust'}
              </span>
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-foreground font-bengali leading-snug">
                {isBn
                  ? 'সঠিক শিক্ষক, নিশ্চিত ক্লাস ও সুরক্ষিত এসক্রো পেমেন্ট।'
                  : 'Verified Tutors, Guaranteed Classes & Escrow Protection.'}
              </h2>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/80 text-xs font-medium text-foreground shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>
                  {isBn
                    ? '১০০% এনআইডি ও সনদ যাচাইকৃত শিক্ষক'
                    : '100% NID & verified credentials for every tutor'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/80 text-xs font-medium text-foreground shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-interactive shrink-0" />
                <span>
                  {isBn
                    ? 'ক্লাস যাচাই সাপেক্ষে নিরাপদ এসক্রো পেমেন্ট'
                    : 'Funds protected in escrow until session completion'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof / Tutor Testimonial Card */}
          <div className="relative z-10 rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                তা
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {isBn ? 'ডাঃ তানভীর আহমেদ' : 'Dr. Tanvir Ahmed'}
                  </h4>
                  <div className="flex items-center text-warning text-[10px]">
                    <Star className="h-3 w-3 fill-warning" />
                    <span className="font-bold ml-0.5">৫.০</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isBn ? 'বুয়েট ও ঢাবি মেন্টর | পদার্থবিজ্ঞান' : 'BUET & DU Mentor | Physics'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              {isBn
                ? '“অগ্রণী এডুর এসক্রো ও লাইভ ক্লাস শিডিউলার শিক্ষক ও শিক্ষার্থীর মধ্যে স্বচ্ছ ও নির্ভরযোগ্য পরিবেশ নিশ্চিত করেছে।”'
                : '“OgroniEdu’s escrow system and live timetable provide unmatched trust and seamless learning for both tutors and students.”'}
            </p>
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{isBn ? 'প্রচ্ছদ' : 'Home'}</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href={targetPath}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/80 bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-colors"
                title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              >
                <Globe className="h-3.5 w-3.5 text-interactive" />
                <span>{isBn ? 'EN' : 'বাং'}</span>
              </Link>
            </div>
          </div>

          {/* Form Header */}
          <div className="my-auto py-4 max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="lg:hidden flex items-center justify-center sm:justify-start gap-2 mb-3">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-serif text-lg font-bold">
                  {isBn ? 'অগ্রণী এডু' : 'OgroniEdu'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-bengali">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* 1-Click Demo Accounts Quick-Fill Strip (development/test builds only) */}
            {onQuickFill && isDemoQuickFillAllowed() && (
              <div className="rounded-xl border border-border/80 bg-surface/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>
                    {isBn
                      ? '⚡ এক ক্লিকে ডেমো অ্যাকাউন্ট নির্বাচন করুন:'
                      : '⚡ 1-Click Demo Quick Fill:'}
                  </span>
                  <span className="text-[10px] text-primary font-mono font-bold">OgroniDev#2026</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => onQuickFill(acc.email, acc.pass)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-border/70 bg-card text-xs font-medium transition-colors cursor-pointer hover:border-border',
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
          <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-success" />
              <span>
                {isBn ? '২৫৬-বিট সুরক্ষিত এসএসএল এনক্রিপশন' : '256-bit Secure SSL Encryption'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={withLocale('/privacy', locale)} className="hover:underline">
                {isBn ? 'গোপনীয়তা' : 'Privacy'}
              </Link>
              <span>•</span>
              <Link href={withLocale('/terms', locale)} className="hover:underline">
                {isBn ? 'শর্তাবলী' : 'Terms'}
              </Link>
              <span>•</span>
              <Link href={withLocale('/safety', locale)} className="hover:underline">
                {isBn ? 'নিরাপত্তা' : 'Safety'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
