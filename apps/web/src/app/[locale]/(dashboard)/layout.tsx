import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { BookOpen, Calendar, CreditCard, Sparkles } from 'lucide-react';
import { type Locale } from '@/lib/i18n';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const isBn = locale === 'bn';

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar locale={locale} />

      {/* Dashboard Sub-navigation Header */}
      <nav
        aria-label="Portal Navigation"
        className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-2.5"
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              {isBn ? 'লার্নিং ও টিউশন পোর্টাল' : 'Learning Portal'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <Link
              href={`/${locale}/learning`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isBn ? 'স্টাডি রুম' : 'Study Room'}</span>
            </Link>
            <Link
              href={`/${locale}/sessions`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span>{isBn ? 'ক্লাস শিডিউল' : 'Sessions'}</span>
            </Link>
            <Link
              href={`/${locale}/payments`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5 text-purple-400" />
              <span>{isBn ? 'পেমেন্ট ও লেজার' : 'Payments'}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
