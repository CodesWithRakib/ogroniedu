'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from '@/components/ui';
import { getDictionary, type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useRegisterMutation, toAuthUser, type RegisterRole } from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';

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
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<RegisterRole>('student');
  const [formError, setFormError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (displayName.trim().length < 2) {
      setFormError(locale === 'bn' ? 'সঠিক নাম দিন।' : 'Enter your full name.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setFormError(
        locale === 'bn' ? 'ইমেইল অথবা ফোন নম্বর আবশ্যক।' : 'Email or phone is required.',
      );
      return;
    }
    const pwError = validatePassword(password);
    if (pwError === 'PASSWORD_TOO_SHORT') {
      setFormError(locale === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' : 'Password must be at least 8 characters.');
      return;
    }
    if (pwError === 'PASSWORD_WEAK') {
      setFormError(
        locale === 'bn'
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
        setCredentials({ user: toAuthUser(res.user), token: res.accessToken, refreshToken: res.refreshToken }),
      );
      dispatch(
        enqueueToast({
          title: locale === 'bn' ? 'নিবন্ধন সফল হয়েছে' : 'Account created',
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
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{dict.nav.register}</CardTitle>
        <CardDescription>{dict.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          {formError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" data-testid="register-error">
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="register-name" className="text-sm font-medium">
              {locale === 'bn' ? 'পুরো নাম' : 'Full name'}
            </label>
            <Input id="register-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" data-testid="register-name-input" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-sm font-medium">
                {locale === 'bn' ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
              </label>
              <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" data-testid="register-email-input" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-phone" className="text-sm font-medium">
                {locale === 'bn' ? 'মোবাইল (ঐচ্ছিক)' : 'Mobile (optional)'}
              </label>
              <Input id="register-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" autoComplete="tel" data-testid="register-phone-input" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-password" className="text-sm font-medium">
              {dict.auth.passwordLabel}
            </label>
            <Input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" data-testid="register-password-input" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-role" className="text-sm font-medium">
              {locale === 'bn' ? 'অ্যাকাউন্টের ধরন' : 'Account type'}
            </label>
            <select
              id="register-role"
              value={role}
              onChange={(e) => setRole(e.target.value as RegisterRole)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              data-testid="register-role-select"
            >
              <option value="student">{locale === 'bn' ? 'শিক্ষার্থী' : 'Student'}</option>
              <option value="guardian">{locale === 'bn' ? 'অভিভাবক' : 'Guardian'}</option>
              <option value="tutor">{locale === 'bn' ? 'শিক্ষক' : 'Tutor'}</option>
            </select>
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading} data-testid="register-submit-btn">
            {dict.nav.register}
          </Button>
          <p className="text-center text-sm text-slate-500">
            <a className="underline" href={withLocale('/login', locale)}>
              {dict.nav.login}
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
