import React from 'react';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { type Locale } from '@/lib/i18n';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar locale={locale} />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
