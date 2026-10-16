# OgroniEdu Design System & UI Guidelines

**Version:** 1.0.0  
**Target:** Monorepo Web Application (`apps/web`)  
**Standard:** WCAG 2.1 AA Compliance, Mobile-First Responsive, Bilingual (Bengali & English)

---

## 1. Design Philosophy

OgroniEdu is engineered specifically for the educational ecosystem of Bangladesh. The design system emphasizes:

1. **Clarity & Trust:** Dignified forest emerald palette reflecting Bangladesh's educational heritage and safety.
2. **Native Bilingual Experience:** Full typographic parity between Bengali (`bn`) and English (`en`) across every screen.
3. **Low-Bandwidth Mobile Optimization:** High-contrast, lightweight SVG icons, zero layout shifts, and touch-target minimums (44x44px).
4. **Accessible Semantics:** Strict ARIA states (`aria-busy`, `aria-invalid`, `aria-live`, `aria-selected`), focus rings, and screen-reader support.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token Name             | Light Theme                  | Dark Theme                  | Purpose / Usage                                     |
| :--------------------- | :--------------------------- | :-------------------------- | :-------------------------------------------------- |
| `--primary`            | `#0d5c46` (Deep Forest Teal) | `#10b981` (Vibrant Emerald) | Primary brand actions, key buttons, verified badges |
| `--primary-hover`      | `#094434`                    | `#059669`                   | Interactive hover & active state                    |
| `--secondary`          | `#f1f5f9` (Slate 100)        | `#1f2937` (Slate 800)       | Secondary button backgrounds, filter tags           |
| `--accent`             | `#d97706` (Warm Amber)       | `#f59e0b` (Bright Amber)    | Highlighting admission deadlines, urgent badges     |
| `--background`         | `#f8fafc` (Slate 50)         | `#090d16` (Deep Navy Black) | Page backdrop                                       |
| `--card` / `--surface` | `#ffffff` (Pure White)       | `#111827` (Slate 900)       | Content card backgrounds, modals                    |
| `--border`             | `#e2e8f0` (Slate 200)        | `#1f2937` (Slate 800)       | Card dividers, input borders                        |
| `--text-primary`       | `#0f172a` (Slate 900)        | `#f8fafc` (Slate 50)        | High-contrast headings and body copy                |
| `--text-secondary`     | `#64748b` (Slate 500)        | `#94a3b8` (Slate 400)       | Secondary captions, timestamps                      |
| `--destructive`        | `#dc2626` (Red 600)          | `#ef4444` (Red 500)         | Error alerts, destructive actions                   |
| `--success`            | `#16a34a` (Green 600)        | `#22c55e` (Green 500)       | Verified checkmarks, payment confirmations          |

### 2.2 Typography Scale

- **Bengali Primary Font:** `'Hind Siliguri'`, `'Noto Sans Bengali'`, system-ui, sans-serif
- **English Primary Font:** `'Inter'`, system-ui, sans-serif

| Style          | Desktop Size / Leading | Mobile Size / Leading | Weight         | Usage                           |
| :------------- | :--------------------- | :-------------------- | :------------- | :------------------------------ |
| **H1 Hero**    | 48px / 1.15            | 32px / 1.25           | Bold / 800     | Landing hero title              |
| **H2 Section** | 30px / 1.25            | 24px / 1.3            | SemiBold / 700 | Section titles                  |
| **H3 Card**    | 20px / 1.4             | 18px / 1.4            | SemiBold / 600 | Card and modal headers          |
| **Body Large** | 16px / 1.6             | 15px / 1.5            | Regular / 400  | Subtitles, intro text           |
| **Body Base**  | 14px / 1.5             | 14px / 1.5            | Regular / 400  | Default body text               |
| **Caption**    | 12px / 1.4             | 12px / 1.4            | Medium / 500   | Badges, timestamps, helper text |

---

## 3. Component Library Reference

All components are located in [`apps/web/src/components/ui/`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/ui/):

### 3.1 Button (`<Button />`)

- **Variants:** `primary`, `secondary`, `outline`, `ghost`, `destructive`
- **Sizes:** `sm`, `md`, `lg`
- **Props:** `isLoading?: boolean`, standard HTML button attributes
- **Accessibility:** Automatically applies `aria-busy="true"` and `disabled` when loading.

### 3.2 Card (`<Card />`)

- **Structure:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Styling:** Subtle border, rounded-2xl (16px), soft shadow for clean separation.

### 3.3 Input (`<Input />`)

- **Props:** `label?: string`, `helperText?: string`, `errorMessage?: string`, `leadingIcon?: ReactNode`
- **Accessibility:** Uses React `useId()` to dynamically bind `aria-describedby` and `aria-invalid` to the error element.

### 3.4 Badge (`<Badge />`)

- **Variants:** `default`, `success`, `warning`, `destructive`, `info`, `outline`
- **Usage:** Verification status, role indicator, unread counts.

### 3.5 Tabs (`<Tabs />`)

- **Structure:** `Tabs`, `TabList`, `TabTrigger`, `TabContent`
- **Accessibility:** Implements `role="tablist"`, `role="tab"`, `aria-selected`, and `role="tabpanel"`.

### 3.6 EmptyState (`<EmptyState />`)

- **Structure:** Centered icon, title, description, optional action CTA button.
- **Accessibility:** Renders `role="status"` for screen-reader awareness.

---

## 4. Bilingual Localization Architecture

1. **Zero Hardcoded Strings:** User-facing strings must never be hardcoded into JSX templates.
2. **Dictionary Catalogs:**
   - [`apps/web/messages/bn.json`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/messages/bn.json) — Canonical Bengali strings.
   - [`apps/web/messages/en.json`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/messages/en.json) — English translations.
3. **Parity Enforcement:** Automated test in [`apps/web/test/i18n.spec.ts`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/test/i18n.spec.ts) traverses all nested keys and fails if any key is missing in either language.
4. **Number Localization:** Use `formatLocalizedNumber(num, locale)` to convert numbers into localized Bengali digits (`১২৩৪৫`) when viewing in Bengali.
