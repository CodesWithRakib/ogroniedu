'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
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
    magicEmail,
    setMagicEmail,
    magicNotice,
    isRequestingMagicLink,
    handleMagicLinkRequest,
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
        {/* Status Notice (e.g. signed out all devices) */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs font-medium text-primary  animate-in fade-in"
            data-testid="login-notice"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Error Alert */}
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive  animate-in fade-in"
            data-testid="login-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Email or Phone Input */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="login-identifier"
            className="text-xs font-bold text-foreground flex items-center justify-between"
          >
            <span>{isBn ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or Mobile Number'}</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {isBn ? 'বাধ্যতামূলক' : 'Required'}
            </span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                isBn ? '+8801XXXXXXXXX অথবা you@mail.com' : '+8801XXXXXXXXX or you@mail.com'
              }
              autoComplete="username"
              className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              data-testid="login-identifier-input"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-xs font-bold text-foreground">
              {t.passwordLabel}
            </label>
            <Link
              href={withLocale('/forgot-password', locale)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full h-11 pl-10 pr-11 rounded-2xl border border-border bg-surface hover:bg-surface-hover focus:bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              data-testid="login-password-input"
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
        </div>

        {/* Primary Submit CTA Button (Gradient Pill style like Nebula Exchange) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-full bg-gradient-to-r from-primary via-primary to-primary-hover hover:opacity-95 text-primary-foreground font-bold text-xs sm:text-sm shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          data-testid="login-submit-btn"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              <span>{isBn ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
            </span>
          ) : (
            <>
              <span>{dict.nav.login}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {/* Passwordless sign-in (single-use email link) */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isBn ? 'অথবা' : 'or'}
          </span>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-magic-email" className="text-xs font-bold text-foreground">
            {isBn ? 'ইমেইলে সাইন-ইন লিংক পাঠান' : 'Email me a sign-in link'}
          </label>
          <div className="flex gap-2">
            <input
              id="login-magic-email"
              type="email"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="you@mail.com"
              autoComplete="email"
              className="h-11 flex-1 rounded-2xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
              data-testid="login-magic-email-input"
            />
            <button
              type="button"
              onClick={handleMagicLinkRequest}
              disabled={isRequestingMagicLink}
              className="h-11 shrink-0 rounded-full border border-border bg-surface px-4 text-xs font-bold text-foreground hover:bg-surface-hover disabled:opacity-60"
              data-testid="login-magic-submit-btn"
            >
              {isRequestingMagicLink
                ? isBn
                  ? 'পাঠানো হচ্ছে...'
                  : 'Sending...'
                : isBn
                  ? 'লিংক পাঠান'
                  : 'Send link'}
            </button>
          </div>
          {magicNotice && (
            <p
              role="status"
              className="text-[11px] text-primary "
              data-testid="login-magic-notice"
            >
              {magicNotice}
            </p>
          )}
        </div>

        {/* Switch to Register */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          <span>{isBn ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}</span>
          <Link
            href={withLocale('/register', locale)}
            className="font-bold text-primary hover:underline ml-1"
          >
            {isBn ? 'নতুন নিবন্ধন করুন' : 'Sign up'}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
