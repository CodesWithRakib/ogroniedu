'use client';

import React, { use } from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { SessionScheduleCalendar } from '@/components/scheduling/SessionScheduleCalendar';
import { type Locale } from '@/lib/i18n';

interface SessionsPageProps {
  params: Promise<{ locale: string }>;
}

export default function SessionsPage({ params }: SessionsPageProps) {
  const resolvedParams = use(params);
  const locale = (resolvedParams.locale === 'en' ? 'en' : 'bn') as Locale;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar locale={locale} />
      <main className="flex-1 py-4">
        <SessionScheduleCalendar locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
