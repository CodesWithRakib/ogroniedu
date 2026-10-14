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
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground transition-colors">
      <Navbar locale={locale} />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
