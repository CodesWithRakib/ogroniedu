'use client';

import { use } from 'react';
import { ContactPage } from '@/features/public/pages/contact-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default function ContactRoute({ params }: PageProps) {
  const resolvedParams = use(params);
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  return <ContactPage locale={locale} />;
}
