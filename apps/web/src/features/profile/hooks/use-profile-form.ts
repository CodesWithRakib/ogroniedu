'use client';

import React from 'react';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError, normalizeUnknownError } from '@/lib/api-error';
import { useAppDispatch } from '@/store';
import { setSessionUser } from '@/store/slices/auth-slice';
import { toAuthUser, useLazyGetSessionUserQuery } from '@/store/services/auth-api';
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '@/store/services/users-api';

/** Feature-level profile hook: display-name form state plus save/sync actions. */
export function useProfileForm(locale: Locale) {
  const dispatch = useAppDispatch();
  const [fetchMe] = useLazyGetSessionUserQuery();
  const { data, isLoading, isError, error, refetch } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [displayName, setDisplayName] = React.useState('');
  const [saved, setSaved] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data && !displayName) setDisplayName(data.displayName ?? '');
  }, [data, displayName]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(null);
    try {
      const updated = await updateProfile({ displayName: displayName.trim() }).unwrap();
      refetch();
      if (updated && typeof updated === 'object' && 'id' in updated) {
        try {
          const me = await fetchMe().unwrap();
          dispatch(setSessionUser(toAuthUser(me)));
        } catch {
          // Session display name sync is best-effort.
        }
      }
      setSaved(locale === 'bn' ? 'সংরক্ষিত হয়েছে।' : 'Saved.');
    } catch (err) {
      setFormError(normalizeUnknownError(err, locale).message);
    }
  }

  const queryError = isError ? normalizeApiError(error, locale).message : null;

  return {
    data,
    isLoading,
    queryError,
    displayName,
    setDisplayName,
    saved,
    formError,
    saving,
    handleSave,
  };
}
