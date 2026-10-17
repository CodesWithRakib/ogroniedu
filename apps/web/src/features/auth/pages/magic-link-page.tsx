'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale, dashboardPathForRoles } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useConsumeMagicLinkMutation } from '@/store/services/auth-api';

/**
 * Magic-link confirmation.
 *
 * The token is consumed only after an explicit click, so link previews, email
 * scanners or prefetch requests cannot burn a valid single-use token. The API
 * validates the token, its expiry and single-use status; this page only
 * forwards it.
 */
export function MagicLinkPage({ locale }: { locale: Locale }) {
  const isBn = locale === 'bn';
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const [error, setError] = React.useState<string | null>(null);
  const [consume, { isLoading }] = useConsumeMagicLinkMutation();

  async function handleConfirm() {
    if (!token) {
      setError(isBn ? 'সাইন-ইন লিংকটি অসম্পূর্ণ।' : 'This sign-in link is incomplete.');
      return;
    }
    setError(null);
    try {
      const result = await consume({ token }).unwrap();
      dispatch(
        setCredentials({
          user: {
            id: result.user.id,
            displayName: result.user.displayName,
            email: result.user.email,
            phone: result.user.phone,
            roles: result.user.roles,
            status: result.user.status,
            preferredLocale: result.user.preferredLocale,
          },
          token: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      );
      const destination =
        result.redirectPath && result.redirectPath.startsWith('/')
          ? result.redirectPath
          : dashboardPathForRoles(result.user.roles, locale);
      router.replace(withLocale(destination, locale));
    } catch (err) {
      setError(normalizeUnknownError(err, locale).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10" data-testid="magic-link-page">
      <header className="mb-6 space-y-1 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground">
          {isBn ? 'পাসওয়ার্ড ছাড়া লগইন' : 'Passwordless sign in'}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isBn
            ? 'নিচের বাটনে ক্লিক করে আপনার অ্যাকাউন্টে প্রবেশ করুন। লিংকটি শুধু একবার ব্যবহারযোগ্য।'
            : 'Confirm below to sign in. This link can be used only once.'}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive "
          data-testid="magic-link-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isLoading || !token}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-bold text-primary-foreground disabled:opacity-60"
        data-testid="magic-link-confirm-btn"
      >
        <ShieldCheck className="h-4 w-4" />
        <span>
          {isLoading
            ? isBn
              ? 'যাচাই করা হচ্ছে...'
              : 'Verifying...'
            : isBn
              ? 'নিশ্চিত করে লগইন করুন'
              : 'Confirm and sign in'}
        </span>
        <ArrowRight className="h-4 w-4" />
      </button>

      {!token && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {isBn
            ? 'লিংকটি ভুল বা মেয়াদোত্তীর্ণ মনে হচ্ছে। আবার অনুরোধ করুন।'
            : 'The link looks invalid or expired. Please request a new one.'}
        </p>
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
