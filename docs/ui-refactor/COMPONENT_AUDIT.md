# OgroniEdu — Component Audit & Design System Architecture

**Date:** 2026-10-17  
**Scope:** `src/components/ui/`, `src/components/shared/`, `src/components/shell/`, and domain feature components  
**Standard:** Radix UI Primitives + Customized shadcn/ui Design System (Tailwind CSS v4)

---

## 1. UI Primitives Audit (`src/components/ui/`)

| Component      | Current Implementation                                            | Flaws Identified                                                                                                                                    | Required Customization                                                                                                                                                                                                   |
| :------------- | :---------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Button`**   | CVA + Radix Slot + Lucide                                         | Outline variant has `bg-card/60 backdrop-blur-xs`, inconsistent radii (`rounded-xl` vs `rounded-full` in pages), lacks `secondary` neutral variant. | Add standard variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`, `link`. Normalize to `rounded-xl`. Ensure `asChild` composition is seamless.                                                           |
| **`Card`**     | Hard-coded `p-6`, `border-border`, `shadow-sm shadow-black/5`     | Padding baked directly into root `Card`, causing double-padding when combined with `CardHeader`/`CardContent`. Lacks flat/bordered/subtle variants. | Decouple root padding: let `CardHeader`, `CardContent`, and `CardFooter` govern padding. Add variants: `default` (subtle border, zero shadow), `elevated` (soft shadow for floating cards), `flat` (borderless surface). |
| **`Badge`**    | Custom variants with inline hex/opacity                           | `success` variant mapped to `bg-primary/12 text-primary` instead of semantic green. Multiple borders (`border-border/80`, `border-primary/25`).     | Standardize semantic variants: `default`, `primary`, `secondary`, `success`, `warning`, `destructive`, `info`, `outline`. Use clean semantic tokens with 4.5:1 text contrast.                                            |
| **`Input`**    | Monolithic wrapper (`div.w-full.space-y-1.5` + `label` + `error`) | Breaks composition when used with `FormField` (cloned `id` lands on outer `div` rather than `<input>`, breaking accessible label).                  | Expose clean, composable `<Input>` primitive (pure input element with focus ring). Maintain optional icon slots. Form validation and labels belong in `FormField`.                                                       |
| **`Select`**   | Radix Select primitive                                            | Viewport and item styles had heavy drop shadows and inconsistent border radii.                                                                      | Modernize Radix Select trigger and content with clean subtle border, smooth hover transitions, and accessible focus ring.                                                                                                |
| **`Dialog`**   | Radix Dialog                                                      | Overlay and content had heavy drop shadows, excessive padding on mobile viewports.                                                                  | Refine modal backdrop (`bg-foreground/20 backdrop-blur-xs`), card content radius (`rounded-2xl`), responsive max-width.                                                                                                  |
| **`Table`**    | Custom table primitives                                           | Border-heavy rows, low-contrast table header text, inflexible cell alignment.                                                                       | Minimal row separators (`border-b border-border/60`), muted uppercase header styling (`text-xs font-semibold text-muted-foreground`), clean hover state (`hover:bg-surface-hover/50`).                                   |
| **`Tabs`**     | Radix Tabs                                                        | Tab list wrapped in heavy border with inconsistent active pill styling.                                                                             | Clean segmented control and underline tab styles. Active item uses subtle elevation or clean brand accent.                                                                                                               |
| **`Avatar`**   | Radix Avatar                                                      | Ring colors inconsistent, initials text contrast varied between roles.                                                                              | Semantic role borders, consistent fallback typography, accessible contrast against white/surface.                                                                                                                        |
| **`Skeleton`** | Div with `animate-pulse`                                          | Color was too dark against light surfaces.                                                                                                          | Soft shimmer using `bg-muted/70` with smooth pulse.                                                                                                                                                                      |

---

## 2. Shared Domain Components Audit (`src/components/shared/`)

| Component           | Current Implementation                                        | Flaws Identified                                                            | Required Customization                                                                                                      |
| :------------------ | :------------------------------------------------------------ | :-------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **`FormField`**     | Clones `id`, `aria-invalid`, `aria-describedby` onto children | Assumes child is raw input; failed when child was wrapped in div.           | Fully support both pure inputs and wrapped components. Standardize label, required star, hint, and error message styling.   |
| **`PageHeader`**    | Simple flex header                                            | Lacks breadcrumb integration, inconsistent action button alignment.         | Standardize `title`, `description`, `breadcrumbs`, and `actions` slots with crisp typography hierarchy.                     |
| **`PageContainer`** | Simple `max-w-7xl` wrapper                                    | Padding was inconsistent between dashboard and public pages.                | Consistent horizontal padding (`px-4 sm:px-6 lg:px-8`) and vertical spacing (`py-6 sm:py-8`).                               |
| **`StatCard`**      | Simple card wrapper                                           | Underused; pages created bespoke `HeroKpiCard` with dark gradients instead. | Upgrade to a versatile, high-polish KPI card supporting title, value, change indicator, icon, and optional sparkline/trend. |
| **`StatusBadge`**   | Tone-to-class mapping                                         | `success` mapped to `primary`, `violet` mapped to `interactive`.            | Map directly to standardized `Badge` semantic variants (`success`, `warning`, `destructive`, `info`, `neutral`).            |
| **`DataTable`**     | Generic table wrapper                                         | Lacks empty state, pagination integration, and loading skeletons.           | Complete data table with built-in empty state, sorting, search filter bar, and pagination.                                  |
| **`EmptyState`**    | Icon + title + message + action                               | Heavy borders around container.                                             | Clean borderless or subtle well layout with friendly icon and primary action button.                                        |
| **`LoadingState`**  | Spinner in div                                                | Generic uncentered layout.                                                  | Standardized centered skeleton / spinner layout.                                                                            |
| **`ConfirmDialog`** | AlertDialog wrapper                                           | Destructive action button lacked clear visual priority.                     | High-clarity confirmation dialog with proper destructive vs cancel button hierarchy.                                        |

---

## 3. Shell & Navigation Components Audit (`src/components/shell/` & `src/layouts/`)

| Component                | Current Implementation              | Flaws Identified                                                                                                   | Required Customization                                                                                                                 |
| :----------------------- | :---------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **`Navbar`**             | Public sticky header                | Pill nav links used disparate font weights, mobile drawer lacked smooth transition.                                | Clean sticky header with subtle border (`border-b border-border/80`), elegant nav links with active indicator, accessible mobile menu. |
| **`Footer`**             | Multi-column marketing footer       | Over-bordered system status pill, crowded link columns on tablet.                                                  | Balanced typography, organized columns, clean social links, clear copyright and trust seals.                                           |
| **`DashboardSidebar`**   | Desktop navigation sidebar          | Oversized promotional card taking up vertical space, nested borders in user profile card, inner shadows on badges. | Slim, elegant sidebar. Crisp active indicator (subtle brand accent pill, no heavy borders). Clean user menu item.                      |
| **`DashboardTopbar`**    | Sticky top navigation               | Global search input has heavy border, SOS button has harsh red background, language switcher has drop shadow.      | Clean topbar: minimal search bar with keyboard shortcut pill (`⌘K`), refined SOS button, clean language switch.                        |
| **`DashboardMobileNav`** | Sheet / mobile drawer               | Cramped navigation items, awkward close button position.                                                           | Refined sheet with proper touch targets and smooth slide-in animation.                                                                 |
| **`BottomNavbar`**       | Mobile bottom nav for small screens | Cluttered icon labels, conflicting elevation.                                                                      | Modern, floating or docked bottom nav with clear active state and haptic-feel micro-interactions.                                      |

---

## Continuation Component Changes — 2026-10-18 (rendered-UI correction)

| Component / File                                                               | Change delivered                                                                                                                                                        |
| :----------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/Card.tsx`                                                   | Radius `rounded-2xl`; border + whitespace define surfaces; no default elevation.                                                                                        |
| `src/components/ui/Button.tsx`                                                 | Removed colored shadows; primary uses deep teal, brand variant uses `bg-brand text-brand-foreground hover:bg-brand-accent`; `asChild` kept via `<Slottable>` + regression test. |
| `src/components/ui/Badge.tsx`                                                  | Borderless soft-fill variants (`success-soft`/`warning-soft`/`info-soft`/`destructive-soft` trios); pill radius; no borders.                                            |
| `src/components/ui/Input.tsx`, `textarea.tsx`, `select.tsx`                    | `h-10`, `rounded-xl`, `ring-ring/35`, single border weight.                                                                                                             |
| `src/features/dashboard/components/HeroKpiCard.tsx`                            | Neutral icon tile; plain trend pill (no mint repetition per card).                                                                                                      |
| `src/features/dashboard/components/WeeklyActivityChart.tsx`                    | Hatched bars → soft neutral pills + one solid primary bar; container `rounded-2xl border-border`, no shadow.                                                            |
| `src/features/dashboard/components/SidebarPromoCard.tsx`                       | Promo calmed to system surfaces.                                                                                                                                        |
| `src/components/notifications/NotificationToast.tsx`                           | Category accents → coherent soft trios.                                                                                                                                 |
| `src/features/admin/components/tabs/adminAuditLogsTab.tsx`                     | Rewritten: real `formatDateTime(createdAt, locale)` timestamps, single-surface table, left alignment, un-nested container; caller passes `locale`.                        |
| `src/features/admin/pages/admin-users-hub-page.tsx`, `admin-settings-hub-page.tsx` | Rainbow tiles/chips → neutral-first with single functional accent; borderless badges; `hover:border-input hover:shadow-xs`.                                            |
| `src/layouts/RoleLayout.tsx`, `src/layouts/admin/AdminLayout.tsx`              | `title` made optional (dedup fix); 18 admin pages stop rendering a second heading.                                                                                      |
| `src/features/profile/pages/profile-page.tsx`                                  | Chip tokens normalized; lock icons → `text-warning`; star ratings → `text-star`.                                                                                        |
| `src/features/tutors/pages/tutor-earnings-page.tsx`                            | Payout selector coherent (bKash pink kept; Nagad → warning-soft; Bank → info-soft); escrow pill → primary-soft; CTA `bg-brand text-brand-foreground`.                   |
| `src/app/globals.css`                                                          | Added `--star: #d97706` (root + `@theme`); token source of truth for all above.                                                                                          |
| `src/features/auth/components/LoginForm.tsx`                                   | Shadow removed; shared `Input` (already migrated).                                                                                                                       |
| `apps/api/src/modules/admin/utils/redact.util.ts`                              | **Backend:** preserve `Date`/`Map`/`Set`/`RegExp` in `redactSensitiveData` (timestamps were flattened to `{}`).                                                         |

---

## Continuation Component Changes — 2026-10-18 (feature-completion pass)

| Component / File | Change delivered |
| :--- | :--- |
| `src/components/ui/NativeSelect.tsx` | **New shared component.** The single home for styled native `<select>` (h-10, `rounded-xl`, chevron wrapper, standard focus ring, `forwardRef`). Keeps native `<option>` semantics for autofill + Playwright `selectOption`. Exported from the `components/ui` barrel. |
| `features/bookings/components/sessions/scheduleModal.tsx` | Booking picker → `NativeSelect`. |
| `features/payments/pages/payments-page.tsx` | Booking + provider selects → `NativeSelect`. |
| `features/admin/pages/settings/admin-settings-notifications-page.tsx` | SMS/email provider selects → `NativeSelect`; the two raw inputs → shared `Input`. |
| `features/tutors/pages/tutor-details-page.tsx` | Student + subject selects → `NativeSelect`. |
| `features/tutors/components/verificationLevelCard.tsx`, `qualificationUploadCard.tsx` | Document-type selects → `NativeSelect`. |
| `features/trust/components/safetyReportModal.tsx`, `tutorReplacementModal.tsx` | Category / reason-code selects → `NativeSelect`. |
| `features/learning/pages/learning-page.tsx` | Booking picker → `NativeSelect` (`wrapperClassName="w-auto"`); leftover `shadow-sm` removed. |
| `features/admin/components/tabs/adminVerificationTab.tsx` | Status/level/assignment filters + decision-level/decision selects → `NativeSelect`; decision options localized via `DECISION_LABELS` (bn/en), including `reinstated`. |
| 40 files (sweep) | `shadow-sm`/`shadow-md` removed from card surfaces, segmented tools, avatars, banners; `hover:shadow-sm` → `hover:shadow-xs`; whiteboard/formula drawer active tools flattened. |
| `src/components/brand/OgroniEduBrand.tsx` | Colored logo shadow + hover shadow removed; keeps ring + gradient. |
| `src/components/shell/BottomNavbar.tsx` | Notification badge glow removed; label no longer artificially truncated (`max-w-[54px]` → `max-w-full`). |
| `src/components/notifications/NotificationBell.tsx` / `NotificationCenter.tsx` | Slop `shadow-md shadow-sm` / `shadow-xs shadow-sm` pairs cleaned. |
| `src/features/admin/components/adminMetricsGrid.tsx`, `admin-overview-page.tsx` | English captions → `t('caption…')` (bn+en messages updated). |
| `apps/web/test/progress-tracking.spec.ts` | **New:** real render tests for `ProgressGaugeCard`, `WeeklyActivityChart`, `StudyTimeTrackerCard`. |
| `apps/web/test/notification-bell.spec.ts` | **Rewritten:** renders the real `NotificationBell` (provider mocked) instead of a local copy of `formatCount`. |
| `apps/web/test/guardian-children.spec.ts` | Contract-import tests given 15 s timeouts (cold-import flake). |
| `apps/api/test/bkash.adapter.spec.ts` | **New:** bKash sandbox checkout/signature/IPN/query/refund coverage. |
| `apps/api/test/taxonomy.controller.spec.ts` | **New:** public taxonomy reads + admin CRUD (409/404/soft-delete/defaults). |
| `apps/api/test/payments.service.spec.ts` | **Extended:** Sandbox Confirmation Pipeline (verify-through-webhook, idempotent short-circuit, provider fallback). |
| `apps/web/e2e/journey.booking.spec.ts` | Radix level/subject pickers now genuinely exercised (replaces the no-op `selectOption` on a button trigger). |
