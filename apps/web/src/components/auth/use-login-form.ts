'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeUnknownError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import {
  useLoginMutation,
  useRequestMagicLinkMutation,
  toAuthUser,
  type AuthResponse,
} from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';
import { validateLoginFields } from './auth-validation';

/** Login form state + validation + submit. JSX stays in LoginForm. */
export function useLoginForm(locale: Locale) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [requestMagicLink, { isLoading: isRequestingMagicLink }] = useRequestMagicLinkMutation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicNotice, setMagicNotice] = useState<string | null>(null);

  /**
   * Request a passwordless sign-in link. The backend always returns the same
   * generic success message so this cannot be used to probe accounts.
   */
  async function handleMagicLinkRequest() {
    setFormError(null);
    setMagicNotice(null);
    const email = magicEmail.trim();
    if (!email || !email.includes('@')) {
      setFormError(isBn ? 'সঠিক ইমেইল দিন।' : 'Enter a valid email address.');
      return;
    }
    try {
      const res = await requestMagicLink({ email, locale }).unwrap();
      setMagicNotice(
        res?.message ??
          (isBn
            ? 'যদি অ্যাকাউন্ট থাকে, একটি সাইন-ইন লিংক পাঠানো হয়েছে।'
            : 'If an account exists, a sign-in link has been sent.'),
      );
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

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
      const payload: AuthResponse =
        typeof res === 'object' && res !== null && 'user' in res
          ? (res as AuthResponse)
          : ((res as { data?: AuthResponse }).data as AuthResponse);
      if (!payload?.accessToken || !payload?.user) {
        throw new Error(
          isBn ? 'লগইন প্রতিক্রিয়া অসম্পূর্ণ।' : 'Authentication response missing credentials.',
        );
      }
      dispatch(
        setCredentials({
          user: toAuthUser(payload.user),
          token: payload.accessToken,
          refreshToken: payload.refreshToken,
        }),
      );
      dispatch(
        enqueueToast({
          title: isBn ? 'সফলভাবে লগইন হয়েছে' : 'Signed in successfully',
          message: payload.user.displayName,
          type: 'success',
        }),
      );
      router.replace(withLocale(dashboardPathForRoles(payload.user.roles, locale), locale));
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
    magicEmail,
    setMagicEmail,
    magicNotice,
    isRequestingMagicLink,
    handleMagicLinkRequest,
  };
}
