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
  if (!pass) return { score: 0, labelBn: '', labelEn: '', colorClass: 'bg-muted' };
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
    return { score: 3, labelBn: 'ভালো', labelEn: 'Good', colorClass: 'bg-primary' };
  }
  return {
    score: 4,
    labelBn: 'শক্তিশালী',
    labelEn: 'Strong',
    colorClass: 'bg-emerald-500',
  };
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
      subBn: '১:১ শিখন ও প্রস্তুতি',
      subEn: '1:1 Mentoring',
      icon: GraduationCap,
    },
    {
      value: 'guardian',
      labelBn: 'অভিভাবক',
      labelEn: 'Guardian',
      subBn: 'সন্তানের জন্য সেরা শিক্ষক',
      subEn: 'Hire Top Tutors',
      icon: ShieldCheck,
    },
    {
      value: 'tutor',
      labelBn: 'শিক্ষক',
      labelEn: 'Tutor',
      subBn: 'পাঠদান ও আয় করুন',
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
          ? 'অগ্রণীএডু-তে যোগ দিয়ে সেরা শিক্ষক বা শিক্ষার্থীদের সাথে যুক্ত হোন।'
          : 'Join OgroniEdu to connect with verified mentors or find students.'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="register-form">
        {/* Error Alert */}
        {formError && (
          <Alert variant="destructive" className="rounded-xl" data-testid="register-error">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Role Picker: Clean Segmented Cards */}
        <div className="flex flex-col gap-2 text-left">
          <Label htmlFor="register-role" className="text-xs font-semibold text-foreground">
            {isBn ? 'আপনার ভূমিকা নির্বাচন করুন' : 'Select Account Type'}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-98',
                    active
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  )}
                  <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="font-semibold text-xs leading-none">{isBn ? opt.labelBn : opt.labelEn}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline leading-none">
                    {isBn ? opt.subBn : opt.subEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full Name Input */}
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="register-name" className="text-xs font-semibold text-foreground">
            {isBn ? 'আপনার পূর্ণ নাম' : 'Full Name'}
          </Label>
          <Input
            id="register-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isBn ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
            autoComplete="name"
            leadingIcon={<User className="h-4 w-4 text-muted-foreground" />}
            className="h-10 rounded-xl border-border bg-card text-xs"
            data-testid="register-name-input"
          />
        </div>

        {/* Email & Phone Dual Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-email" className="text-xs font-semibold text-foreground">
              {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.com"
              autoComplete="email"
              leadingIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
              className="h-10 rounded-xl border-border bg-card text-xs"
              data-testid="register-email-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-phone" className="text-xs font-semibold text-foreground">
              {dict.auth.phoneLabel}
            </Label>
            <Input
              id="register-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              autoComplete="tel"
              leadingIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
              className="h-10 rounded-xl border-border bg-card text-xs"
              data-testid="register-phone-input"
            />
          </div>
        </div>

        {/* Password Input + Strength Bar */}
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="register-password" className="text-xs font-semibold text-foreground">
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
              className="h-10 rounded-xl border-border bg-card text-xs pr-10"
              data-testid="register-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer z-10"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Interactive Strength Indicator */}
          {password.length > 0 && (
            <div className="flex flex-col gap-1 pt-1">
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      seg <= strength.score ? strength.colorClass : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>
                  {isBn ? 'পাসওয়ার্ড শক্তি: ' : 'Strength: '}
                  <span className="font-semibold text-foreground">
                    {isBn ? strength.labelBn : strength.labelEn}
                  </span>
                </span>
                <span className="text-[10px]">
                  {strength.score >= 3
                    ? isBn
                      ? '✓ যথেষ্ট নিরাপদ'
                      : '✓ Strong password'
                    : isBn
                      ? '৮+ অক্ষর, বড়/ছোট বর্ণ ও সংখ্যা'
                      : '8+ chars, mix case & number'}
                </span>
              </div>
            </div>
          )}

          {password.length === 0 && (
            <p className="text-[11px] text-muted-foreground font-normal">
              {isBn
                ? 'কমপক্ষে ৮ অক্ষর (বড় অক্ষর, ছোট অক্ষর এবং সংখ্যাসহ)'
                : 'At least 8 characters with upper, lowercase and number'}
            </p>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0 cursor-pointer active:scale-98 group"
            data-testid="register-submit-btn"
          >
            <span>{dict.nav.register}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Switch to Login */}
        <p className="text-center text-xs text-muted-foreground pt-2 font-medium">
          <span>{isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}</span>
          <Link
            href={withLocale('/login', locale)}
            className="font-semibold text-primary hover:underline ml-1"
          >
            {dict.nav.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
