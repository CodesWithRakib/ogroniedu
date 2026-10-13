'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  DEFAULT_THEME,
  DEFAULT_MODE,
  THEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  isAppTheme,
  isThemeMode,
  type AppTheme,
  type ThemeMode,
} from './themes';

export interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolvedMode: 'light' | 'dark';
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Read initial stored values after mount
  useEffect(() => {
    setMounted(true);
    setSystemMode(getSystemMode());

    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (isAppTheme(storedTheme)) {
        setThemeState(storedTheme);
      }
      const storedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (isThemeMode(storedMode)) {
        setModeState(storedMode);
      }
    } catch {
      // LocalStorage access may fail in incognito/strict sandboxes
    }

    // Listen to OS system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return systemMode;
    return mode;
  }, [mode, systemMode]);

  // Apply attributes to <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-mode', resolvedMode);

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
      document.cookie = `${THEME_MODE_STORAGE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookie is best-effort fallback
    }
  }, [theme, mode, resolvedMode, mounted]);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // localStorage fallback
    }
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
    } catch {
      // localStorage fallback
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, next);
      } catch {
        // localStorage fallback
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      mode,
      setMode,
      resolvedMode,
      toggleMode,
    }),
    [theme, setTheme, mode, setMode, resolvedMode, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      mode: DEFAULT_MODE,
      setMode: () => {},
      resolvedMode: 'light',
      toggleMode: () => {},
    };
  }
  return context;
}
