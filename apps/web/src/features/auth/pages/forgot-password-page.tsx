'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useRequestCodeMutation, useResetPasswordMutation } from '@/store/services/auth-api';
import { validatePassword } from '@/components/auth/auth-validation';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';

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
            ? 'পাসওয়ার্ডে বড় অক্ষর, ছোট অক্ষর এবং সংখ্যা থাকতে হবে।'
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
    <div className="relative mx-auto w-full max-w-md px-4 py-8" data-testid="forgot-password-page">
      {/* Container Card */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <header className="mb-6 flex flex-col gap-1.5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-bengali">
            {isBn ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'Reset your password'}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isBn
              ? 'আপনার ইমেইল বা মোবাইল নম্বর দিয়ে রিকভারি কোড গ্রহণ করুন।'
              : 'Request a recovery code using your registered email or mobile number.'}
          </p>
        </header>

        {error && (
          <Alert
            variant="destructive"
            className="mb-4 rounded-xl"
            data-testid="forgot-password-error"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {notice && stage === 'reset' && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-medium text-primary"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              {isBn
                ? 'কোড পাঠানো হয়েছে (যদি অ্যাকাউন্ট থাকে)। ইমেইল/মেসেজ দেখুন।'
                : 'A code was sent if the account exists. Check your email/SMS.'}
            </span>
          </div>
        )}

        {stage === 'request' && (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="recovery-contact" className="text-xs font-semibold text-foreground">
                {isBn ? 'ইমেইল অথবা মোবাইল নম্বর' : 'Email or mobile number'}
              </Label>
              <Input
                id="recovery-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                autoComplete="username"
                leadingIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                className="h-10 rounded-xl border-border bg-card text-xs font-medium"
                data-testid="forgot-password-contact"
              />
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                disabled={contactError}
                isLoading={isRequesting}
                size="lg"
                className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0 cursor-pointer active:scale-98"
                data-testid="forgot-password-request-btn"
              >
                <span>{isBn ? 'রিকভারি কোড পাঠান' : 'Send recovery code'}</span>
              </Button>
            </div>
          </form>
        )}

        {stage === 'reset' && (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="recovery-code" className="text-xs font-semibold text-foreground">
                {isBn ? '৬-সংখ্যার কোড' : '6-digit code'}
              </Label>
              <Input
                id="recovery-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs font-medium tracking-[0.4em]"
                data-testid="forgot-password-code"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="recovery-password" className="text-xs font-semibold text-foreground">
                {isBn ? 'নতুন পাসওয়ার্ড' : 'New password'}
              </Label>
              <Input
                id="recovery-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-10 rounded-xl border-border bg-card text-xs font-medium"
                data-testid="forgot-password-new-password"
              />
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                isLoading={isResetting}
                size="lg"
                className="w-full h-11 rounded-xl font-semibold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0 cursor-pointer active:scale-98"
                data-testid="forgot-password-reset-btn"
              >
                <span>{isBn ? 'পাসওয়ার্ড সংরক্ষণ করুন' : 'Reset password'}</span>
              </Button>
            </div>
          </form>
        )}

        {stage === 'done' && (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/10 p-4 text-xs font-medium text-primary"
            data-testid="forgot-password-done"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              {isBn
                ? 'পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে। এবার নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
                : 'Password updated. All your sessions were signed out. Please sign in with your new password.'}
            </span>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
          <Link
            href={withLocale('/login', locale)}
            className="font-semibold text-primary hover:underline"
          >
            {isBn ? 'লগইনে ফিরে যান' : 'Back to sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
