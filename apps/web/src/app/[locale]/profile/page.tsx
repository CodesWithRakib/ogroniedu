'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { useAppDispatch } from '@/store';
import { setSessionUser } from '@/store/slices/auth-slice';
import { toAuthUser, useLazyGetSessionUserQuery } from '@/store/services/auth-api';
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '@/store/services/users-api';

function ProfileContent({ locale }: { locale: Locale }) {
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
      setFormError(normalizeApiError(err as never, locale).message);
    }
  }

  return (
    <DashboardShell locale={locale} title={locale === 'bn' ? 'প্রোফাইল' : 'Profile'}>
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">{normalizeApiError(error, locale).message}</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>{data?.displayName}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4" data-testid="profile-form">
              {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
              {saved && <p role="status" className="text-sm text-emerald-600">{saved}</p>}
              <div className="space-y-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium">{locale === 'bn' ? 'পুরো নাম' : 'Full name'}</label>
                <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="profile-name-input" />
              </div>
              <Button type="submit" size="sm" isLoading={saving} data-testid="profile-save-btn">
                {locale === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}

export default function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <RequireAuth locale={locale}>
      <ProfileContent locale={locale} />
    </RequireAuth>
  );
}
