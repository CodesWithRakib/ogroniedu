'use client';

import { use } from 'react';
import { ConversationsInboxView } from '@/features/messaging';
import type { Locale } from '@/lib/i18n';

export default function GuardianMessagesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const resolved = use(params);
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  return <ConversationsInboxView locale={locale} />;
}
