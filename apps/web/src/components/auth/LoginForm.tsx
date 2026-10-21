'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';
import { AuthShell } from './authShell';
import { useLoginForm } from './use-login-form';

export function LoginForm({ locale, notice }: { locale: Locale; notice?: string | null }) {
  const dict = getDictionary(locale);
  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    formError,
    isLoading,
    isBn,
    handleQuickFill,
    handleSubmit,
  } = useLoginForm(locale);

  const t = dict.auth;

  return (
    <AuthShell
      locale={locale}
      mode="login"
      title={isBn ? 'স্বাগতম!' : 'Welcome Back'}
      subtitle={
        isBn
          ? 'আপনার অ্যাকাউন্টে লগইন করে ক্লাস ও ড্যাশবোর্ডে প্রবেশ করুন।'
          : 'Sign in to access your sessions, learning tracker & dashboard.'
      }
      onQuickFill={handleQuickFill}
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
        {/* Status Notice */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-primary/25 bg-primary-soft/80 p-3.5 text-xs font-semibold text-primary animate-in fade-in"
            data-testid="login-notice"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <Alert variant="destructive" className="rounded-2xl" data-testid="login-error">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Email or Phone Input */}
        <div className="space-y-1.5 text-left">
          <Label
            htmlFor="login-identifier"
            className="text-xs font-bold text-foreground flex items-center justify-between"
          >
            <span>{isBn ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Mobile Number'}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {isBn ? 'বাধ্যতামূলক' : 'Required'}
            </span>
          </Label>
          <Input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              isBn ? '+8801XXXXXXXXX অথবা you@mail.com' : '+8801XXXXXXXXX or you@mail.com'
            }
            autoComplete="username"
            leadingIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
            className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold"
            data-testid="login-identifier-input"
          />
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-xs font-bold text-foreground">
              {t.passwordLabel}
            </Label>
            <Link
              href={withLocale('/forgot-password', locale)}
              className="text-xs font-bold text-primary hover:underline hover:text-primary-hover transition-colors"
            >
              {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              leadingIcon={<Lock className="h-4 w-4 text-muted-foreground" />}
              className="h-11 rounded-2xl border-border/90 bg-surface/40 hover:bg-surface focus:bg-card transition-colors text-xs font-semibold pr-11"
              data-testid="login-password-input"
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
        </div>

        {/* Primary Submit Button with Hero Gradient */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className="w-full h-12 rounded-2xl font-black text-xs sm:text-sm gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
            data-testid="login-submit-btn"
          >
            <span>{dict.nav.login}</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Switch to Register */}
        <p className="text-center text-xs text-muted-foreground pt-3 font-medium">
          <span>{isBn ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}</span>
          <Link
            href={withLocale('/register', locale)}
            className="font-bold text-primary hover:underline hover:text-primary-hover ml-1"
          >
            {isBn ? 'নতুন নিবন্ধন করুন' : 'Sign up'}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
