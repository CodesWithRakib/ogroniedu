'use client';

import React from 'react';
import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from 'next-themes';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isAppTheme, type AppTheme } from './themes';

/**
 * App-wide theme provider. Uses next-themes with attribute="data-theme" so the
 * entire application (public + all role layouts) switches immediately with no flash.
 * Theme persists in localStorage under a non-sensitive key; safe default on SSR.
 */
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME}
      storageKey={THEME_STORAGE_KEY}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemeProvider>
  );
}

/** Accessible theme switcher state. `setTheme` updates the whole app immediately. */
export function useAppTheme(): { theme: AppTheme; setTheme: (t: AppTheme) => void } {
  const { theme, setTheme } = useNextTheme();
  const current: AppTheme = isAppTheme(theme) ? theme : DEFAULT_THEME;
  const set = React.useCallback(
    (t: AppTheme) => {
      setTheme(t);
      try {
        document.cookie = `${THEME_STORAGE_KEY}=${t}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // Cookie persistence is best-effort; localStorage (next-themes) is primary.
      }
    },
    [setTheme],
  );
  return { theme: current, setTheme: set };
}
