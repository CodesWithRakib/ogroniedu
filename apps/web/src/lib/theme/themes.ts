/**
 * Centralized theme registry.
 * Five complete switchable theme palettes applied via `<html data-theme="...">`
 * and modes (light, dark, system) applied via `<html data-mode="..." class="...">`.
 * Single source of truth for the OgroniEdu design system.
 */

export const APP_THEMES = [
  'emerald-slate',
  'midnight-violet',
  'ocean-teal',
  'sapphire-blue',
  'amber-luxe',
] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_THEME: AppTheme = 'midnight-violet';
export const DEFAULT_MODE: ThemeMode = 'system';

export const THEME_STORAGE_KEY = 'ogroniedu.theme';
export const THEME_MODE_STORAGE_KEY = 'ogroniedu.mode';

export interface ThemeMeta {
  labelEn: string;
  labelBn: string;
  descriptionEn: string;
  descriptionBn: string;
  primaryColor: string;
  accentColor: string;
}

export const THEME_META: Record<AppTheme, ThemeMeta> = {
  'emerald-slate': {
    labelEn: 'Emerald Slate',
    labelBn: 'এমারাল্ড স্লেট',
    descriptionEn: 'Deep slate + vibrant emerald. Trusted Bangladeshi academic identity.',
    descriptionBn: 'পেশাদার একাডেমি ও বিশ্বস্ত টিউশন প্ল্যাটফর্ম থিম।',
    primaryColor: '#059669',
    accentColor: '#10b981',
  },
  'midnight-violet': {
    labelEn: 'Midnight Violet',
    labelBn: 'মিডনাইট ভায়োলেট',
    descriptionEn: 'Deep obsidian + royal violet with amethyst glow. High visual hierarchy.',
    descriptionBn: 'উচ্চ বৈসাদৃশ্য ও প্রিমিয়াম ভায়োলেট ডাটা ড্যাশবোর্ড থিম।',
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
  'ocean-teal': {
    labelEn: 'Ocean Teal',
    labelBn: 'ওশান টিল',
    descriptionEn: 'Deep coastal navy + crisp teal/cyan. Clean focus for study sessions.',
    descriptionBn: 'শান্ত ও পরিচ্ছন্ন উপকূলীয় ব্লু-টিল লার্নিং থিম।',
    primaryColor: '#0d9488',
    accentColor: '#14b8a6',
  },
  'sapphire-blue': {
    labelEn: 'Sapphire Blue',
    labelBn: 'স্যাফায়ার ব্লু',
    descriptionEn: 'Executive deep navy + electric royal blue. Modern tech excellence.',
    descriptionBn: 'আধুনিক টেকনোলজি ও করপোরেট শিক্ষামূলক স্যাফায়ার থিম।',
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
  },
  'amber-luxe': {
    labelEn: 'Amber Luxe',
    labelBn: 'অ্যাম্বার লাক্স',
    descriptionEn: 'Warm sand + rich golden amber with obsidian depth. Distinguished luxury.',
    descriptionBn: 'স্বর্ণালী আভা ও প্রিমিয়াম অভিজ্ঞতার বিশেষ থিম।',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
  },
};

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && (APP_THEMES as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}
