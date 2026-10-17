# Testing & Acceptance — UI/UX Refactor

**Date:** 2026-10-17
**Principle:** sections below report executed commands and raw results. Anything not executed is marked **Not run** (see `FEATURE_GAP_REGISTER.md` §C).

## 1. Gate commands (from `apps/web/package.json`)

| Gate | Command | Cadence |
| :--- | :--- | :--- |
| Typecheck | `pnpm --filter @ogroniedu/web typecheck` (`tsc --noEmit`) | every change |
| Lint | `pnpm --filter @ogroniedu/web lint` (`oxlint src test e2e --deny-warnings`) | every change |
| Unit/integration | `pnpm --filter @ogroniedu/web test` (`vitest run`, 30 files) | every change |
| Production build | `pnpm --filter @ogroniedu/web build` | pre-merge |
| E2E | `$env:E2E_BASE_URL='http://localhost:5000'; pnpm --filter @ogroniedu/web e2e` | pre-merge, live stack |
| Dev smoke | custom script hitting every route (see §2) | this refactor only |

## 2. Accept-all acceptance checklist

| # | Criterion | How verified | Result |
| :-: | :--- | :--- | :--- |
| 1 | Light theme only, no switcher/dark tokens | Repo scans (0 `dark:`, 0 `next-themes`), visual smoke | ✅ |
| 2 | Approved brand hexes exact & centralised | `brand.ts` + `api-contract.spec.ts` assertions | ✅ |
| 3 | Bright mint never used as text-on-white or every-button background | Contrast test asserts 1.41:1 and usage rules; style guide | ✅ |
| 4 | All pages still render | Dev smoke: 64/64 routes 200 (one intentional 404 route without id; `/` 307 by design) | ✅ |
| 5 | No dark markup in served HTML | Smoke scan: 0 `dark:` / `class="dark"` / dark slate backgrounds in every response | ✅ |
| 6 | Type safety | `tsc --noEmit` exit 0 | ✅ |
| 7 | Lint | `oxlint --deny-warnings` exit 0 | ✅ |
| 8 | Unit tests | 30 files, 179/179 passed (includes new Slot regression test) | ✅ |
| 9 | Production build | `next build` exit 0, no warnings | ✅ |
| 10 | E2E (credential-free) | 39 passed / 8 skipped / 0 failed, exit 0 | ✅ |
| 11 | E2E (credentialed journeys) | Requires `E2E_*` seeded accounts | **Not run** |
| 12 | Keyboard/skip-link | E2E `keyboard.a11y.spec.ts` bn+en | ✅ |
| 13 | Responsive (360/390/768/1280/1440) | E2E `responsive.matrix.spec.ts` — no horizontal overflow on 4 routes × 5 viewports | ✅ |
| 14 | Forms validation & errors | E2E login empty-submit + bad-credentials tests; RHF+Zod suites in unit tests | ✅ |
| 15 | Contrast (WCAG 2.2 AA) | Programmatic assertions for all text pairs in §`DESIGN_SYSTEM_SPEC.md` §6 | ✅ |
| 16 | Loading/empty/error states | Unit suites + manual smoke of dashboard empty states | ✅ (spot-checked) |
| 17 | Visual regression snapshots | Tooling absent | **Not run** |

## 3. E2E suite breakdown (executed)

| Spec | Result |
| :--- | :--- |
| `auth.guards.spec.ts` (bn+en) | 8 passed — guards redirect, bad-credential error visible |
| `keyboard.a11y.spec.ts` | 2 passed — skip link focuses `#main-content` |
| `responsive.matrix.spec.ts` | 20 passed — `/bn`, `/bn/tutors`, `/bn/pricing`, `/bn/login` at 5 viewports, no overflow |
| `smoke.public.spec.ts` | 8 passed — hero/metrics band states, tutors list, login validation, contact ticket posts real reference |
| `diag.spec.ts` | 1 passed (no-assert diagnostic; metrics band rendered, stats 200 — see gap B3) |
| `journey.booking.spec.ts` | 2 **skipped** — needs `E2E_STUDENT_*`/`E2E_TUTOR_*` |
| `admin.console.spec.ts` | 2 **skipped** — needs `E2E_ADMIN_*` |
| `tutor.evidence.spec.ts` | 2 **skipped** — needs tutor creds |
| `tutor.verification.spec.ts` | 2 **skipped** — needs tutor creds |

## 4. Dev smoke procedure (this refactor)

1. `pnpm --filter @ogroniedu/web dev` (port 5000) against API on `:4000`.
2. Script enumerated all 64 routes (+`/`, dummy ids for dynamic segments) with `Invoke-WebRequest`, recorded status/time, and scanned bodies for `dark:`, `class="dark"`, dark slate backgrounds, and the Next error-page signature (`id="__next_error__"`).
3. Result: every route 200 (except `/bn/bookings` 404 by design — route requires an id; `/` 307 locale redirect), 0 dark hits, 0 error pages, no server-side exceptions in the dev log after the A1 fix.

## 5. Regressions guards added

- `test/api-contract.spec.ts` — exact brand hexes; mint <3:1 vs white; ink on mint/primary/interactive/status ≥4.5:1; luminance maths; usage rules encoded.
- `test/components.spec.ts` — `Button asChild` renders through strict radix-slot without throwing (guards defect A1).
