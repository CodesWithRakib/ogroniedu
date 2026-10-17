'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import type { RegisterRole } from '@/store/services/auth-api';
import { AuthShell } from './authShell';
import { cn } from '@/lib/utils';
import { useRegisterForm } from './use-register-form';

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
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: 'student', label: isBn ? 'শিক্ষার্থী' : 'Student', icon: GraduationCap },
    { value: 'guardian', label: isBn ? 'অভিভাবক' : 'Guardian', icon: ShieldCheck },
    { value: 'tutor', label: isBn ? 'শিক্ষক' : 'Tutor', icon: BookOpen },
  ];

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
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive  animate-in fade-in"
            data-testid="register-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Role Picker (Visual Segmented Pills + synced select for test compatibility) */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="register-role" className="text-xs font-bold text-foreground">
            {isBn ? 'আপনার ভূমিকা নির্বাচন করুন' : 'Select Account Type'}
          </label>
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
                    'flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all shadow-2xs cursor-pointer',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20 scale-[1.02]'
                      : 'border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-primary-foreground' : 'text-primary')}
                  />
                  <span>{opt.label}</span>
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
          <label htmlFor="register-name" className="text-xs font-bold text-foreground">
            {isBn ? 'পুরো নাম' : 'Full Name'}
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="register-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isBn ? 'উদা: আবরার আহমেদ' : 'e.g. Abrar Ahmed'}
              autoComplete="name"
              className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              data-testid="register-name-input"
            />
          </div>
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 text-left">
            <label htmlFor="register-email" className="text-xs font-bold text-foreground">
              {isBn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mail.com"
                autoComplete="email"
                className="w-full h-11 pl-10 pr-3 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                data-testid="register-email-input"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label htmlFor="register-phone" className="text-xs font-bold text-foreground">
              {isBn ? 'মোবাইল (ঐচ্ছিক)' : 'Mobile (optional)'}
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="register-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
                autoComplete="tel"
                className="w-full h-11 pl-10 pr-3 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                data-testid="register-phone-input"
              />
            </div>
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <label htmlFor="register-password" className="text-xs font-bold text-foreground">
            {dict.auth.passwordLabel}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full h-11 pl-10 pr-11 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              data-testid="register-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isBn
              ? 'কমপক্ষে ৮ অক্ষর (বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা)'
              : 'At least 8 characters with upper, lowercase and number'}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-full bg-gradient-to-r from-primary via-primary to-primary-hover hover:opacity-95 text-primary-foreground font-bold text-xs sm:text-sm shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          data-testid="register-submit-btn"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              <span>{isBn ? 'নিবন্ধন তৈরি হচ্ছে...' : 'Creating Account...'}</span>
            </span>
          ) : (
            <>
              <span>{dict.nav.register}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Switch to Login */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          <span>{isBn ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? ' : 'Already have an account? '}</span>
          <Link
            href={withLocale('/login', locale)}
            className="font-bold text-primary hover:underline ml-1"
          >
            {dict.nav.login}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
