'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Check,
} from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { RegisterRole } from '@/store/services/auth-api';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';
import { AuthShell } from './authShell';
import { cn } from '@/lib/utils';
import { useRegisterForm } from './use-register-form';

function calculatePasswordStrength(pass: string) {
  if (!pass) return { score: 0, labelBn: '', labelEn: '', colorClass: 'bg-slate-200' };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) {
    return { score: 1, labelBn: 'দুর্বল', labelEn: 'Weak', colorClass: 'bg-rose-500' };
  }
  if (score === 2) {
    return { score: 2, labelBn: 'মোটামুটি', labelEn: 'Fair', colorClass: 'bg-amber-500' };
  }
  if (score === 3) {
    return { score: 3, labelBn: 'ভালো', labelEn: 'Good', colorClass: 'bg-blue-500' };
  }
  return { score: 4, labelBn: 'চমৎকার ও সুরক্ষিত', labelEn: 'Strong & Secure', colorClass: 'bg-emerald-500' };
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const {
    displayName,
    setDisplayName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    role,
    setRole,
    formError,
    isLoading,
    isBn,
    handleSubmit,
  } = useRegisterForm(locale);

  const roleOptions: {
    value: RegisterRole;
    labelBn: string;
    labelEn: string;
    subBn: string;
    subEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      value: 'student',
      labelBn: 'শিক্ষার্থী',
      labelEn: 'Student',
      subBn: '১:১ ক্লাস ও মেন্টরিং',
      subEn: '1:1 Mentoring',
      icon: GraduationCap,
    },
    {
      value: 'guardian',
      labelBn: 'অভিভাবক',
      labelEn: 'Guardian',
      subBn: 'সন্তানের সেরা শিক্ষক',
      subEn: 'Hire Top Tutors',
      icon: ShieldCheck,
    },
    {
      value: 'tutor',
      labelBn: 'শিক্ষক',
      labelEn: 'Tutor',
      subBn: 'পাঠদান ও উপার্জন',
      subEn: 'Teach & Earn',
      icon: BookOpen,
    },
  ];

  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  return (
    <AuthShell
      locale={locale}
      mode="register"
      title={isBn ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create an Account'}
      subtitle={
        isBn
          ? 'সহজেই নিবন্ধন করে আপনার পড়াশোনা বা শিক্ষকতা শুরু করুন।'
          : 'Join OgroniEdu to connect with verified mentors or find students.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
        {/* Error Alert */}
        {formError && (
          <Alert variant="destructive" className="rounded-2xl" data-testid="register-error">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Role Picker: Modern High-Impact Segmented Cards */}
        <div className="space-y-2 text-left">
          <Label htmlFor="register-role" className="text-xs font-bold text-foreground">
            {isBn ? 'আপনার ভূমিকা নির্বাচন করুন' : 'Select Account Type'}
          </Label>
          <div className="grid grid-cols-3 gap-2.5">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-95',
                    active
                      ? 'border-primary bg-gradient-to-b from-blue-50/90 to-indigo-50/40 text-primary shadow-xs ring-1 ring-primary/20'
                      : 'border-border/80 bg-surface/50 hover:bg-surface text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  {active && (
                    <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
                      active ? 'bg-primary text-white shadow-2xs' : 'bg-surface text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 stroke-[2.2]" aria-hidden="true" />
                  </div>
                  <span className="font-extrabold text-foreground text-xs mt-0.5">
                    {isBn ? opt.labelBn : opt.labelEn}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold line-clamp-1">
                    {isBn ? opt.subBn : opt.subEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hidden select strictly preserved for automated test ID compatibility */}
          <select
            id="register-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RegisterRole)}
            className="sr-only"
            data-testid="register-role-select"
          >
            <option value="student">{isBn ? 'শিক্ষার্থী' : 'Student'}</option>
            <option value="guardian">{isBn ? 'অভিভাবক' : 'Guardian'}</option>
            <option value="tutor">{isBn ? 'শিক্ষক' : 'Tutor'}</option>
          </select>
        </div>

        {/* Full Name Input */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="register-name" className="text-xs font-bold text-foreground">
            {isBn ? 'পুরো নাম' : 'Full Name'}
          </Label>
          <Input
            id="register-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isBn ? 'উদা: আবরার আহমেদ' : 'e.g. Abrar Ahmed'}
            autoComplete="name"
            leadingIcon={<User className="h-4 w-4 text-muted-foreground" />}
            className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold"
            data-testid="register-name-input"
          />
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="register-email" className="text-xs font-bold text-foreground">
              {isBn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.com"
              autoComplete="email"
              leadingIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
              className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold"
              data-testid="register-email-input"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="register-phone" className="text-xs font-bold text-foreground">
              {isBn ? 'মোবাইল (ঐচ্ছিক)' : 'Mobile (optional)'}
            </Label>
            <Input
              id="register-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              autoComplete="tel"
              leadingIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
              className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold"
              data-testid="register-phone-input"
            />
          </div>
        </div>

        {/* Password Input + Live Strength Bar */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="register-password" className="text-xs font-bold text-foreground">
            {dict.auth.passwordLabel}
          </Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              leadingIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
              className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold pr-11"
              data-testid="register-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-xl transition-colors cursor-pointer z-10 active:scale-90"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Interactive Multi-Segment Password Strength Indicator */}
          {password.length > 0 && (
            <div className="space-y-1 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      seg <= strength.score ? strength.colorClass : 'bg-slate-200',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>
                  {isBn ? 'নিরাপত্তা স্তর: ' : 'Strength: '}
                  <span className="font-bold text-foreground">
                    {isBn ? strength.labelBn : strength.labelEn}
                  </span>
                </span>
                <span className="text-[10px]">
                  {strength.score >= 3
                    ? isBn
                      ? '✓ আদর্শ পাসওয়ার্ড'
                      : '✓ Strong password'
                    : isBn
                      ? '৮+ অক্ষর, বড়/ছোট হাত ও সংখ্যা'
                      : '8+ chars, mix case & number'}
                </span>
              </div>
            </div>
          )}

          {password.length === 0 && (
            <p className="text-[11px] text-muted-foreground font-medium">
              {isBn
                ? 'কমপক্ষে ৮ অক্ষর (বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা)'
                : 'At least 8 characters with upper, lowercase and number'}
            </p>
          )}
        </div>

        {/* Primary Action Button with Hero Gradient */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className="w-full h-12 rounded-2xl font-black text-xs sm:text-sm gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
            data-testid="register-submit-btn"
          >
            <span>{dict.nav.register}</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Switch to Login */}
        <p className="text-center text-xs text-muted-foreground pt-3 font-medium">
          <span>{isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}</span>
          <Link
            href={withLocale('/login', locale)}
            className="font-bold text-primary hover:underline hover:text-primary-hover ml-1"
          >
            {dict.nav.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
