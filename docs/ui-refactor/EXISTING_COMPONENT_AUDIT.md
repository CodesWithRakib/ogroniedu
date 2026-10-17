# Existing Component Audit — UI/UX Refactor

**Date:** 2026-10-17
**Scope:** every `.tsx` under `apps/web/src` (73 route files, 79 `components/**` files, 105 `features/**` files).

## 1. Inventory by area

| Area                                                                        | Files | Owns                                                                                                                                                                                                                                                                             | Refactor status                                                          |
| :-------------------------------------------------------------------------- | ----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| `components/ui`                                                             |    28 | Primitives: Button, Badge, Card, Input, Textarea, Select, Checkbox, Switch, Slider, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Tabs, Accordion, Avatar, Progress, ScrollArea, Separator, Skeleton, Table, Label, EmptyState, LoadingSpinner, sonner, `index.ts` | Tokenised (Radix + shadcn bridge tokens); `Button` + `sonner` hand-fixed |
| `components/shell`                                                          |     3 | `Navbar`, `Footer`, `authShell`                                                                                                                                                                                                                                                  | Converted to light tokens                                                |
| `components/dashboard`                                                      |    10 | Topbar, sidebars, `UserNavDropdown`, role chrome                                                                                                                                                                                                                                 | Converted; sidebar tokens                                                |
| `components/shared`                                                         |    13 | Stat cards, section headers, empty/error states, pagination                                                                                                                                                                                                                      | Converted                                                                |
| `components/auth`                                                           |     7 | Auth cards, role selector, OTP input, guards (`RequireAuth`/`RequireRole`/`OnboardingGate`)                                                                                                                                                                                      | Converted                                                                |
| `components/notifications`                                                  |     6 | `NotificationBell`, list items, toasts                                                                                                                                                                                                                                           | Converted                                                                |
| `components/trust`                                                          |     4 | Legacy trust modals (**duplicate of `features/trust`**)                                                                                                                                                                                                                          | De-hexed, kept — tech debt (see `KNOWN_ISSUES.md`)                       |
| `components/{admin,analytics,brand,guardian,payments,pwa,scheduling,tutor}` |     9 | Single-purpose widgets + `PWARegister`, `OgroniEduBrand`                                                                                                                                                                                                                         | Converted                                                                |
| `features/**`                                                               |   105 | Domain features: bookings, classroom, learning, messaging, payments, tutor-discovery, onboarding, profile, student, guardian, analytics, trust, notifications                                                                                                                    | Converted in the three codemod passes                                    |

## 2. Findings before the refactor

|  #  | Finding                                                                                                          | Measured evidence                                                          |
| :-: | :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
|  1  | Five selectable palettes + dark mode driven by `data-theme`/`data-mode` attributes with localStorage persistence | `src/lib/theme/themes.ts`, `ThemeProvider`, `ThemePicker`, `ThemeSwitcher` |
|  2  | `dark:` Tailwind variants across 74 files                                                                        | ripgrep inventory: **349** occurrences                                     |
|  3  | Hard-coded hex literals (mint/ink panels, glass, glows)                                                          | **~718** across 37 files                                                   |
|  4  | Dark-first markup mixed with light-first markup (`bg-slate-900`, `text-white`, `bg-white/10`, `border-white/10`) | pass-1 leftover inventory                                                  |
|  5  | `bg-surface` used **117×** but `--color-surface` was never defined                                               | token scan — the utility rendered nothing                                  |
|  6  | Gradient panels hardcoded `from-[#0df5c4] to-[#00e1b2]` etc.                                                     | hex scan                                                                   |
|  7  | Theme picker duplicated in Navbar + dashboard chrome                                                             | component scan                                                             |

## 3. Component-level changes applied

- **Primitives**: colour-bearing classes replaced with semantic tokens (`bg-card`, `text-foreground`, `border-border`, `ring-ring`, `bg-primary`, `bg-brand` + `text-brand-foreground`). Radii/shadows normalised to the token scale.
- **`Button`**: variant map re-tokenised; primary = teal-700 fill; **bug fix** — `asChild` now wraps children in `Slottable` so strict radix-slot ≥1.4 does not throw when sibling conditional children evaluate to `false` (regression test added in `test/components.spec.ts`).
- **`sonner`**: toast theme no longer reads `next-themes`; forced light, tokenised.
- **Navbar/Topbar/`authShell`/`BottomNavbar`**: light tokens, mint FAB ring ink, contrast-safe avatar ink.
- **`StudyTimeTrackerCard`**: play button mint fill + brand-foreground ink.
- **`checkoutMethodPicker`**: gradient panel → light brand card; bKash/Nagad provider colours kept intentionally (see `DESIGN_SYSTEM_SPEC.md` §8).
- **`InteractiveWhiteboard`**: canvas colours intentionally literal.
- **`src/lib/navigation.ts`**: role badge/accent classes tokenised.

## 4. Duplication & debt (unchanged, tracked)

1. `components/trust/*` vs `features/trust/*` — parallel implementations of the same modals. Only `features/trust` is imported by routes; `components/trust` is now unused-by-route but retained to avoid an unreviewed deletion.
2. Several route-level pages embed their own layout headers instead of `components/shared` — acceptable, but a future pass should deduplicate.
3. No component-level Storybook/visual tests exist; `COMPONENT_CATALOG.md` is the current inventory of record.
