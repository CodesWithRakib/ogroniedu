'use client';

import { ShieldCheck } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';

export function LearningBanner({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).learning;

  return (
    <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-emerald-950 p-6 rounded-2xl border border-emerald-700/40 shadow-xl text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.auditedNotice}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{t.title}</h1>
          <p className="text-emerald-200/80 text-sm mt-1 max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.guardianOversightNotice}</span>
        </div>
      </div>
    </div>
  );
}
