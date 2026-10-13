'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useLoginMutation, toAuthUser } from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';

export function LoginForm({ locale, notice }: { locale: Locale; notice?: string | null }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const t = dict.auth;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!identifier.trim() || !password) {
      setFormError(
        locale === 'bn' ? 'ইমেইল/ফোন ও পাসওয়ার্ড আবশ্যক।' : 'Email/phone and password are required.',
      );
      return;
    }
    try {
      const res = await login({ identifier: identifier.trim(), password }).unwrap();
      dispatch(
        setCredentials({ user: toAuthUser(res.user), token: res.accessToken, refreshToken: res.refreshToken }),
      );
      dispatch(
        enqueueToast({
          title: locale === 'bn' ? 'সফলভাবে লগইন হয়েছে' : 'Signed in successfully',
          message: res.user.displayName,
          type: 'success',
        }),
      );
      router.replace(withLocale(dashboardPathForRoles(res.user.roles, locale), locale));
    } catch (err) {
      const normalized = normalizeApiError(err as never, locale);
      setFormError(normalized.message);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.loginTitle}</CardTitle>
        <CardDescription>{t.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          {notice && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              data-testid="login-notice"
            >
              {notice}
            </div>
          )}
          {formError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="login-error">
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="login-identifier" className="text-sm font-medium">
              {locale === 'bn' ? 'ইমেইল অথবা মোবাইল' : 'Email or mobile'}
            </label>
            <Input
              id="login-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={locale === 'bn' ? '+8801XXXXXXXXX / you@mail.com' : '+8801XXXXXXXXX / you@mail.com'}
              autoComplete="username"
              data-testid="login-identifier-input"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">
              {t.passwordLabel}
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              data-testid="login-password-input"
            />
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading} data-testid="login-submit-btn">
            {dict.nav.login}
          </Button>
          <p className="text-center text-sm text-slate-500">
            <a className="underline" href={withLocale('/register', locale)}>
              {dict.nav.register}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
