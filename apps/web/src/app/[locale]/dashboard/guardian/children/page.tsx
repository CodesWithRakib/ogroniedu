'use client';

import { use } from 'react';
import { GuardianChildrenManager } from '@/components/guardian/GuardianChildrenManager';
import type { Locale } from '@/lib/i18n';

export default function GuardianChildrenRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return (
    <div className="space-y-6">
      <GuardianChildrenManager locale={locale} />
    </div>
  );
}
