'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useRequestCodeMutation, useResetPasswordMutation } from '@/store/services/auth-api';
import { validatePassword } from '@/components/auth/auth-validation';
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui';

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
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <KeyRound className="h-5 w-5" />
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
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary-soft p-3 text-xs text-primary"
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <span>
            {isBn
              ? 'কোড পাঠানো হয়েছে (যদি অ্যাকাউন্ট থাকে)। ইমেইল/এসএমএস দেখুন।'
              : 'A code was sent if the account exists. Check your email/SMS.'}
          </span>
        </div>
      )}

      {stage === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5 text-left">
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
              leadingIcon={<Mail className="h-4 w-4" />}
              data-testid="forgot-password-contact"
            />
          </div>
          <Button
            type="submit"
            disabled={contactError}
            isLoading={isRequesting}
            className="w-full font-semibold"
            data-testid="forgot-password-request-btn"
          >
            {isBn ? 'রিকভারি কোড পাঠান' : 'Send recovery code'}
          </Button>
        </form>
      )}

      {stage === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="recovery-code" className="text-xs font-semibold text-foreground">
              {isBn ? '৬-ডিজিট কোড' : '6-digit code'}
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
              className="tracking-[0.4em]"
              data-testid="forgot-password-code"
            />
          </div>
          <div className="space-y-1.5 text-left">
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
              data-testid="forgot-password-new-password"
            />
          </div>
          <Button
            type="submit"
            isLoading={isResetting}
            className="w-full font-semibold"
            data-testid="forgot-password-reset-btn"
          >
            {isBn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset password'}
          </Button>
        </form>
      )}

      {stage === 'done' && (
        <div
          className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary-soft p-4 text-xs font-medium text-primary"
          data-testid="forgot-password-done"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
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
