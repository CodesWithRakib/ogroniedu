'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useRequestCodeMutation, useResetPasswordMutation } from '@/store/services/auth-api';
import { validatePassword } from '@/components/auth/auth-validation';

type Stage = 'request' | 'reset' | 'done';

export function ForgotPasswordPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const [stage, setStage] = React.useState<Stage>('request');
  const [contact, setContact] = React.useState('');
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [requestCode, { isLoading: isRequesting }] = useRequestCodeMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const contactError = contact.trim().length < 3;

  async function handleRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await requestCode({
        contact: contact.trim(),
        purpose: 'password_recovery',
      }).unwrap();
      setNotice(result?.message ?? null);
      setStage('reset');
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(
        passwordError === 'PASSWORD_TOO_SHORT'
          ? isBn
            ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
            : 'Password must be at least 8 characters.'
          : isBn
            ? 'পাসওয়ার্ডে বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা থাকতে হবে।'
            : 'Password needs uppercase, lowercase, and a number.',
      );
      return;
    }
    try {
      await resetPassword({
        contact: contact.trim(),
        code: code.trim(),
        newPassword,
      }).unwrap();
      setStage('done');
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10" data-testid="forgot-password-page">
      <header className="mb-6 space-y-1 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground">
          {isBn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset your password'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isBn
            ? 'নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিয়ে রিকভারি কোড নিন।'
            : 'Request a recovery code using your registered email or mobile number.'}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive "
          data-testid="forgot-password-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && stage === 'reset' && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary "
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {isBn
              ? 'কোড পাঠানো হয়েছে (যদি অ্যাকাউন্ট থাকে)। ইমেইল/এসএমএস দেখুন।'
              : 'A code was sent if the account exists. Check your email/SMS.'}
          </span>
        </div>
      )}

      {stage === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="recovery-contact" className="text-xs font-bold text-foreground">
              {isBn ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or mobile number'}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="recovery-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                autoComplete="username"
                className="h-11 w-full rounded-2xl border border-border bg-surface pl-10 pr-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                data-testid="forgot-password-contact"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={contactError || isRequesting}
            className="h-11 w-full rounded-full bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
            data-testid="forgot-password-request-btn"
          >
            {isRequesting
              ? isBn
                ? 'পাঠানো হচ্ছে...'
                : 'Sending...'
              : isBn
                ? 'রিকভারি কোড পাঠান'
                : 'Send recovery code'}
          </button>
        </form>
      )}

      {stage === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="recovery-code" className="text-xs font-bold text-foreground">
              {isBn ? '৬-ডিজিট কোড' : '6-digit code'}
            </label>
            <input
              id="recovery-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-xs tracking-[0.4em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              data-testid="forgot-password-code"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="recovery-password" className="text-xs font-bold text-foreground">
              {isBn ? 'নতুন পাসওয়ার্ড' : 'New password'}
            </label>
            <input
              id="recovery-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              data-testid="forgot-password-new-password"
            />
          </div>
          <button
            type="submit"
            disabled={isResetting}
            className="h-11 w-full rounded-full bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
            data-testid="forgot-password-reset-btn"
          >
            {isResetting
              ? isBn
                ? 'রিসেট হচ্ছে...'
                : 'Resetting...'
              : isBn
                ? 'পাসওয়ার্ড রিসেট করুন'
                : 'Reset password'}
          </button>
        </form>
      )}

      {stage === 'done' && (
        <div
          className="flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs text-primary "
          data-testid="forgot-password-done"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {isBn
              ? 'পাসওয়ার্ড পরিবর্তন হয়েছে। আপনার সব সেশন সাইন-আউট করা হয়েছে। এখন নতুন পাসওয়ার্ডে লগইন করুন।'
              : 'Password updated. All your sessions were signed out. Please sign in with your new password.'}
          </span>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link
          href={withLocale('/login', locale)}
          className="font-bold text-primary hover:underline"
        >
          {isBn ? 'লগইনে ফিরে যান' : 'Back to sign in'}
        </Link>
      </p>
    </div>
  );
}
