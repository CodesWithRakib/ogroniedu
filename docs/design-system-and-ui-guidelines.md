# OgroniEdu Design System & UI Guidelines

**Version:** 2.0.0 (light-theme-only design system)
**Target:** Monorepo web application (`apps/web`)
**Standard:** WCAG 2.2 AA, mobile-first responsive, bilingual (Bengali & English)
**Source of truth:** `apps/web/src/app/globals.css` (tokens) + `apps/web/src/lib/theme/brand.ts` (approved brand values)

---

## 1. Design Philosophy

OgroniEdu is engineered for the educational ecosystem of Bangladesh. The platform applies **one calm, premium light theme** to every route and every role:

1. **Trustworthy clarity:** white cards on a soft neutral canvas, deep readable ink, subtle borders, restrained elevation. No dark mode, no theme switcher, no dark tokens.
2. **Signature Ocean Teal:** the approved mint is the signature brand moment (selected navigation, progress, verification indicators, decorative washes).
3. **Confident Sapphire:** the approved blue is the interactive complement (links, focus rings, informational actions).
4. **Native bilingual experience:** full typographic parity between Bengali (`bn`) and English (`en`).
5. **Low-bandwidth mobile optimization:** lightweight icons, touch targets ≥ 44px, no layout shift.
6. **Accessible semantics:** strict ARIA states, visible focus rings, reduced-motion support.

---

## 2. Approved brand palette (do not change)

These hex values were approved by the product owner and are **preserved verbatim**. They are bright accents, so all readable component colours are validated *derivations* of them:

| Approved value | Hex | Where it is allowed |
| :--- | :--- | :--- |
| Ocean Teal `primaryColor` | `#0df5c4` | Mint fills, selected states, progress, decorative washes, brand moments |
| Ocean Teal `accentColor` | `#00e1b2` | Gradient step of the mint fill, chart fill accents |
| Sapphire Blue `primaryColor` | `#2563eb` | Links, focus rings, secondary interactive emphasis |
| Sapphire Blue `accentColor` | `#3b82f6` | Gradient step of the sapphire fill, informational accents |

**Hard rules**

- Bright mint (`#0df5c4` / `#00e1b2`) is **never** used as text on white (§2.1 explains why).
- Bright mint is **never** the background of every primary button — primary actions use the accessible teal-700 derivation; mint appears as a supporting fill or indicator.
- Sapphire is the only interactive emphasis colour; do not introduce a third accent.

### 2.1 Derived, contrast-validated tokens

The approved accents fail WCAG as foreground text on white, so the design system derives accessible shades. All ratios below are computed with the WCAG relative-luminance formula (verified by `apps/web/test/api-contract.spec.ts`):

| Token | Hex | Contrast | Use |
| :--- | :--- | :--- | :--- |
| `--brand` | `#0df5c4` | 1.41:1 on white | Mint fills / indicators only (never text on white) |
| `--brand-foreground` | `#042426` | 11.57:1 on mint | Ink placed **on** mint fills |
| `--primary` | `#0f766e` | 5.47:1 on white | Primary buttons, brand text, key actions |
| `--primary-hover` | `#115e59` | 7.01:1 on white | Primary hover/active |
| `--primary-soft` | `#ecfdf5` | – | Mint-tinted wash behind featured cards |
| `--primary-soft-foreground` | `#115e59` | 7.8:1 on soft | Text/icons inside mint washes |
| `--interactive` | `#2563eb` | 5.17:1 on white | Links, focus rings, secondary emphasis |
| `--interactive-hover` | `#1d4ed8` | 6.70:1 on white | Interactive hover |
| `--interactive-soft` / `-foreground` | `#dbeafe` / `#1e40af` | 7.15:1 | Info chips/tiles |
| `--foreground` | `#0f172a` | 17.9:1 on white | Body text and headings |
| `--muted-foreground` | `#475569` | 7.6:1 on white | Secondary captions, timestamps |
| `--background` | `#f6f8fa` | – | Page canvas |
| `--card` | `#ffffff` | – | Cards, modals, sheets |
| `--border` | `#e2e8f0` | – | Dividers, input borders |
| `--success` | `#15803d` | 5.02:1 on white | Verified, paid, completed |
| `--warning` | `#b45309` | 5.02:1 on white | Pending review, deadlines |
| `--info` | `#1d4ed8` | 6.70:1 on white | Informational |
| `--destructive` | `#dc2626` | 4.83:1 on white | Errors, destructive actions |
| `--sidebar-active` / `-foreground` | `#e6fffa` / `#115e59` | 7.8:1 | Selected navigation item (mint wash + deep teal) |
| `--ring` | `#2563eb` | 5.17:1 | Global focus ring |

Status tokens ship in triples: `--success` (text/solid), `--success-soft` (wash), `--success-soft-foreground` (text on wash). The same shape applies to warning, info and destructive.

**Payment-provider identity colours are the only exception:** bKash pink (`pink-600`/`pink-500` borders) and Nagad orange (`orange-700` text) are kept deliberately so users recognise the providers; text variants use the deeper shades (pink-600, orange-700) to stay readable.

---

## 3. Design tokens

All tokens live in `apps/web/src/app/globals.css` under `@theme` (Tailwind v4 bridge) and `:root` (values). `color-scheme: light` is declared explicitly so browser chrome, form controls and scrollbars stay light even when the OS prefers dark.

### 3.1 Surfaces

| Token | Value | Use |
| :--- | :--- | :--- |
| `--background` | `#f6f8fa` | Page canvas |
| `--card` | `#ffffff` | Elevated content surfaces |
| `--surface` | `#f8fafc` | Inputs, table headers, chips on white cards |
| `--surface-muted` | `#f1f5f9` | Nested wells, muted chips |
| `--surface-hover` | `#e8eef5` | Neutral hover step |
| `--muted` | `#f1f5f9` | Muted wash |
| `--sidebar` | `#ffffff` | Dashboard navigation surface |

### 3.2 Geometry, motion, elevation

- Radii: `--radius` `0.875rem` (default), `sm` `0.5rem`, `md` `0.75rem`, `lg` `1rem`, `xl` `1.25rem`.
- Motion: `--motion-fast` 120ms, `--motion-base` 200ms, `--motion-slow` 320ms with ease-out `cubic-bezier(0.16, 1, 0.3, 1)`.
- Elevation is restrained: `--elevation-xs`, `--elevation-sm`, `--elevation-card` (soft long shadow), `--elevation-popover`. Loud `shadow-xl/2xl` panels were reduced to `shadow-sm`; coloured glow shadows were removed.

### 3.3 Typography

- English: Plus Jakarta Sans → Inter → system-ui.
- Bengali: Noto Sans Bengali → Hind Siliguri; `line-height: 1.625`, `letter-spacing: 0 !important`, headings `1.38`.
- Editorial accent: `h1 em` / `h2 em` use Instrument Serif italic in `--primary`.
- Scale: `--text-display` 2.25rem, `--text-title` 1.5rem, `--text-subtitle` 1.125rem, `--text-body` 0.9375rem, `--text-caption` 0.8125rem.
- Tabular numerals (`.tabular-nums`) for money, counts and clocks.

### 3.4 Reusable utilities

- `.glass-panel` — translucent card + blur + hairline border (used sparingly on hero/overlay surfaces).
- `.hero-gradient` — calm radial mint wash for hero backdrops.
- `.card-gradient` — whisper mint overlay for featured cards.
- `.card-hover-elevate` — subtle lift with neutral→brand-tinted border.
- `.brand-ribbon` — mint→teal→sapphire signature strip.
- `.animate-rise-in` — 8px entrance, disabled under `prefers-reduced-motion`.
- `.tabular-nums`, `::selection` (mint wash + ink).

---

## 4. Component rules

| Component | Rule |
| :--- | :--- |
| **Buttons** | `primary` = teal-700 fill + white text; `secondary` = white/neutral; `outline` = border + ink; `ghost` = transparent; `destructive` = red-600. Mint fill + ink is only for marquee CTAs (one per screen). |
| **Cards** | White surface, `--border` hairline, `--elevation-card`, radius `2xl`/`3xl` for hero panels. |
| **Nav (public)** | Sticky translucent white; selected link = `--primary` text + mint underline; no moon/dark toggle exists. |
| **Dashboard sidebar** | White surface; selected item = `--sidebar-active` mint wash + `--sidebar-active-foreground`; hover = `--sidebar-hover`. |
| **Badges/status** | Semantic triples (`-soft` wash + `-soft-foreground` text); icons `w-3.5/4`. |
| **Inputs** | `bg-surface`, `border-border`, `focus-visible:ring-2 ring-ring`, inline error text in `--destructive`; errors never rely on colour alone (icon + text). |
| **Tables** | Header on `bg-surface`, rows separated by `divide-border`, tabular numerals for numbers. |
| **Modals/sheets** | White panel, radius `3xl`, `--elevation-popover`; backdrop stays `bg-black/60-80` (a scrim, not a dark theme). |
| **Toasts** | White card, semantic left border, ink text. |
| **Charts** | Brand mint/sapphire fills with neutral grid lines; tooltips on white cards. |
| **Canvas (whiteboard)** | Canvas 2D cannot resolve CSS `var()`; colours are explicit hex literals in the tool palette (documented exception). |

---

## 5. Accessibility (WCAG 2.2 AA)

- Every text/background pair shipped in the system ≥ 4.5:1 (≥ 3:1 for large/bold and UI boundaries); see §2.1.
- Global visible focus: `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }` — never removed.
- Touch targets ≥ 44px (mobile-nav items, icon buttons padded).
- Colour is never the only status signal: pair with icon + label.
- `prefers-reduced-motion` disables entrance animations and smooth scrolling.
- Bengali line-height/letter-spacing guards avoid broken conjuncts.
- Form fields expose label + `aria-invalid` + inline error text.

---

## 6. Usage rules

**Do**

- Use semantic utilities: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, `bg-interactive`, `bg-brand` (fill), `text-brand-foreground` (ink on mint).
- Keep mint for accents/indicators; keep sapphire for interactive emphasis.
- Prefer `shadow-sm`/`card-hover-elevate` over loud shadows.
- Component-level overrides only via tokens.

**Don't**

- Don't use bright mint (`#0df5c4`/`#00e1b2`) as text on white or as page-scale backgrounds.
- Don't reintroduce dark surfaces, `dark:` variants, `next-themes`, theme switchers, or `data-theme` attributes.
- Don't hard-code raw hex values in components (exceptions: `brand.ts`, `globals.css`, canvas palettes, PWA icon/offline assets).
- Don't reach for raw Tailwind palette colours for new UI; add or reuse a semantic token instead.
- Don't stack multiple `shadow-*` classes or colour-glow shadows.

---

## 7. Token → utility quick reference

| Need | Utility |
| :--- | :--- |
| Page canvas | `bg-background` |
| Card / modal | `bg-card` |
| Input / table header | `bg-surface` |
| Nested well | `bg-surface-muted` |
| Hover step | `hover:bg-surface-hover` |
| Headings/body | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Hairline | `border-border` |
| Primary action | `bg-primary text-primary-foreground hover:bg-primary-hover` |
| Mint CTA (marquee) | `bg-brand text-brand-foreground hover:bg-brand-accent` |
| Link / focus | `text-interactive`, `ring-ring` |
| Selected nav | `bg-sidebar-active text-sidebar-active-foreground` |
| Status washes | `bg-{success,warning,info,destructive}-soft` + `-soft-foreground` |

---

## 8. Verification

- `apps/web/test/api-contract.spec.ts` asserts the exact approved hexes, the derived shades and their WCAG ratios (mint < 3:1 on white; ink-on-mint, primary, interactive, statuses ≥ 4.5:1).
- `pnpm --filter @ogroniedu/web typecheck` / `lint` / `test` are part of the acceptance gate.
- See `docs/ui-refactor/DESIGN_SYSTEM_SPEC.md` for the full spec and `docs/ui-refactor/QA_RESULTS.md` for the latest verification log.

**Change control:** any change to approved hexes requires product-owner sign-off; any new token must be added to `globals.css` and documented here.
