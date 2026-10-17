# Component Catalog — UI/UX Refactor

**Date:** 2026-10-17 · **Barrel:** `components/ui/index.ts` re-exports the primitives (+ shadcn subset).
**Adoption:** all components below consume the `globals.css` token system; hardcoded colours are defects except the documented exceptions in `DESIGN_SYSTEM_SPEC.md` §8.

## 1. Core primitives (`components/ui`)

| Component                                                                                                     | Variants / API                                                                                                                                       | Key tokens                                                        |
| :------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `Button`                                                                                                      | `variant`: primary, default(=primary), secondary, outline, ghost, destructive, link · `size`: xs, sm, md, default, lg, icon · `asChild`, `isLoading` | teal-700 fill/white ink; sapphire ring; `rounded-xl`; `shadow-sm` |
| `Badge`                                                                                                       | success, warning, info, destructive, brand, neutral (+soft pairs)                                                                                    | `-soft` bg + `-soft-foreground` ink                               |
| `Card` (+`CardTitle`,`CardDescription`,`CardContent`,`CardHeader`)                                            | composition                                                                                                                                          | `bg-card`, border, `shadow-card`                                  |
| `Input` / `Textarea`                                                                                          | label, `errorMessage`, `aria-invalid`                                                                                                                | `bg-surface`, `--input` outline, destructive error text           |
| `Checkbox` / `Switch` / `Slider` / `Label` / `Progress`                                                       | Radix-based                                                                                                                                          | primary/brand accents, sapphire focus                             |
| `Select` / `DropdownMenu` / `Popover` / `Tooltip` / `Sheet` / `Dialog` / `AlertDialog` / `Accordion` / `Tabs` | Radix-based, `asChild` on triggers                                                                                                                   | `bg-popover`, `shadow-popover`, `border-border`                   |
| `Avatar` / `Separator` / `ScrollArea` / `Skeleton`                                                            | layout atoms                                                                                                                                         | muted/surface tokens                                              |
| `Table`                                                                                                       | data table primitives                                                                                                                                | `bg-surface` header, `border-border`                              |
| `EmptyState`                                                                                                  | icon + title + description + action                                                                                                                  | muted text + primary CTA                                          |
| `LoadingSpinner`                                                                                              | inline/page modes                                                                                                                                    | primary/brand accents                                             |
| `sonner` (`Toaster`)                                                                                          | forced light, no `next-themes`                                                                                                                       | card/border/foreground tokens                                     |

## 2. Shell & navigation

| Component                                                                        | Purpose           | Notes                                                                                |
| :------------------------------------------------------------------------------- | :---------------- | :----------------------------------------------------------------------------------- |
| `Navbar`                                                                         | public top nav    | bilingual switcher, auth CTAs, mobile drawer; `Button asChild`→Link uses `Slottable` |
| `Footer`                                                                         | public footer     | link list, legal                                                                     |
| `BottomNavbar`                                                                   | mobile bottom nav | mint FAB with brand-foreground ink ring                                              |
| `authShell`                                                                      | auth page frame   | light gradient backdrop + white card                                                 |
| `DashboardShell` / `DashboardSidebar` / `DashboardTopbar` / `DashboardMobileNav` | dashboard chrome  | sidebar tokens (`--sidebar-active` mint wash marks selection)                        |

## 3. Shared building blocks

| Component                                                                                                                                      | Purpose                                                         |
| :--------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `PageContainer` / `PageHeader`                                                                                                                 | consistent page frame & heading                                 |
| `StatCard` / `HeroKpiCard` / `ProgressGaugeCard` / `WeeklyActivityChart` / `SessionReminderCard` / `StudyTimeTrackerCard` / `SidebarPromoCard` | dashboard widgets (tokens only; tracker play button hand-fixed) |
| `DataTable` / `TablePagination` / `SearchInput` / `FilterChips` / `FilterToolbar`                                                              | list tooling                                                    |
| `FormField`                                                                                                                                    | RHF+zod field wrapper with error display                        |
| `LoadingState` / `ErrorState` / `ConfirmDialog` / `StatusBadge`                                                                                | state & feedback primitives                                     |

## 4. Auth & guards

| Component                                        | Purpose                                       |
| :----------------------------------------------- | :-------------------------------------------- |
| `AuthBootstrap`                                  | hydrates session from storage                 |
| `LoginForm` / `RegisterForm`                     | RHF+Zod forms → API                           |
| `RequireAuth` / `RequireRole` / `OnboardingGate` | client-side gating (no middleware in the app) |

## 5. Notifications

`NotificationBell`, `NotificationCenter`, `NotificationPreferencesView`, `NotificationProvider`, `NotificationToast` — token-based status accents, light surfaces.

## 6. Feature components (`features/**`, 105 files)

Organised by domain: `bookings`, `classroom` (whiteboard canvas = intentional literal colours), `learning`, `messaging`, `payments` (bKash/Nagad brand colours intentional), `tutor-discovery`, `tutors`, `trust` (canonical; `components/trust` duplicate is debt), `analytics` (explicit empty state, no fabricated data), `onboarding`, `profile`, `student`, `guardian`, `dashboard`, `auth`, `notifications`.

## 7. Usage rules

1. Never inline hex/palette colours — use tokens (§`DESIGN_SYSTEM_SPEC.md`).
2. Mint = fills/indicators only; primary actions use `--primary`; links/focus use sapphire.
3. Status colour comes from `Badge` soft pairs or `-soft` tokens, never raw palette classes.
4. New primitives must expose variants through `cva`, set `displayName`, forward refs (Radix pattern), and focus states via `ring-ring`.
