'use client';

import React from 'react';
import Link from 'next/link';
import { Smartphone, Sparkles, ArrowRight } from 'lucide-react';
import { withLocale } from '@/lib/auth';
import type { Locale } from '@/lib/i18n';

export interface SidebarPromoCardProps {
  locale: Locale;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function SidebarPromoCard({
  locale,
  title,
  subtitle,
  actionLabel,
  actionHref = '/learning',
}: SidebarPromoCardProps) {
  const isBn = locale === 'bn';

  const heading = title ?? (isBn ? 'মোবাইল অ্যাপ নামিয়ে নিন' : 'Download our Mobile App');
  const sub = subtitle ?? (isBn ? 'যেকোনো সময় লাইভ ক্লাস ও নোট' : 'Get easy in another way');
  const btnLabel = actionLabel ?? (isBn ? 'ডাউনলোড' : 'Download');

  return (
    <div className="relative rounded-2xl p-3.5 overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white shadow-sm border border-emerald-800/30 select-none">
      {/* Decorative undulating lines (Donezo visual style) */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full border border-emerald-500/20 pointer-events-none" />
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full border border-teal-500/15 pointer-events-none" />

      {/* Mini Icon */}
      <div className="relative z-10 flex items-center gap-2 mb-2">
        <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
          <Smartphone className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          {isBn ? 'অগ্রণী এডু অ্যাপ' : 'OgroniEdu App'}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 mb-3">
        <p className="text-xs font-bold text-white tracking-tight leading-snug">
          {heading}
        </p>
        <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
          {sub}
        </p>
      </div>

      {/* Action Button */}
      <div className="relative z-10">
        <Link
          href={withLocale(actionHref, locale)}
          className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 shadow-xs transition-colors"
        >
          <span>{btnLabel}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
