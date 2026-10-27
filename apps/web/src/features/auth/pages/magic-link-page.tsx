'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { withLocale, dashboardPathForRoles } from '@/lib/auth';
import { normalizeUnknownError } from '@/lib/api-error';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useConsumeMagicLinkMutation } from '@/store/services/auth-api';
import { Button, Alert, AlertDescription } from '@/components/ui';

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
    <div className="relative mx-auto w-full max-w-md px-4 py-8" data-testid="magic-link-page">
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-card">
        <header className="mb-6 flex flex-col gap-1.5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs shadow-blue-500/25">
            <KeyRound className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground font-bengali">
            {isBn ? 'পাসওয়ার্ড ছাড়া লগইন' : 'Passwordless sign in'}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isBn
              ? 'নিচের বাটনে ক্লিক করে আপনার অ্যাকাউন্টে প্রবেশ করুন। লিংকটি শুধু একবার ব্যবহারযোগ্য।'
              : 'Confirm below to sign in. This link can be used only once.'}
          </p>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-4 rounded-2xl" data-testid="magic-link-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!token}
            isLoading={isLoading}
            size="lg"
            className="w-full h-12 rounded-2xl font-black text-xs sm:text-sm gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
            data-testid="magic-link-confirm-btn"
          >
            <ShieldCheck className="h-4 w-4 stroke-[2.2]" />
            <span>{isBn ? 'নিশ্চিত করে লগইন করুন' : 'Confirm and sign in'}</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {!token && (
          <p className="mt-4 text-center text-xs text-muted-foreground font-medium">
            {isBn
              ? 'লিংকটি ভুল বা মেয়াদোত্তীর্ণ মনে হচ্ছে। আবার অনুরোধ করুন।'
              : 'The link looks invalid or expired. Please request a new one.'}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
          <Link
            href={withLocale('/login', locale)}
            className="font-bold text-primary hover:underline hover:text-primary-hover"
          >
            {isBn ? 'লগইনে ফিরে যান' : 'Back to sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
