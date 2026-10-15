'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeUnknownError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import { useLoginMutation, toAuthUser } from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';
import { validateLoginFields } from './auth-validation';

/** Login form state + validation + submit. JSX stays in LoginForm. */
export function useLoginForm(locale: Locale) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isBn = locale === 'bn';

  function handleQuickFill(email: string, pass: string) {
    setIdentifier(email);
    setPassword(pass);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (validateLoginFields({ identifier, password })) {
      setFormError(
        isBn ? 'ইমেইল/ফোন ও পাসওয়ার্ড আবশ্যক।' : 'Email/phone and password are required.',
      );
      return;
    }
    try {
      const res = await login({ identifier: identifier.trim(), password }).unwrap();
      dispatch(
        setCredentials({
          user: toAuthUser(res.user),
          token: res.accessToken,
          refreshToken: res.refreshToken,
        }),
      );
      dispatch(
        enqueueToast({
          title: isBn ? 'সফলভাবে লগইন হয়েছে' : 'Signed in successfully',
          message: res.user.displayName,
          type: 'success',
        }),
      );
      router.replace(withLocale(dashboardPathForRoles(res.user.roles, locale), locale));
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  return {
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
  };
}
