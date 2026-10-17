/**
 * OgroniEdu — Centralized brand configuration (single source of truth).
 *
 * Product-owner approved palette. These hex values are FINAL and must never be
 * silently replaced or approximated. They are bright accents, so the design
 * system derives accessible component shades from them instead of changing them.
 *
 * The matching CSS custom properties live in `src/app/globals.css`.
 */

/** Ocean Teal — the signature OgroniEdu brand identity. */
export const OCEAN_TEAL = {
  primaryColor: '#0df5c4',
  accentColor: '#00e1b2',
} as const;

/** Sapphire Blue — complementary interactive accent. */
export const SAPPHIRE_BLUE = {
  primaryColor: '#2563eb',
  accentColor: '#3b82f6',
} as const;

export const BRAND = {
  oceanTeal: OCEAN_TEAL,
  sapphireBlue: SAPPHIRE_BLUE,
} as const;

/**
 * Derived, accessible semantic shades.
 *
 * The approved accents fail WCAG AA as foreground text on white surfaces:
 *   #0df5c4 on #ffffff = 1.41:1   (Ocean Teal primary)
 *   #00e1b2 on #ffffff = 1.69:1   (Ocean Teal accent)
 * so every readable/interactive colour below is a validated derivation.
 */
export const SEMANTIC_COLORS = {
  /** teal-700 — primary actions & brand text (5.47:1 on white). */
  primary: '#0f766e',
  primaryHover: '#115e59',
  primaryForeground: '#ffffff',
  primarySoft: '#ecfdf5',
  primarySoftForeground: '#115e59',

  /** Approved mint — fills, indicators, progress, decorative accents only. */
  brand: OCEAN_TEAL.primaryColor,
  brandAccent: OCEAN_TEAL.accentColor,
  brandForeground: '#042426',

  /** Sapphire — links, focus rings and secondary interactive emphasis. */
  interactive: SAPPHIRE_BLUE.primaryColor,
  interactiveHover: '#1d4ed8',
  interactiveForeground: '#ffffff',
  interactiveAccent: SAPPHIRE_BLUE.accentColor,
  interactiveSoft: '#dbeafe',
  interactiveSoftForeground: '#1e40af',

  /** Neutral light surfaces. */
  background: '#f6f8fa',
  card: '#ffffff',
  foreground: '#0f172a',
  mutedForeground: '#475569',
  border: '#e2e8f0',

  /** Status. */
  success: '#15803d',
  warning: '#b45309',
  info: '#1d4ed8',
  destructive: '#dc2626',
} as const;

/** Documented rules for how the two palettes cooperate on screen. */
export const BRAND_USAGE_RULES = [
  'Ocean Teal is the signature brand identity: selected navigation, progress highlights, verification indicators, decorative mint fills and brand moments.',
  'Sapphire Blue is the interactive complement: hyperlinks, focus rings, secondary emphasis and informational actions.',
  'Bright mint (#0df5c4 / #00e1b2) is never used as text on white surfaces and never as the background of every primary button.',
  'Primary buttons use the accessible teal-700 derivation with white foreground; mint appears as a supporting fill or indicator.',
  'One shared light theme applies to every route and role. There is no dark mode and no theme switcher.',
] as const;

/** WCAG relative luminance for a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
