import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { Shield, LayoutDashboard, BarChart3, DatabaseZap } from 'lucide-react';
import { type Locale } from '@/lib/i18n';

export default async function AdminLayout({
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-white">
      <Navbar locale={locale} />

      {/* Admin Sub-navigation Header */}
      <nav
        aria-label="Admin Operations Navigation"
        className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-2.5"
      >
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              {isBn ? 'অপারেশনস ও কমপ্লায়েন্স কন্ট্রোল' : 'Ops & Compliance Control'}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {isBn ? 'প্রশাসনিক গভর্ন্যান্স ও অডিট ট্রেইল' : 'Administrative Governance & Audit Trail'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <Link
              href={`/${locale}/admin`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-amber-400" />
              <span>{isBn ? 'কন্ট্রোল সেন্টার' : 'Control Center'}</span>
            </Link>
            <Link
              href={`/${locale}/analytics`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isBn ? 'অপারেশনাল অ্যানালিটিক্স' : 'Analytics & Reporting'}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
