# Repository Audit — UI/UX Refactor

**Date:** 2026-10-17
**Scope:** `C:\Sofof_tech_2026\ogroniedu` (pnpm + Turborepo monorepo)
**Status:** Completed (first pass) — feeds every other document in `docs/ui-refactor/`

---

## 1. Monorepo layout

| Path                            | Purpose                                                                                       |
| :------------------------------ | :-------------------------------------------------------------------------------------------- |
| `apps/web`                      | Next.js 16 App Router frontend (all 64 pages, 9 layouts) — **primary scope of this refactor** |
| `apps/api`                      | NestJS-style API (`http://localhost:4000` by default via `NEXT_PUBLIC_API_URL`)               |
| `packages/contracts`            | Shared API contracts / zod schemas                                                            |
| `packages/database`             | Prisma schema + migrations + seeds                                                            |
| `packages/tsconfig`             | Shared TypeScript config                                                                      |
| `scripts/`, `prompts/`, `docs/` | Tooling, prompts and the documentation set                                                    |

## 2. Web app architecture

- **Framework:** Next.js 16.4.0 (App Router), React 19, TypeScript strict.
- **Styling:** Tailwind CSS v4 with **no config file**; the design system lives in `apps/web/src/app/globals.css` via `@theme` + `:root` custom properties.
- **State:** Redux Toolkit store (`src/store`) with slices incl. `ui-slice`.
- **Data:** REST client in `src/lib/api/*` with zod parsing (`parseItem`, collections, `fieldErrorsOf`) and canonical error mapping.
- **Auth/roles:** client-side gating — `RequireAuth`, `RequireRole`, `OnboardingGate`, `src/lib/route-policy.ts`. **No `middleware.ts` / proxy** exists.
- **i18n:** `[locale]` segment (`bn` default, `en`), `src/lib/i18n` dictionaries.
- **PWA:** `public/manifest.json`, `public/offline.html`, `PWARegister`.
- **Tests:** 30 Vitest specs (`apps/web/test`), 10 Playwright specs (`apps/web/e2e`), oxlint.

## 3. Route surface (measured)

- **64 page routes** across: public marketing (9), auth (4), onboarding/profile (2), student dashboard (7), tutor dashboard (8), guardian dashboard (7), shared dashboard (8), admin (8), analytics (1), classroom/learning (2), bookings/payments (6), notifications (1), safety/tutor-replacements (2).
- **9 layouts** (root, locale, 3 public-group/admin-group/dashboard-group, 4 role layouts).
- Full list: `docs/ui-refactor/ROUTE_AND_PAGE_INVENTORY.md`.

## 4. Design-system facts before the refactor

| Finding                                                                                                       | Evidence                                                                                                  |
| :------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------- |
| 5 selectable themes + dark mode with `data-theme`/`data-mode` attributes and localStorage persistence         | `src/lib/theme/themes.ts`, `ThemeProvider`, `ThemePicker`, `ThemeSwitcher` (all removed in this refactor) |
| 349 `dark:` variant usages across 74 files                                                                    | ripgrep inventory                                                                                         |
| ~718 hard-coded hex literals in 37 files (mint/ink panels, glass, glows)                                      | ripgrep inventory                                                                                         |
| Large amount of dark-first markup (`bg-slate-900`, `text-white`, `bg-white/10`) mixed with light-first markup | leftover inventory after first codemod                                                                    |
| `bg-surface` used 117× but the token was never defined                                                        | token scan (`--color-surface` missing in the old `globals.css`)                                           |
| Canvas 2D colours must stay literal                                                                           | `InteractiveWhiteboard.tsx`                                                                               |

## 5. What the refactor changed (high level)

1. Rewrote `globals.css` as the single light-only token source (approved brand hexes + derived accessible shades).
2. Deleted theme registry/provider/picker/switcher, root theme-init script, `data-*` attributes, and `next-themes`.
3. Converted every dark-first surface/markup to the light system via a three-pass, review-gated codemod, then hand-fixed edge cases.
4. Added the missing `--surface` token (fixes 117 previously dead `bg-surface` utilities).
5. Rebuilt the brand test, updated PWA assets, rewrote design docs, and re-ran the full local gate (typecheck / lint / 178 unit tests).

## 6. Known repository-level gaps (unchanged by this refactor)

- Role-layout allow-list mismatch: `support_agent`/`compliance_reviewer` can reach `/{locale}/admin` but are redirected away from `/dashboard/admin/*`.
- Duplicate trust modals (`src/components/trust/*` vs `src/features/trust/components/*`) — intentionally not deleted yet (tech debt).
- No route-level middleware; all redirects are client-side.
- No visual-regression/screenshot tooling in CI.

See `docs/ui-refactor/KNOWN_ISSUES.md` for severity and owners.
