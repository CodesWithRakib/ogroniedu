'use client';

import { ShieldCheck } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';

export function LearningBanner({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).learning;

  return (
    <div className="bg-card border border-brand/25 p-6 rounded-2xl shadow-sm text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-success-soft-foreground border border-primary/40 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.auditedNotice}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-primary-soft-foreground text-sm mt-1 max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="bg-primary-soft p-3 rounded-xl border border-primary/30 text-xs text-success-soft-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success-soft-foreground shrink-0" />
          <span>{t.guardianOversightNotice}</span>
        </div>
      </div>
    </div>
  );
}
