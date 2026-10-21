'use client';

import React, { use } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ConversationsInboxView } from '@/features/messaging';
import { type Locale } from '@/lib/i18n';

export default function MessagesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <RequireAuth locale={locale}>
      <ConversationsInboxView locale={locale} />
    </RequireAuth>
  );
}
