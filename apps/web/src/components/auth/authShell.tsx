'use client';

import React, { useState } from 'react';
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
  KeyRound,
  CheckCircle2,
  UserCheck,
  Shield,
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
 * The 1-click demo strip exposes the seeded dev credentials, so it is rendered in
 * development/test builds only - never in a production bundle.
 */
function isDemoQuickFillAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function AuthShell({ locale, title, subtitle, children, onQuickFill }: AuthShellProps) {
  const pathname = usePathname();
  const isBn = locale === 'bn';
  const targetLocale: Locale = isBn ? 'en' : 'bn';
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const targetPath = pathname
    ? pathname.replace(new RegExp(`^/${locale}`), `/${targetLocale}`)
    : `/${targetLocale}`;

  const demoAccounts = [
    {
      id: 'super_admin',
      role: isBn ? 'সুপার অ্যাডমিন' : 'Super Admin',
      name: isBn ? 'প্ল্যাটফর্ম ওনার' : 'Platform Owner',
      subtitle: isBn ? 'মাস্টার অ্যাক্সেস' : 'Master Authority',
      email: 'admin.demo@ogroniedu.com',
      pass: 'Password123!',
      icon: Sparkles,
      borderClass: 'hover:border-amber-500 focus:border-amber-500',
      activeClass: 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
      iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    },
    {
      id: 'staff_admin',
      role: isBn ? 'স্টাফ অ্যাডমিন' : 'Staff Admin',
      name: isBn ? 'সাদিয়া রহমান' : 'Sadia Rahman',
      subtitle: isBn ? 'অপারেশনস ডেস্ক' : 'Operations Desk',
      email: 'staff.demo@ogroniedu.com',
      pass: 'Password123!',
      icon: Shield,
      borderClass: 'hover:border-cyan-500 focus:border-cyan-500',
      activeClass: 'border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500',
      badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20',
      iconClass: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
    },
    {
      id: 'tutor',
      role: isBn ? 'শিক্ষক' : 'Tutor',
      name: isBn ? 'ইঞ্জিনিয়ার তামিম ইকবাল' : 'Engr. Tamim Iqbal',
      subtitle: isBn ? 'বুয়েট (ভেরিফাইড)' : 'BUET (Verified)',
      email: 'tamim.buet@ogroniedu.com',
      pass: 'Password123!',
      icon: Award,
      borderClass: 'hover:border-purple-500 focus:border-purple-500',
      activeClass: 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20',
      iconClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    },
    {
      id: 'guardian',
      role: isBn ? 'অভিভাবক' : 'Guardian',
      name: isBn ? 'ফারহানা চৌধুরী' : 'Farhana Chowdhury',
      subtitle: isBn ? 'আসিফ-এর মা' : "Asif's Parent",
      email: 'farhana.guardian@ogroniedu.com',
      pass: 'Password123!',
      icon: ShieldCheck,
      borderClass: 'hover:border-emerald-500 focus:border-emerald-500',
      activeClass: 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
      iconClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      id: 'standalone_student',
      role: isBn ? 'স্বাধীন শিক্ষার্থী' : 'Adult Student',
      name: isBn ? 'সাকিব আল হাসান' : 'Sakib Al Hasan',
      subtitle: isBn ? 'স্বতন্ত্র লার্নার' : 'Standalone Learner',
      email: 'sakib.student@ogroniedu.com',
      pass: 'Password123!',
      icon: UserCheck,
      borderClass: 'hover:border-indigo-500 focus:border-indigo-500',
      activeClass: 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500',
      badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20',
      iconClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
    },
    {
      id: 'child_student',
      role: isBn ? 'সন্তান শিক্ষার্থী' : 'Child Student',
      name: isBn ? 'আসিফ ইকবাল' : 'Asif Iqbal',
      subtitle: isBn ? '১০ম শ্রেণি (পিন: ১২৩৪)' : 'Class 10 (PIN: 1234)',
      email: 'STU-783316',
      pass: '1234',
      icon: GraduationCap,
      borderClass: 'hover:border-blue-500 focus:border-blue-500',
      activeClass: 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
      iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
  ];


  const handleSelectAccount = (acc: (typeof demoAccounts)[number]) => {
    setSelectedRole(acc.id);
    if (onQuickFill) {
      onQuickFill(acc.email, acc.pass);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-background">
      {/* Main Container Card */}
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* ======================================================== */}
        {/* LEFT PANEL: Educational Trust Showcase                    */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 text-foreground bg-muted/30 border-r border-border">
          {/* Top Bar: Brand & Badge */}
          <div className="flex items-center justify-between">
            <Link href={withLocale('/', locale)} className="inline-flex items-center gap-2.5 group">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold transition-transform group-hover:scale-105 shadow-xs">
                <GraduationCap className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-foreground leading-none">
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

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-semibold text-primary shadow-2xs">
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
              <h2 className="text-xl xl:text-2xl font-black tracking-tight text-foreground leading-snug">
                {isBn
                  ? 'যাচাইকৃত শিক্ষক ও গ্যারান্টেড ক্লাস'
                  : 'Verified Mentorship & Guaranteed Classes'}
              </h2>
            </div>

            {/* Feature Cards */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? '১০০% এসক্রো সুরক্ষিত পেমেন্ট' : '100% Escrow Payment Protection'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'ক্লাস সম্পন্ন হওয়ার পরেই অর্থ শিক্ষককে প্রদান করা হয়।'
                      : 'Funds are securely released only upon verified session completion.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? '৫০,০০০+ সফল সেশন সম্পন্ন' : '50,000+ Completed Learning Sessions'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'সারাদেশের শিক্ষার্থী ও অভিভাবকদের আস্থার প্রতীক।'
                      : 'Trusted by students, guardians & educators nationwide.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground">
                    {isBn ? 'দেশসেরা বিশ্ববিদ্যালয়ের শিক্ষকবৃন্দ' : 'Top University Mentors'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isBn
                      ? 'বুয়েট, ঢাবি ও মেডিকেল শিক্ষার্থী দ্বারা পাঠদান।'
                      : 'Every educator verified with government NID & academic credentials.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Note */}
          <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between text-xs shadow-2xs">
            <span className="font-bold text-foreground flex items-center gap-1">
              <span>⭐</span> {isBn ? '৪.৯/৫.০ শিক্ষার্থী সন্তুষ্টি' : '4.9/5.0 Student Rating'}
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>{isBn ? 'হোমে ফিরে যান' : 'Back to Home'}</span>
            </Link>

            <Link
              href={targetPath}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-2xs"
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
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* 1-Click Demo Accounts Quick-Fill Strip */}
            {onQuickFill && isDemoQuickFillAllowed() && (
              <div className="rounded-2xl border border-primary/20 bg-muted/20 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span>
                      {isBn ? '১-ক্লিকে টেস্ট অ্যাকাউন্টে প্রবেশ:' : '1-Click Role Login:'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold">
                    <KeyRound className="w-2.5 h-2.5" />
                    Password123!
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {demoAccounts.map((acc) => {
                    const IconComponent = acc.icon;
                    const isSelected = selectedRole === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleSelectAccount(acc)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl border border-border bg-card text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-97',
                          acc.borderClass,
                          isSelected && acc.activeClass,
                        )}
                        title={`${acc.name} (${acc.email})`}
                      >
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', acc.iconClass)}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground truncate">{acc.role}</span>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">{acc.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Slot */}
            {children}
          </div>

          {/* Bottom Security Seals */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
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
