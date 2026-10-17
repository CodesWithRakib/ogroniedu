# Design System Specification (Light-only) — UI/UX Refactor

**Date:** 2026-10-17
**Status:** Implemented — `apps/web/src/app/globals.css` is the single source of truth.
**Companion docs:** `docs/design-system-and-ui-guidelines.md` (human-facing guidelines), `apps/web/src/lib/theme/brand.ts` (exact approved hexes + contrast math).

## 1. Principles

1. **Light theme only.** No dark mode, no theme switcher, no `dark:` variants, no theme persistence. `color-scheme: light` keeps native controls/scrollbars light even when the OS prefers dark.
2. **Exact approved brand hexes are immutable.** Ocean Teal `#0df5c4` / `#00e1b2` and Sapphire Blue `#2563eb` / `#3b82f6` are kept verbatim; accessible component colours are *derived* from them, never replaced.
3. **Premium, calm, trustworthy:** white cards on a soft neutral canvas, deep readable text, subtle borders, restrained shadows, consistent radii.
4. **No scattered hardcoded colours.** All colours come from tokens in `globals.css` (exceptions in §8).
5. **WCAG 2.2 AA** for text/UI contrast, focus visibility, and reduced motion.

## 2. Brand roles

| Token | Value | Role |
| :--- | :--- | :--- |
| `--brand` | `#0df5c4` | **Signature Ocean Teal.** Selected nav, progress, decorative fills, mint accent fills. Never text on white (1.41:1), never the background of *every* button. |
| `--brand-accent` | `#00e1b2` | Ocean Teal accent — gradient step, chart fill. |
| `--brand-foreground` | `#042426` | Ink for content placed **on** mint fills (11.6:1). |
| `--primary` | `#0f766e` | Readable derivation of teal for **primary actions & brand text** (5.47:1 on white). |
| `--primary-hover` | `#115e59` | Hover state for primary actions (7.4:1). |
| `--interactive` | `#2563eb` | **Sapphire Blue** — links, focus rings, secondary interactive emphasis (5.17:1). |
| `--interactive-hover` | `#1d4ed8` | Sapphire hover (6.7:1). |
| `--interactive-accent` | `#3b82f6` | Sapphire accent — secondary indicators. |

Usage rule of thumb: **Teal = brand/identity · Sapphire = interactivity.** Primary buttons use `--primary` (teal-700); mint is a fill/indicator, not a button field.

## 3. Token reference (`:root` in `globals.css`)

### Surfaces & text

| Token | Value | Use |
| :--- | :--- | :--- |
| `--background` | `#f6f8fa` | Page canvas |
| `--foreground` | `#0f172a` | Body text (17.9:1 on white) |
| `--card` | `#ffffff` | Cards, sheets, popovers |
| `--surface` | `#f8fafc` | Secondary surface: inputs, table headers, chips |
| `--surface-muted` | `#f1f5f9` | Nested wells, muted chips |
| `--surface-elevated` | `#ffffff` | Elevated popovers/menus |
| `--surface-hover` | `#e8eef5` | Neutral hover step |
| `--secondary` / `--secondary-foreground` | `#f1f5f9` / `#1e293b` | Secondary surfaces |
| `--muted` / `--muted-foreground` | `#f1f5f9` / `#475569` | Muted text 7.6:1 on white |
| `--border` | `#e2e8f0` | Subtle borders |
| `--input` | `#cbd5e1` | Input outlines (one step stronger than border) |
| `--ring` | `#2563eb` | Focus ring (sapphire) |
| `--popover` / `--popover-foreground` | `#ffffff` / `#0f172a` | Menus, dialogs |

### Brand-derived & soft variants

| Token | Value | Contrast note |
| :--- | :--- | :--- |
| `--primary-soft` / `--primary-soft-foreground` | `#ecfdf5` / `#115e59` | Selected nav rows, soft teal wash (10.5:1 ink) |
| `--brand-soft` / `--brand-soft-foreground` | `#e6fffa` / `#115e59` | Whisper-mint decorative wash |
| `--interactive-soft` / `--interactive-soft-foreground` | `#dbeafe` / `#1e40af` | Info chips (7.15:1 ink) |
| `--link` | `#2563eb` | Inline links |

### Status (each ships as solid + `-soft` pair)

| Token | Value | Contrast (on white) |
| :--- | :--- | :--- |
| `--success` | `#15803d` | 5.02:1 · soft `#ecfdf5` |
| `--warning` | `#b45309` | 5.02:1 · soft `#fffbeb` |
| `--info` | `#1d4ed8` | 6.70:1 · soft `#eff6ff` |
| `--destructive` | `#dc2626` | 4.83:1 · soft `#fef2f2` (`-soft-foreground` `#b91c1c`, 6.47:1) |

### Sidebar / dashboard navigation

`--sidebar` `#ffffff` · `--sidebar-foreground` `#0f172a` · `--sidebar-muted` `#64748b` · `--sidebar-border` `#e2e8f0` · `--sidebar-active` `#e6fffa` (mint wash marks the selected item) · `--sidebar-active-foreground` `#115e59` · `--sidebar-hover` `#f1f5f9`.

### Geometry, motion, typography, elevation

| Group | Tokens |
| :--- | :--- |
| Radii | `--radius` `0.875rem` (base), `sm` `0.5rem`, `md` `0.75rem`, `lg` `1rem`, `xl` `1.25rem` |
| Motion | `--motion-fast` 120ms · `--motion-base` 200ms · `--motion-slow` 320ms · easing `cubic-bezier(0.16,1,0.3,1)` |
| Type scale | `--text-display` 2.25rem · `title` 1.5rem · `subtitle` 1.125rem · `body` 0.9375rem · `caption` 0.8125rem |
| Fonts | Plus Jakarta Sans (Latin), Noto Sans Bengali + Hind Siliguri (Bengali), Instrument Serif (editorial `em` accent) |
| Elevation | `--elevation-xs/sm/card/popover` — soft, low-opacity slate shadows only |

### Decorative utilities

`--gradient-hero` (mint radial glow), `--gradient-card` (mint-to-white linear), `.glass-panel`, `.hero-gradient`, `.card-gradient`, `.card-hover-elevate`, `.brand-ribbon` (mint → sapphire strip), `.animate-rise-in`, `.tabular-nums`.

## 4. Tailwind v4 mapping

All tokens are exposed as Tailwind utilities via `@theme` (`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-brand`, `text-brand-foreground`, …). No `tailwind.config.*` exists — adding a token means adding it once in `globals.css` (`:root` + `@theme`).

## 5. Component contract

| Element | Contract |
| :--- | :--- |
| Buttons | `Button` variants: `primary/default` (teal-700 fill, white ink), `secondary`, `outline`, `ghost`, `destructive` (white ink), `link` (sapphire). Radius from `--radius`, focus ring sapphire, `active:scale-[0.98]`. |
| Cards | White (`bg-card`), `rounded-2xl`, 1px `border-border`, `shadow-card`; hover lift via `.card-hover-elevate` only when interactive. |
| Inputs | `bg-surface` field, `--input` outline, sapphire focus ring, error text `--destructive` (+ `aria-invalid`, `role="alert"`). |
| Status chips | `Badge` with `-soft` background + `-soft-foreground` ink. |
| Navigation | Sidebar active item = mint wash (`--sidebar-active`) + deep teal ink; links sapphire on hover. |
| Focus | Global `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`. |
| Motion | All transitions respect `prefers-reduced-motion: reduce`. |

## 6. Contrast validation

Contrast maths live in `src/lib/theme/brand.ts` (`relativeLuminance`, `contrastRatio`) and are asserted in `apps/web/test/api-contract.spec.ts`. Verified pairs:

| Pair | Ratio | Verdict |
| :--- | :--- | :--- |
| Mint `#0df5c4` on white | 1.41:1 | Fails text — fills/indicators only (enforced by test) |
| Ink `#042426` on mint | 11.57:1 | Pass AA/AAA |
| `#0f766e` on white | 5.47:1 | Pass AA (normal text) |
| Sapphire `#2563eb` on white | 5.17:1 | Pass AA |
| Foreground on background | ≥16:1 | Pass |
| Muted foreground on white | 7.6:1 | Pass |
| Each status solid on white | ≥4.83:1 | Pass |
| Ink on each `-soft` background | ≥7:1 | Pass |

## 7. Removed in this refactor

5 selectable palettes, dark mode (`data-mode`), `data-theme.rsa-hardware` persistence, `next-themes`, `ThemeProvider`, `ThemePicker`, `ThemeSwitcher`, theme-init inline script, all `dark:` variants, and every dark-only token. There is no API or localStorage key anymore for theme selection.

## 8. Documented exceptions (only these)

| Exception | Location | Reason |
| :--- | :--- | :--- |
| Canvas 2D drawing colours | `src/features/classroom/components/InteractiveWhiteboard.tsx` | JS canvas API cannot consume CSS variables; values are literal by design. |
| Payment-provider brand colours | bKash pink (`pink-600`), Nagad orange (`orange-700`) in checkout method picker | Third-party brand identity must be recognisable; do not remap. |
| `text-white` on coloured fills | ~58 occurrences | Correct usage: white ink on teal-700/sapphire/status fills; not a palette leak. |

Any other literal hex/palette class in `apps/web/src` is a defect; scanners used during the refactor are listed in `QA_RESULTS.md`.
