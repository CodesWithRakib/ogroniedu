/**
 * Centralized theme registry. Three complete switchable themes applied via
 * `<html data-theme="...">` tokens in globals.css. Single source of truth.
 */

export const APP_THEMES = ['midnight-violet', 'ocean-teal', 'emerald-slate'] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const DEFAULT_THEME: AppTheme = 'midnight-violet';

export const THEME_STORAGE_KEY = 'ogroniedu.theme';

export const THEME_META: Record<AppTheme, { labelEn: string; labelBn: string; description: string }> = {
  'midnight-violet': {
    labelEn: 'Midnight Violet',
    labelBn: 'মিডনাইট ভায়োলেট',
    description: 'Deep violet + charcoal, high contrast for data-heavy dashboards.',
  },
  'ocean-teal': {
    labelEn: 'Ocean Teal',
    labelBn: 'ওশান টিল',
    description: 'Deep navy + teal/cyan, clear hierarchy for learning and scheduling.',
  },
  'emerald-slate': {
    labelEn: 'Emerald Slate',
    labelBn: 'এমারাল্ড স্লেট',
    description: 'Deep slate + emerald/mint, calm professional education identity.',
  },
};

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (APP_THEMES as readonly string[]).includes(value);
}
