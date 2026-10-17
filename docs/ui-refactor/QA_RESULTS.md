# QA Results — UI/UX Refactor

**Date:** 2026-10-17 · **Machine:** Windows (win32), pnpm workspace, Next.js 16.4.0 / React 19, Vitest 5, Playwright chromium.
**Honesty note:** every result below was produced by a command run in this working tree on this date. Skipped/unrunnable checks are listed at the bottom.

## 1. Static gates

| Gate | Command | Result |
| :--- | :--- | :--- |
| Typecheck | `pnpm --filter @ogroniedu/web typecheck` | ✅ exit 0 (`tsc --noEmit`, no diagnostics) |
| Lint | `pnpm --filter @ogroniedu/web lint` | ✅ exit 0 (`oxlint src test e2e --deny-warnings`) |
| Production build | `pnpm --filter @ogroniedu/web build` | ✅ exit 0; full route manifest emitted; **zero warnings** (no `error|failed|warn` lines in build log) |

## 2. Unit / integration tests

```
$ pnpm --filter @ogroniedu/web test        # vitest run
 Test Files  30 passed (30)
      Tests  179 passed (179)
   Duration  10.49s
```

Notable additions inside this count: brand/contrast suite (`api-contract.spec.ts`) and the `Button asChild` strict-Slot regression test (`components.spec.ts`).

## 3. E2E (Playwright, live dev stack)

```
$ $env:E2E_BASE_URL='http://localhost:5000'; pnpm --filter @ogroniedu/web e2e
  39 passed (59.7s)
   8 skipped
  EXIT=0
```

| Breakdown | Result |
| :--- | :--- |
| Auth guards (bn+en) | 8/8 passed — redirects to login; bad credentials show visible error |
| Keyboard a11y | 2/2 passed — skip link moves focus to `#main-content` |
| Responsive matrix | 20/20 passed — 4 routes × 5 viewports (360/390/768/1280/1440), no horizontal overflow |
| Public smoke | 8/8 passed — hero + metrics band states, tutors list, login validation, **contact form posts a real ticket and shows a reference** |
| Diagnostic | 1/1 passed — metrics band rendered, `/public/stats` 200 |
| Credentialed journeys (booking, admin console, tutor evidence/verification) | **8 skipped** — `E2E_*` seed credentials not set in this session |

## 4. Dev-server route smoke (all 64 routes)

Method: script enumerated every page route from the file tree (+`/`), issued HTTP GETs with dummy ids for dynamic segments, captured status/latency, and scanned every response body for `dark:`, `class="dark"`, dark slate/gray/zinc/neutral-900 backgrounds, and the Next error-page signature (`id="__next_error__"`).

| Metric | Result |
| :--- | :--- |
| Routes returning 200 | **64 / 64** (+`/en` variants spot-checked) |
| `/` root | 307 locale redirect — by design |
| `/bn/bookings` (no id) | 404 — route requires `[id]`; not a defect |
| `dark:` occurrences in served HTML | **0** |
| `class="dark"` / dark background classes | **0** |
| Next error pages | **0** |
| Server exceptions in dev log after Slot fix | **0** |

## 5. Source-tree scans

| Scan | Result |
| :--- | :--- |
| `dark:` variants in `apps/web/src` | 0 |
| `next-themes` references | 0 |
| Hardcoded hexes in tailwind classes | 0 outside documented exceptions |
| Remaining palette utilities | only bKash `pink-600` / Nagad `orange-700` (intentional) |
| `text-white` usages | ~58, all verified to sit on coloured fills (teal/sapphire/status), none on white |
| Fabricated datasets (`mockData/MOCK_/fakeData/sampleData/dummyData`) | 0 (one comment noting a previously removed sample dataset) |

## 6. Defect found during QA (fixed within this session)

- **Public routes 500** — strict radix `Slot` + `Button asChild` falsy sibling child. Fixed with `<Slottable>`; regression test added; re-verified across smoke (10/10 public routes), build, unit tests, and E2E.

## 7. Not run (see `FEATURE_GAP_REGISTER.md` §C)

- Credentialed E2E journeys (need seeded accounts via env vars).
- Visual regression/screenshot diffs (tooling absent).
- Screen-reader AT pass; Lighthouse/axe audit.
