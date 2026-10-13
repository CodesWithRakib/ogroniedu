'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Palette, Check } from 'lucide-react';
import { useAppTheme } from '@/lib/theme';
import { APP_THEMES, THEME_META, type AppTheme, type ThemeMode } from '@/lib/theme/themes';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

interface ThemePickerProps {
  locale?: Locale;
  compact?: boolean;
  className?: string;
}

export function ThemePicker({ locale = 'bn', compact = false, className }: ThemePickerProps) {
  const { theme, setTheme, mode, setMode, resolvedMode } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isBn = locale === 'bn';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentMeta = THEME_META[theme];

  return (
    <div className={cn('relative inline-flex items-center', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isBn ? 'থিম এবং কালার প্যালেট পরিবর্তন করুন' : 'Change theme and color palette'}
        aria-expanded={isOpen}
        className={cn(
          'group relative inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-md shadow-xs transition-all hover:bg-surface-hover hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isOpen && 'ring-2 ring-primary border-primary/40',
        )}
      >
        {/* Color preview circle */}
        <span
          className="h-3 w-3 rounded-full shadow-xs transition-transform group-hover:scale-110"
          style={{ backgroundColor: currentMeta.primaryColor }}
          aria-hidden="true"
        />

        {/* Current mode icon */}
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {resolvedMode === 'dark' ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
        </span>

        {!compact && (
          <span className="hidden sm:inline-block max-w-[90px] truncate text-xs font-semibold">
            {isBn ? currentMeta.labelBn : currentMeta.labelEn}
          </span>
        )}
      </button>

      {/* Floating Theme Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={isBn ? 'কালার ও থিম প্যানেল' : 'Color and theme panel'}
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-border bg-card p-3.5 shadow-xl shadow-black/10 backdrop-blur-xl animate-rise-in"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between border-b border-border/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span>{isBn ? 'থিম ও কালার কন্ট্রোল' : 'Theme & Appearance'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              {resolvedMode === 'dark' ? (isBn ? 'ডার্ক মোড' : 'Dark Mode') : (isBn ? 'লাইট মোড' : 'Light Mode')}
            </span>
          </div>

          {/* Mode Switcher: Light / Dark / System */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              {isBn ? 'ডিসপ্লে মোড' : 'Display Mode'}
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all',
                  mode === 'light'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>{isBn ? 'লাইট' : 'Light'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('dark')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all',
                  mode === 'dark'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{isBn ? 'ডার্ক' : 'Dark'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('system')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all',
                  mode === 'system'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>{isBn ? 'সিস্টেম' : 'Auto'}</span>
              </button>
            </div>
          </div>

          {/* Color Palettes Grid */}
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              {isBn ? 'ব্র্যান্ড কালার প্যালেট' : 'Color Palette Presets'}
            </div>
            <div className="space-y-1.5">
              {APP_THEMES.map((t) => {
                const meta = THEME_META[t];
                const isActive = theme === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      'group w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-all',
                      isActive
                        ? 'bg-primary-soft text-primary-soft-foreground font-semibold ring-1 ring-primary/30'
                        : 'text-foreground hover:bg-surface-hover',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Color Dot with glow */}
                      <span
                        className="relative flex h-4 w-4 items-center justify-center rounded-full shadow-xs ring-1 ring-black/10"
                        style={{ backgroundColor: meta.primaryColor }}
                      >
                        {isActive && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <div>
                        <div className="font-semibold leading-tight">
                          {isBn ? meta.labelBn : meta.labelEn}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal line-clamp-1">
                          {isBn ? meta.descriptionBn : meta.descriptionEn}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
