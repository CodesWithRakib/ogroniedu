'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeUnknownError } from '@/lib/api-error';
import { dashboardPathForRoles, withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';
import { useAppDispatch } from '@/store';
import { setCredentials } from '@/store/slices/auth-slice';
import {
  useRegisterMutation,
  toAuthUser,
  type RegisterRole,
  type AuthResponse,
} from '@/store/services/auth-api';
import { enqueueToast } from '@/store/slices/ui-slice';
import { validateRegisterFields, type RegisterFieldError } from './auth-validation';

function messageFor(code: RegisterFieldError, isBn: boolean): string {
  switch (code) {
    case 'NAME_TOO_SHORT':
      return isBn
        ? 'সঠিক নাম দিন (কমপক্ষে ২ অক্ষর)।'
        : 'Enter your full name (at least 2 letters).';
    case 'CONTACT_REQUIRED':
      return isBn ? 'ইমেইল অথবা ফোন নম্বর প্রদান আবশ্যক।' : 'Email or phone number is required.';
    case 'PASSWORD_TOO_SHORT':
      return isBn
        ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
        : 'Password must be at least 8 characters.';
    case 'PASSWORD_WEAK':
      return isBn
        ? 'পাসওয়ার্ডে বড় হাতের, ছোট হাতের অক্ষর ও সংখ্যা থাকতে হবে।'
        : 'Password needs uppercase, lowercase, and a number.';
  }
}

/** Register form state + validation + submit. JSX stays in RegisterForm. */
export function useRegisterForm(locale: Locale) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RegisterRole>('student');
  const [formError, setFormError] = useState<string | null>(null);

  const isBn = locale === 'bn';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const fieldError = validateRegisterFields({ displayName, email, phone, password });
    if (fieldError) {
      setFormError(messageFor(fieldError, isBn));
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
      const payload: AuthResponse =
        typeof res === 'object' && res !== null && 'user' in res
          ? (res as AuthResponse)
          : ((res as { data?: AuthResponse }).data as AuthResponse);
      if (!payload?.accessToken || !payload?.user) {
        throw new Error(
          isBn ? 'নিবন্ধন প্রতিক্রিয়া অসম্পূর্ণ।' : 'Registration response missing credentials.',
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
          title: isBn ? 'নিবন্ধন সফল হয়েছে' : 'Account created successfully',
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
    displayName,
    setDisplayName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    role,
    setRole,
    formError,
    isLoading,
    isBn,
    handleSubmit,
  };
}
