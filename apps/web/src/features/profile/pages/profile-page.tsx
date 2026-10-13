'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { normalizeApiError } from '@/lib/api-error';
import { withLocale } from '@/lib/auth';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/slices/auth-slice';
import { useLogoutMutation, useRevokeAllSessionsMutation } from '@/store/services/auth-api';
import { useProfileForm } from '../hooks/use-profile-form';

/**
 * Session security: revoke-all signs out every device server-side, then
 * clears the local session IMMEDIATELY (never a delayed dispatch that a
 * navigation could orphan) and lands on login with a confirmation notice.
 */
function SessionSecurityCard({ locale }: { locale: Locale }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [revokeAll, { isLoading }] = useRevokeAllSessionsMutation();
  const [logoutApi] = useLogoutMutation();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const isBn = locale === 'bn';

  async function handleRevokeAll() {
    setError(null);
    try {
      await revokeAll().unwrap();
      try {
        await logoutApi({}).unwrap();
      } catch {
        // Server logout best-effort; local session always clears below.
      }
      // Flag consumed by the login page (sessionStorage survives the
      // redirect; a URL query would race RequireAuth's own redirect).
      try {
        sessionStorage.setItem('ogroniedu.signedOut', 'all');
      } catch {
        // Private mode: redirect still happens, notice just won't show.
      }
      dispatch(logout());
      router.replace(withLocale('/login', locale));
    } catch (err) {
      setError(normalizeApiError(err as never, locale).message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">{isBn ? 'সেশন ও নিরাপত্তা' : 'Sessions & security'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          {isBn
            ? 'অন্য সব ডিভাইস ও ব্রাউজার থেকে সাইন-আউট করে সব সক্রিয় সেশন বাতিল করুন।'
            : 'Sign out on every other device and browser by revoking all active sessions.'}
        </p>
        {error && (
          <p role="alert" className="text-xs text-rose-600" data-testid="revoke-all-error">
            {error}
          </p>
        )}
        {!confirming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            data-testid="revoke-all-btn"
          >
            {isBn ? 'সব ডিভাইস থেকে সাইন-আউট' : 'Sign out all devices'}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              size="sm"
              isLoading={isLoading}
              onClick={handleRevokeAll}
              data-testid="revoke-all-confirm-btn"
            >
              {isBn ? 'নিশ্চিত করুন — সব সেশন বাতিল' : 'Confirm — revoke all'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Profile entry: display-name edit form with session sync on save. */
export function ProfilePage({ locale }: { locale: Locale }) {
  const profile = useProfileForm(locale);

  return (
    <DashboardShell locale={locale} title={locale === 'bn' ? 'প্রোফাইল' : 'Profile'}>
      {profile.isLoading ? (
        <LoadingSpinner />
      ) : profile.queryError ? (
        <Card><CardContent className="py-8 text-center text-sm text-rose-600">{profile.queryError}</CardContent></Card>
      ) : (
        <>
        <Card>
          <CardHeader><CardTitle>{profile.data?.displayName}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSave} className="space-y-4" data-testid="profile-form">
              {profile.formError && <p role="alert" className="text-sm text-rose-600">{profile.formError}</p>}
              {profile.saved && <p role="status" className="text-sm text-emerald-600">{profile.saved}</p>}
              <div className="space-y-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium">{locale === 'bn' ? 'পুরো নাম' : 'Full name'}</label>
                <Input id="profile-name" value={profile.displayName} onChange={(e) => profile.setDisplayName(e.target.value)} data-testid="profile-name-input" />
              </div>
              <Button type="submit" size="sm" isLoading={profile.saving} data-testid="profile-save-btn">
                {locale === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <SessionSecurityCard locale={locale} />
        </>
      )}
    </DashboardShell>
  );
}
