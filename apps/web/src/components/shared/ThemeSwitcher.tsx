'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useAppTheme } from '@/lib/theme/ThemeProvider';
import { APP_THEMES, THEME_META, type AppTheme } from '@/lib/theme/themes';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Accessible theme selector (radiogroup). Offers all three themes,
 * updates the entire app immediately, persists across reloads.
 */
export function ThemeSwitcher({ locale }: { locale: Locale }) {
  const { theme, setTheme } = useAppTheme();
  const isBn = locale === 'bn';
  return (
    <div
      role="radiogroup"
      aria-label={isBn ? 'থিম নির্বাচন' : 'Select theme'}
      className="grid grid-cols-3 gap-2"
      data-testid="theme-switcher"
    >
      {APP_THEMES.map((t: AppTheme) => {
        const active = theme === t;
        return (
          <button
            key={t}
            role="radio"
            aria-checked={active}
            data-testid={`theme-option-${t}`}
            onClick={() => setTheme(t)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTheme(t);
              }
            }}
            className={cn(
              'flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition',
              active
                ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] hover:border-[var(--ring)]',
            )}
          >
            <span>{isBn ? THEME_META[t].labelBn : THEME_META[t].labelEn}</span>
            {active && <Check className="h-3.5 w-3.5" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
