'use client';

import { ShieldCheck } from 'lucide-react';
import { getDictionary, type Locale } from '@/lib/i18n';

export function LearningBanner({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).learning;

  return (
    <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xs text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.auditedNotice}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl font-normal leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="bg-surface p-3.5 rounded-2xl border border-border text-xs text-foreground font-semibold flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>{t.guardianOversightNotice}</span>
        </div>
      </div>
    </div>
  );
}
