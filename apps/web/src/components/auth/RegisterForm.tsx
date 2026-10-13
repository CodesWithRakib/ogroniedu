'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { normalizeApiError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useRegisterMutation, toAuthUser, type RegisterRole } from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';
import { AuthShell } from './authShell';
import { cn } from '@/lib/utils';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'PASSWORD_TOO_SHORT';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'PASSWORD_WEAK';
  }
  return null;
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RegisterRole>('student');
  const [formError, setFormError] = useState<string | null>(null);

  const isBn = locale === 'bn';

  const roleOptions: { value: RegisterRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'student', label: isBn ? 'শিক্ষার্থী' : 'Student', icon: GraduationCap },
    { value: 'guardian', label: isBn ? 'অভিভাবক' : 'Guardian', icon: ShieldCheck },
    { value: 'tutor', label: isBn ? 'শিক্ষক' : 'Tutor', icon: BookOpen },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (displayName.trim().length < 2) {
      setFormError(isBn ? 'সঠিক নাম দিন (কমপক্ষে ২ অক্ষর)।' : 'Enter your full name (at least 2 letters).');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setFormError(
        isBn ? 'ইমেইল অথবা ফোন নম্বর প্রদান আবশ্যক।' : 'Email or phone number is required.',
      );
      return;
    }
    const pwError = validatePassword(password);
    if (pwError === 'PASSWORD_TOO_SHORT') {
      setFormError(isBn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' : 'Password must be at least 8 characters.');
      return;
    }
    if (pwError === 'PASSWORD_WEAK') {
      setFormError(
        isBn
          ? 'পাসওয়ার্ডে বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা থাকতে হবে।'
          : 'Password needs uppercase, lowercase, and a number.',
      );
      return;
    }
    try {
      const res = await register({
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        role,
        preferredLocale: locale,
      }).unwrap();
      dispatch(
        setCredentials({
          user: toAuthUser(res.user),
          token: res.accessToken,
          refreshToken: res.refreshToken,
        }),
      );
      dispatch(
        enqueueToast({
          title: isBn ? 'নিবন্ধন সফল হয়েছে' : 'Account created successfully',
          message: res.user.displayName,
          type: 'success',
        }),
      );
      router.replace(withLocale(dashboardPathForRoles(res.user.roles, locale), locale));
    } catch (err) {
      setFormError(normalizeApiError(err as never, locale).message);
    }
  }

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
            className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 animate-in fade-in"
            data-testid="register-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
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
                      : 'border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : 'text-primary')} />
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
