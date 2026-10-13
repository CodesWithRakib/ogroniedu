'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';
import { useProfileForm } from '../hooks/use-profile-form';

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
      )}
    </DashboardShell>
  );
}
