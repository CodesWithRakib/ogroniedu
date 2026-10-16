'use client';

import { use } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import type { Locale } from '@/lib/i18n';

export default function GuardianChildrenRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <DashboardShell
      locale={locale}
      title={locale === 'bn' ? 'সন্তান ও শিক্ষার্থী প্রোফাইল' : 'Children Profiles'}
      subtitle={
        locale === 'bn'
          ? 'যুক্ত থাকা সন্তানের প্রোফাইল, অভিভাবকত্ব এবং নিরাপত্তা সম্মতি পরিচালনা করুন'
          : 'Manage linked children, guardian relationships and safety consent'
      }
      role="guardian"
    >
      <GuardianChildrenManager locale={locale} />
    </DashboardShell>
  );
}
