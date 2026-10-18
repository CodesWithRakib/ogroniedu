# OgroniEdu — Design Rules & Design System Specification

**Version:** 2.0 (Premium Light-Only System)  
**Status:** Mandatory Engineering & Design Rules

---

## 1. Product Design Core Principles

1. **Light Theme Only:**
   - The platform is strictly light-mode. No dark mode, no theme switcher, no dark CSS variables, and no `dark:` variant utilities.
   - `color-scheme: light` is declared on root to guarantee native browser chrome, datepickers, and scrollbars remain light.

2. **Clean, Minimal, and Premium Aesthetic:**
   - Surfaces must be crisp white (`#ffffff`) or subtle neutral off-white (`#f8fafc`).
   - Visual organization is achieved primarily through **meaningful whitespace, typography hierarchy, and subtle background contrast**, rather than thick borders or heavy shadows.
   - Every border, shadow, background, and divider must have a functional purpose.

3. **No Direct HTML-Based Feature UI:**
   - Pages and feature components **must not** implement raw `<button>`, `<input>`, `<select>`, `<dialog>`, `<card>` elements with ad hoc Tailwind classes.
   - All interactive and structural elements must use the centralized, customized shadcn/ui and shared component library.

---

## 2. Approved Brand Palette & Semantic Usage

The approved brand palette hex codes must be preserved verbatim in centralized theme definitions:

### Approved Brand Values

- **Ocean Teal:**
  - `primaryColor`: `#0df5c4` (signature brand glow, accent fills, progress indicators)
  - `accentColor`: `#00e1b2` (gradient step, active navigation accents)
- **Sapphire Blue:**
  - `primaryColor`: `#2563eb` (interactive links, focus rings, secondary CTAs)
  - `accentColor`: `#3b82f6` (informational accents)

### Derived Accessible Component Colors

Because `#0df5c4` and `#00e1b2` have insufficient contrast as text on white (1.41:1 and 1.69:1 respectively), the system uses derived, accessible shades for text and solid buttons:

- **`--primary` (`#0f766e` / Teal-700):** 5.47:1 contrast on white. Used for primary solid buttons, key brand headings, and active indicators.
- **`--primary-hover` (`#115e59` / Teal-800):** Hover state for primary buttons.
- **`--primary-soft` (`#ecfdf5` / Mint-50):** Background wash for active states and badges.
- **`--primary-soft-foreground` (`#0f766e`):** Text inside mint washes (5.47:1 contrast).

### Semantic Status Tokens

Brand colors must **never** be substituted for status colors:

- **Success:** `--success` (`#15803d` / Green-700), `--success-soft` (`#f0fdf4`), text 5.02:1 on white.
- **Warning:** `--warning` (`#b45309` / Amber-700), `--warning-soft` (`#fffbeb`), text 5.02:1 on white.
- **Destructive / Error:** `--destructive` (`#dc2626` / Red-600), `--destructive-soft` (`#fef2f2`), text 4.83:1 on white.
- **Info:** `--info` (`#1d4ed8` / Blue-700), `--info-soft` (`#eff6ff`), text 6.70:1 on white.

---

## 3. Borders and Elevation Scale

### The "No Excessive Borders & Shadows" Rule:

- **Never** apply `border-primary/40` or heavy colored borders to cards, dividers, and widgets indiscriminately.
- Standard borders use `--border` (`#e2e8f0` / Slate-200), delicate and restrained.
- Dividers use `--border/60` or `--border/80`.
- **Card Shadows:** Standard cards must have **zero** heavy drop shadows. They use subtle 1px border with a whisper elevation:
  - `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03)`
- Floating overlays, popovers, and dialogs use restrained elevation:
  - `box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`

### Card Nesting Policy:

- Cards inside cards are prohibited unless functionally separating independent sub-documents (e.g. multi-step forms).
- Content within cards must be structured using **padding, typography, and clean horizontal or vertical list dividers**, never nested bordered boxes.

---

## 4. Typography Hierarchy & Contrast (WCAG 2.2 AA)

All text must pass minimum WCAG 2.2 AA contrast ratios:

- **Normal Text (< 18px / < 14px bold):** Minimum **4.5:1** contrast.
- **Large Text (≥ 18px / ≥ 14px bold):** Minimum **3.0:1** contrast.

### Typography Scale:

- **Display / Hero H1:** `text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground` (`#0f172a`).
- **Page Title H1:** `text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground`.
- **Section Title H2:** `text-xl sm:text-2xl font-bold tracking-tight text-foreground`.
- **Card Title H3:** `text-base sm:text-lg font-semibold text-foreground`.
- **Body Text:** `text-sm sm:text-base text-foreground/90 font-normal leading-relaxed`.
- **Muted / Contextual Descriptions:** `text-xs sm:text-sm text-muted-foreground` (`#475569`, 7.6:1 contrast on white).
- **Subtitles on Dashboard Pages:** `text-xs sm:text-sm text-muted-foreground` (Never use colored teal for page subtitles!).
- **Captions / Timestamps:** `text-xs text-muted-foreground font-medium`.

### Bengali Font Optical Rules:

- When `:lang(bn)` or `.font-bengali` is active, line-height must be relaxed (`line-height: 1.625`) to prevent broken conjuncts and subscript vowels from clipping.
- `letter-spacing: 0` is strictly enforced for Bengali text to avoid rendering broken grapheme clusters.

---

## 5. Normalized Radius Scale

To eliminate visual chaos, every component must adhere to this scale:

- `rounded-md` (`0.375rem` / 6px): Small chips, tooltips, nested status dots.
- `rounded-lg` (`0.5rem` / 8px): Dropdown items, small badges, table rows.
- `rounded-xl` (`0.75rem` / 12px): Standard buttons, inputs, selects, form fields.
- `rounded-2xl` (`1rem` / 16px): Standard cards, dialogs, drawers, hero banners.
- `rounded-full` (9999px): Reserved strictly for circular avatars, status pills, and icon-only buttons. Do not use `rounded-full` for standard cards or rectangular containers.

---

## 6. Button Variants & Interaction Guidelines

1. **`primary`:** Solid teal-700 (`bg-primary text-primary-foreground hover:bg-primary-hover`). Used for the single primary call-to-action on a screen.
2. **`secondary`:** Neutral soft surface (`bg-surface hover:bg-surface-hover text-foreground border border-border/80`). Used for supporting actions.
3. **`outline`:** Crisp white surface (`border border-border bg-card hover:bg-surface-hover text-foreground`). Used for cancel, filters, or alternative options.
4. **`ghost`:** Transparent background (`hover:bg-surface-hover text-foreground`). Used for table actions, pagination arrows, toolbar icons.
5. **`destructive`:** Red-600 surface (`bg-destructive text-white hover:bg-destructive/90`). Used for dangerous actions with confirmation dialog.
6. **`link`:** Sapphire blue text (`text-interactive hover:underline`).

All buttons have consistent height (`h-9` for sm, `h-10` for md, `h-11` for lg), consistent focus rings (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`), and accessible touch targets.

---

## Enforced Rules — verified in code on 2026-10-18

These are the rules actually enforced by the codebase after the rendered-UI correction pass (measured with codemod sweeps + screenshot review).

### R-1: Shadow policy (elevation means floating)

- **Default: no shadow.** Cards, sections, tables, KPIs, and page surfaces are defined by `border-border` + background contrast only.
- `shadow-2xs` and `shadow-inner` are forbidden and were removed everywhere (67 occurrences).
- `shadow-xs` remains only as a whisper-soft state hint on interactive cards (`~0.03` alpha, visually negligible).
- Shadows are reserved for genuinely floating surfaces: dialogs, sheets/drawers, popovers, dropdowns, toasts.
- Heavy card shadows (`shadow-md`/`lg`/`xl`/`2xl`) were removed from 45 card-like surfaces across 21 files.

### R-2: Border policy (one weight)

- All borders use `border-border`. Opacity variants (`border-border/40`, `/60`, `/70`, `/80`) are gone (379 occurrences normalized).
- Badges and status chips are **borderless** soft fills (`bg-{semantic}-soft text-{semantic}-soft-foreground`).
- Repeated nesting is forbidden: never wrap a `Card` inside another `Card` for decoration (fixed in audit-logs and hub pages).

### R-3: Radius ladder

| Layer             | Radius                   | Usage                                            |
| :---------------- | :----------------------- | :----------------------------------------------- |
| Controls          | `rounded-xl` (12px)      | Buttons, inputs, selects, textareas, tab pills   |
| Cards / surfaces  | `rounded-2xl` (16px)     | Cards, panels, tables, sections, modals          |
| Pills / chips     | `rounded-full`           | Badges, status chips, avatars, icon tiles        |

`rounded-3xl` is no longer used (127 occurrences consolidated).

### R-4: Color semantics (single source of truth)

| Intent                       | Token(s)                                                                        | Notes                                                            |
| :--------------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------- |
| Primary actions / brand text | `--primary` `#0f766e`                                                           | Buttons, active states, links-to-action                          |
| Brand fills (Ocean Teal)     | `--brand` `#0df5c4` / `--brand-accent` `#00e1b2` + `--brand-foreground` ink     | Large fills with ink text only; never for small text contrast    |
| Interactive (Sapphire)       | `--interactive` `#2563eb`                                                       | Links, focus-adjacent highlights, informational accents          |
| Success                      | `success` + `success-soft` trio (icon `success-strong` in soft surfaces)        | Never pair a green icon/text on a mint fill directly             |
| Warning                      | `warning` + `warning-soft`                                                      | Actionable upkeep (e.g. pending KYC), not decoration             |
| Danger / destructive         | `destructive` + `destructive-soft`                                              | Dangerous actions, errors                                        |
| Info                         | `info` + `info-soft`                                                            | Neutral-informational counters                                   |
| Rating stars                 | `--star` `#d97706`                                                              | Ratings only; never reuse `warning` for stars                    |
| Payment provider brands      | bKash pink `#E2136E`, Nagad orange (brand-mark only)                            | The only allowed non-semantic colors; provider identity only     |

Raw Tailwind palette classes (`emerald-*`, `amber-*`, `blue-*`, `purple-*`, `rose-*`, `green-*`, `orange-*`, `cyan-*`, `indigo-*`) are forbidden in feature UI; use the semantic tokens above.

### R-5: Focus standard

- Keyboard focus: `focus-visible:ring-2 focus-visible:ring-ring/35` (with `ring-offset` only on floating controls where needed).
- `focus:ring-*` without `focus-visible` is not permitted on interactive elements (33 occurrences migrated).
- Radix close-buttons use explicit `focus-visible:ring-offset` handling.

### R-6: Charts

- No hatching/striping. Data emphasis uses **one solid `primary` bar** for the peak/active series; remaining bars are soft neutral pills (`surface-muted`) with value labels.
- Gridlines and axes are `border-border` hairlines; no shadows on chart containers.

### R-7: Hub / index page pattern

- Index ("hub") pages: neutral `surface-muted` icon tiles; at most one functional accent per page (e.g. warning for actionable KYC), never a rainbow of per-card tones in the default state.
- Section headers: single `<h1>` per page (shell title removed from 18 admin pages); hub cards carry `hover:border-input hover:shadow-xs` only.
