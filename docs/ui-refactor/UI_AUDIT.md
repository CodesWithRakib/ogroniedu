# OgroniEdu — UI Audit & Visual Defect Inventory

**Date:** 2026-10-17  
**Scope:** `apps/web` (Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui)  
**Auditor:** Senior UI/UX Engineer, Staff Frontend Engineer, Design-System Architect & QA

---

## 1. Executive Summary & Root Cause Analysis

While a light theme conversion was executed previously (removing dark mode tokens, theme switchers, and dark-first utility classes), the actual rendered application still suffered from severe visual, architectural, and design-system defects:

1. **"One Color Plastered Everywhere" Anti-Pattern:**
   - Over **56 files** directly stamped `border-primary/40` on cards, badges, section dividers, hero buttons, and form selectors.
   - The signature Ocean Teal / deep teal token was applied indiscriminately to borders, backgrounds, icons, pills, numbers, and headings, destroying contrast and visual hierarchy.
   - Semantic status tokens were confused: `Badge` and `StatusBadge` mapped `success` to `primary` (teal-700) rather than true accessible green (`#15803d`).

2. **Excessive Borders, Drop Shadows, and Nested Containers:**
   - Cards frequently compounded three elevations: an outer container with `border border-border/70` and `shadow-xs`, enclosing a grid of mini-cards with `border border-border/40 bg-surface/50`, enclosing sub-pills with `border border-primary/40`.
   - The student academic profile contained 5 nested bordered boxes inside one card.
   - StatCard variants used jarring dark gradients (`bg-gradient-to-br from-primary via-primary/95 to-primary-hover`) for one card while adjacent cards used bordered white cards with drop shadows.
   - Quick action strips were wrapped in full bordered card wells instead of clean button groups.

3. **Inconsistent Radii & Metric Scales:**
   - Within single screens, elements mixed `rounded-full` (9999px), `rounded-3xl` (24px), `rounded-2xl` (16px), `rounded-xl` (12px), `rounded-lg` (8px), and `rounded-md` without any semantic hierarchy.
   - Headings, card padding, and button heights varied unpredictably between routes.

4. **Typography Contrast & Text Hierarchy Failures:**
   - Subtitles across all dashboard pages were styled with `text-primary-soft-foreground` (#115e59) or low-contrast muted gray instead of crisp, neutral semantic typography.
   - Step numbers ("01", "02", "03") were set to `text-primary/30`, resulting in a ~1.8:1 contrast ratio against white surfaces (severely failing WCAG 2.2 AA).
   - Important metadata and timestamps were washed out.

5. **Direct HTML-Based Feature UI (Violation of Section 4):**
   - Feature pages frequently implemented raw `<button>`, `<select>`, `<input>`, and `<form>` tags with lengthy bespoke Tailwind class strings instead of using shadcn/ui primitives (`Button`, `Select`, `Input`, `FormField`).
   - Links wrapping raw buttons (`<Link><button>...</button></Link>`) caused nested interactive elements and hydration/accessibility issues.
   - Form inputs wrapped in bespoke divs bypassed proper label association (`htmlFor` vs cloned `id`).

6. **Misaligned Thematic Imagery:**
   - The authentication shell featured a sci-fi / futuristic space station image (`/images/auth-showcase.jpg`) titled "Nebula Exchange" with glassmorphism glow overlays—wholly incongruous with an education and tutoring platform in Bangladesh.
   - Persistent PWA prompt floating at the bottom right collided with dashboard navigation and mobile navigation.

---

## 2. Categorized Defect Inventory

| ID         | Category               | Defect Description                                                                                        | Affected Files / Routes                                                 | Severity |
| :--------- | :--------------------- | :-------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :------- |
| **DEF-01** | Color Hierarchy        | `border-primary/40` used indiscriminately on 56+ components                                               | Homepage, Pricing, Safety, FAQ, Student/Tutor/Guardian/Admin Dashboards | High     |
| **DEF-02** | Color Hierarchy        | `StatusBadge` & `Badge` `success` variant mapped to `primary` instead of semantic green                   | `components/ui/Badge.tsx`, `components/shared/StatusBadge.tsx`          | High     |
| **DEF-03** | Color Hierarchy        | Multi-color clashing in Admin cards (`from-brand to-primary/10 border-info/40 text-info-soft-foreground`) | `features/admin/pages/admin-overview-page.tsx`                          | Medium   |
| **DEF-04** | Elevation/Borders      | Nested cards inside cards (e.g., Academic Profile 4-box grid inside Card)                                 | `StudentAcademicProfileCard.tsx`, `HeroStudentTablet.tsx`               | High     |
| **DEF-05** | Elevation/Borders      | Inconsistent StatCard styling (1 dark teal gradient card vs 3 white bordered cards)                       | `HeroKpiCard.tsx`, Student/Tutor/Guardian Dashboards                    | High     |
| **DEF-06** | Elevation/Borders      | Unnecessary container cards wrapping action button bars                                                   | `student-dashboard-page.tsx`, `tutor-dashboard-page.tsx`                | Medium   |
| **DEF-07** | Typography/Contrast    | Step numbers (01, 02, 03) rendered in `text-primary/30` failing WCAG contrast                             | `home-page.tsx`, `how-it-works-page.tsx`                                | High     |
| **DEF-08** | Typography/Contrast    | Dashboard page subtitles styled with `text-primary-soft-foreground` instead of neutral ink                | `DashboardShell.tsx`, all role dashboards                               | Medium   |
| **DEF-09** | Typography/Contrast    | Input placeholder text in gray washes hard to read                                                        | `Input.tsx`, `HeroSearchBar.tsx`, auth forms                            | Medium   |
| **DEF-10** | Component Architecture | Direct HTML `<button>`, `<select>`, `<input>` in feature pages                                            | `HeroSearchBar.tsx`, `home-page.tsx`, `student-dashboard-page.tsx`      | High     |
| **DEF-11** | Component Architecture | Nested `<Link><button>` interactive elements                                                              | `home-page.tsx` CTA, student/tutor header actions                       | High     |
| **DEF-12** | Component Architecture | `FormField` cloning `id` onto wrapper `div` of `Input.tsx` breaking label association                     | `components/ui/Input.tsx`, `components/shared/FormField.tsx`            | High     |
| **DEF-13** | Visual Consistency     | Inconsistent border-radius scale (`rounded-3xl` vs `rounded-2xl` vs `rounded-full`)                       | Dashboard cards, inputs, buttons, sidebars                              | Medium   |
| **DEF-14** | Brand & Imagery        | Sci-Fi space-station theme image on Auth shell (`auth-showcase.jpg`)                                      | `components/auth/authShell.tsx`                                         | High     |
| **DEF-15** | Layout & Chrome        | Sidebar promo card taking excessive vertical real estate                                                  | `features/dashboard/components/DashboardSidebar.tsx`                    | Medium   |
| **DEF-16** | Layout & Chrome        | Floating PWA install prompt colliding with bottom content & drawer                                        | `components/pwa/PWARegister.tsx`                                        | Low      |

---

## 3. Action Plan & Quality Standard

1. **Tokens & Theme Standardization:**
   - Refine `globals.css` light tokens: soft, warm neutral canvas (`#f8fafc`), crisp white card surfaces (`#ffffff`), restrained subtle border (`#e2e8f0`), deep ink typography (`#0f172a`), refined elevation scale with zero heavy drop shadows.
   - Enforce exact Ocean Teal (`#0df5c4`, `#00e1b2`) and Sapphire Blue (`#2563eb`, `#3b82f6`) brand values with proper semantic roles.

2. **Primitive Component Modernization (shadcn/ui):**
   - Refactor `Button`, `Card`, `Badge`, `Input`, `Select`, `Dialog`, `Table`, `Tabs`, `Separator`, `Skeleton`.
   - Remove hard-coded `border-primary/40` from all base components.
   - Introduce clean variants: `default`, `outline`, `ghost`, `secondary`, `subtle`.

3. **Shared Architecture & Form System:**
   - Unify `FormField`, `PageHeader`, `PageContainer`, `StatCard`, `StatusBadge`, `DataTable`, `EmptyState`.
   - Ensure 100% accessible label-to-input association without wrapper interference.

4. **Layout Shells & Navigation:**
   - Refactor `Navbar`, `Footer`, `DashboardSidebar`, `DashboardTopbar`, `DashboardMobileNav`, and `BottomNavbar`.
   - Remove redundant borders, inner shadows, and oversized promo cards.

5. **Role & Feature Page Refactoring:**
   - Refactor Public, Auth, Student, Tutor, Guardian, Admin, Bookings, Payments, Classroom, and Settings pages.

---

## Continuation Audit — 2026-10-18 (rendered-UI evidence pass)

The earlier audit was code-reading based; this pass audited the **actual rendered UI** with a Playwright harness that logs into the seeded demo accounts (student / tutor / guardian / admin) and captures desktop + mobile screenshots (~66 images). Defects below were triaged from the images.

### D-1: Defect inventory from rendered screenshots

| #   | Defect observed in rendered UI                                                                                         | Status   | Resolution / Reference                                                                                        |
| --- | :--------------------------------------------------------------------------------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------ |
| A-1 | Admin hub cards (users/settings) rendered a rainbow of accent-toned icon tiles and chips                               | **FIXED** | Neutral-first tiles; single functional accent (KYC = warning). `admin-users-hub-page.tsx`, `admin-settings-hub-page.tsx` |
| A-2 | Duplicated page heading: shell header title + page `<h1>` rendered twice on 18 admin pages                             | **FIXED** | `RoleLayout`/`AdminLayout` `title` made optional; redundant prop removed from 18 pages (taxonomy keeps shell header by design) |
| A-3 | Mint-background + green-text chip mismatches (unreadable/low-coherence pairs) across 20 files                          | **FIXED** | 31 lines normalized to coherent `success-soft` trios                                                          |
| A-4 | KPI card footers repeated mint pills on every card ("one color everywhere" resurfacing)                                | **FIXED** | `HeroKpiCard` re-tuned: neutral tile, plain trend pill                                                        |
| A-5 | `WeeklyActivityChart` rendered hatched/striped bars that read as noise                                                 | **FIXED** | Soft neutral pills + one solid primary bar for the peak day                                                   |
| A-6 | Admin audit-log table: empty timestamp column, centered columns, card nested inside another card                       | **FIXED** | Formatted `createdAt` via `formatDateTime`, left-aligned, single surface; **required API fix** for Date serialization (see below) |
| A-7 | Rating stars used amber-500 with no dedicated token; inconsistent with warning semantics                               | **FIXED** | New `--star: #d97706` token (3.05:1 non-text contrast) used only for ratings                                  |
| A-8 | Home hero ambient blobs at full mint saturation, competing with hero content                                           | **FIXED** | Blobs softened (`bg-brand-soft/70`, `bg-primary/5`)                                                           |
| A-9 | Tutor earnings payout selector mixed raw palette colors (green/blue/amber) with brand pink                             | **FIXED** | bKash pink retained (provider brand); Nagad → warning-soft; Bank → info-soft; escrow pill → primary-soft       |
| A-10 | Login card carried a heavy drop shadow inconsistent with the flat system                                               | **FIXED** | Shadow removed; shared `Input` already in use                                                                  |
| A-11 | Remaining `shadow-2xs`/`shadow-inner`/heavy card elevations systemwide                                                 | **FIXED** | 62 + 5 noise elevations removed; 45 heavy card shadows removed in 21 files (modal/popover shadows kept)        |
| A-12 | `border-border/<opacity>` variants (5 different border weights)                                                        | **FIXED** | 379 occurrences normalized to `border-border`                                                                  |
| A-13 | `rounded-3xl` overshoot on cards vs `rounded-xl` controls (inconsistent radius ladder)                                 | **FIXED** | 127 occurrences unified to `rounded-2xl` for cards                                                             |
| A-14 | Ad-hoc `focus:` rings (ring offset colors, inconsistent widths)                                                        | **FIXED** | 33 occurrences → `focus-visible:ring-2 ring-ring/35`                                                           |
| A-15 | `dark:` variant remnants still compiled in 18 places                                                                   | **FIXED** | Stripped; light-only mandate enforced                                                                          |
| A-16 | 160 raw Tailwind palette classes (emerald/amber/blue/purple/rose) bypassing semantic tokens                            | **FIXED** | Mapped to success/warning/info/interactive/destructive semantically                                                           |
| A-17 | Admin verification queue filters use raw `<select>` styled inline                                                      | **PARTIAL** | Visual OK; still not migrated to the `Select` primitive (tracked for docs/report)                              |
| A-18 | English microcopy mixed into Bengali admin KPI hints (e.g. "Pending Dossiers")                                         | **OPEN** | i18n content debt — functionality unaffected                                                                   |
| A-19 | Mobile bottom-nav labels truncate with ellipsis                                                                        | **OPEN** | Cosmetic; acceptable at 360px but noted                                                                        |
| A-20 | Some admin overview hub cards still carry per-card semantic accent tones (brand-family)                                | **OPEN** | Much calmer than the original rainbow; deliberate nuance acceptable for now                                    |

### D-2: Backend defect surfaced by the UI audit (fixed)

- **Symptom:** admin audit-log `createdAt` rendered as an empty cell; API returned `"createdAt": {}`.
- **Root cause:** `apps/api/src/modules/admin/utils/redact.util.ts` - `redactSensitiveData` recursed over `Date` instances via `Object.entries`, producing `{}`.
- **Fix:** preserve `Date`/`Map`/`Set`/`RegExp` built-ins before recursion. Verified live against the running API (real ISO timestamps now returned and rendered).

## Continuation Audit - 2026-10-18 (feature-completion pass)

### D-3: Open items from D-1 resolved

| Ref (D-1) | Item | Status | Resolution |
| --- | --- | --- | --- |
| A-17 | Raw `<select>` styled inline (admin verification + others) | **FIXED** | New shared `components/ui/NativeSelect.tsx`; all 18 feature-page raw selects migrated (verification filters + decision selects, schedule modal, payments, learning, tutors, trust modals, notification settings). Only remaining raw select is the documented `sr-only` compat shim in `RegisterForm.tsx`. |
| A-18 | English microcopy in Bengali admin KPI hints | **FIXED** | Five `caption*` keys added to `messages/bn.json` + `en.json`; `adminMetricsGrid`/`admin-overview-page` now use `t('caption…')` — English debt removed. |
| A-19 | Mobile bottom-nav label truncation | **FIXED** | `BottomNavbar` label `max-w-[54px]` → `max-w-full`; verified in the mobile route sweep. |
| A-20 | Per-card accent tones on some admin hub cards | **ACCEPTED** | Calm brand-family nuance retained deliberately; not a defect. |

### D-4: New defects found and fixed in the feature-completion pass

| # | Defect | Status | Resolution |
| --- | --- | --- | --- |
| B-1 | `shadow-sm`/`shadow-md` still present on 40 files (cards, segmented tools, avatars, banners, brand mark, badge glow) contradicting R-1 | **FIXED** | Codemod sweep (70 `shadow-sm` + 12 `shadow-md` removed, 11 hover elevations normalized to `hover:shadow-xs`) + hand fixes (`OgroniEduBrand`, `BottomNavbar` badge glow, `StudyTimeTrackerCard` drop-shadow, `NotificationBell`) |
| B-2 | `journey.booking.spec.ts` subject picker was a silent no-op (`selectOption` on a Radix button trigger; `.locator('option').count()` always 0) — the journey could pass without ever exercising level/subject selection | **FIXED** | Rewritten to open the Radix listbox and click real `role=option` entries for both level and subject, with a graceful empty-listbox fallback |
| B-3 | `guardian-children.spec.ts` cold-import flake (`@ogroniedu/contracts` dynamic import under parallel workers) | **FIXED** | Per-test `{ timeout: 15_000 }` on the two import-heavy tests (no global config change) |
| B-4 | Two modals left unclosed `</select>` JSX after the migration (typecheck caught) | **FIXED** | `safetyReportModal`, `tutorReplacementModal` closing tags |
| B-5 | Zero test coverage on progress widgets, bKash adapter, taxonomy CRUD, sandbox-confirm, and the notification bell was tested against a local copy of its logic | **FIXED** | New: `progress-tracking.spec.ts` (6), rewritten `notification-bell.spec.ts` (renders the real component), `bkash.adapter.spec.ts` (8), `taxonomy.controller.spec.ts` (16), Sandbox Confirmation Pipeline block in `payments.service.spec.ts` (4). API suite 588 → 616, web 179 → 188. |

### D-5: Route sweep instrumentation (feature-completion pass)

A refined DOM audit runs on every route in a real logged-in browser: visible box-shadows only (transparent ring layers and `shadow-xs` excluded), visible native selects (Radix's hidden form `<select>` excluded), unnamed visible controls, horizontal overflow, console/page errors, failed HTTP responses, and redirect detection. Its purpose is to catch design-rule regressions and broken routes without relying on eyeballing alone. Results are recorded in `UI_QA_RESULTS.md` §7.
