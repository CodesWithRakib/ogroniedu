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
import { ThemePicker } from '@/components/theme/ThemePicker';
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

export function AuthShell({
  locale,
  mode,
  title,
  subtitle,
  children,
  onQuickFill,
}: AuthShellProps) {
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
      badgeClass: 'hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      role: isBn ? 'অভিভাবক' : 'Guardian',
      email: 'guardian.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '🛡️',
      badgeClass: 'hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      role: isBn ? 'শিক্ষক' : 'Tutor',
      email: 'tutor.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '👨‍🏫',
      badgeClass: 'hover:border-teal-500 hover:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      role: isBn ? 'অ্যাডমিন' : 'Admin',
      email: 'admin.demo@ogroniedu.com',
      pass: 'OgroniDev#2026',
      icon: '⚡',
      badgeClass: 'hover:border-violet-500 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Outer Card: Nebula Exchange-inspired split-screen container */}
      <div className="w-full max-w-6xl rounded-3xl lg:rounded-4xl border border-border/80 bg-card shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] transition-all">
        {/* ======================================================== */}
        {/* LEFT PANEL: Cinematic Visual Art Panel (Nebula Style)    */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-6 relative flex-col justify-between p-8 xl:p-10 overflow-hidden text-white bg-slate-950">
          {/* Background Illustration Asset */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url('/images/auth-showcase.jpg')` }}
          />

          {/* Atmospheric Gradient Overlays for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />

          {/* Top Bar on Visual Panel */}
          <div className="relative z-10 flex items-center justify-between">
            <Link
              href={withLocale('/', locale)}
              className="inline-flex items-center gap-2.5 group"
            >
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-serif text-lg font-bold tracking-tight text-white leading-none">
                  {isBn ? 'অগ্রণী' : 'Ogroni'}<span className="text-primary font-sans font-extrabold text-sm ml-0.5">{isBn ? 'এডু' : 'Edu'}</span>
                </span>
                <span className="text-[10px] text-white/70 font-medium mt-0.5">
                  {isBn ? 'বিশ্বস্ত শিক্ষা প্ল্যাটফর্ম' : 'Trusted Tutoring Platform'}
                </span>
              </div>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/90">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'স্মার্ট লার্নিং ২০২৬' : 'Smart Learning 2026'}</span>
            </span>
          </div>

          {/* Middle: Value Proposition Pillars */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isBn ? 'শিক্ষা ও নিরাপত্তার নতুন দিগন্ত' : 'Next-Gen Educational Trust'}
              </span>
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white font-bengali leading-snug">
                {isBn
                  ? 'সঠিক শিক্ষক, নিশ্চিত ক্লাস ও সুরক্ষিত এসক্রো পেমেন্ট।'
                  : 'Verified Tutors, Guaranteed Classes & Escrow Protection.'}
              </h2>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-xs font-medium text-white/90">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{isBn ? '১০০% এনআইডি ও সনদ যাচাইকৃত শিক্ষক' : '100% NID & verified credentials for every tutor'}</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 text-xs font-medium text-white/90">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{isBn ? 'ক্লাস যাচাই সাপেক্ষে নিরাপদ এসক্রো পেমেন্ট' : 'Funds protected in escrow until session completion'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof / Tutor Testimonial Card (Donezo / Nebula Style) */}
          <div className="relative z-10 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="relative h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-primary-hover border-2 border-white/30 flex items-center justify-center font-bold text-white text-sm shrink-0">
                তা
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white truncate">
                    {isBn ? 'ডাঃ তানভীর আহমেদ' : 'Dr. Tanvir Ahmed'}
                  </h4>
                  <div className="flex items-center text-amber-400 text-[10px]">
                    <Star className="h-3 w-3 fill-amber-400" />
                    <span className="font-bold ml-0.5">৫.০</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/70 truncate">
                  {isBn ? 'বুয়েট ও ঢাবি মেন্টর | পদার্থবিজ্ঞান' : 'BUET & DU Mentor | Physics'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed italic">
              {isBn
                ? '“অগ্রণী এডুর এসক্রো ও লাইভ ক্লাস শিডিউলার শিক্ষক ও শিক্ষার্থীর মধ্যে স্বচ্ছ ও নির্ভরযোগ্য পরিবেশ নিশ্চিত করেছে।”'
                : '“OgroniEdu’s escrow system and live timetable provide unmatched trust and seamless learning for both tutors and students.”'}
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Polished Auth Form Container (Nebula Style) */}
        {/* ======================================================== */}
        <div className="col-span-1 lg:col-span-6 flex flex-col justify-between p-6 sm:p-8 xl:p-10 bg-card">
          {/* Top Utilities: Back Link + Theme Picker + Language Switcher */}
          <div className="flex items-center justify-between gap-2 pb-4">
            <Link
              href={withLocale('/', locale)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>{isBn ? 'প্রচ্ছদ' : 'Home'}</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemePicker />
              <Link
                href={targetPath}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-all shadow-2xs"
                title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
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
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {subtitle}
              </p>
            </div>

            {/* 1-Click Demo Accounts Quick-Fill Strip for Evaluators */}
            {onQuickFill && (
              <div className="rounded-2xl border border-border/80 bg-surface/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span>{isBn ? '⚡ এক ক্লিকে ডেমো অ্যাকাউন্ট নির্বাচন করুন:' : '⚡ 1-Click Demo Quick Fill:'}</span>
                  <span className="text-[10px] text-primary font-mono">OgroniDev#2026</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => onQuickFill(acc.email, acc.pass)}
                      className={cn(
                        'flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border border-border/70 bg-card text-[11px] font-bold transition-all shadow-2xs cursor-pointer',
                        acc.badgeClass
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
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isBn ? '২৫৬-বিট সুরক্ষিত এসএসএল এনক্রিপশন' : '256-bit Secure SSL Encryption'}</span>
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
