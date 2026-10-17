# Feature Gap Register — UI/UX Refactor

**Date:** 2026-10-17
**Rule of this refactor:** report only what was actually inspected/executed; never fabricate metrics, never stub a workflow to look complete. This register separates *defects found* from *verification gaps* and *known debt*.

## A. Defects found & fixed in this refactor

| # | Defect | Evidence | Fix | Verified by |
| :-: | :--- | :--- | :--- | :--- |
| A1 | **All 10 public marketing routes crashed (HTTP 500)** | Radix `Slot` ≥1.4 throws `"Slot failed to slot onto its children…"` when `Button asChild` renders `{isLoading && <Loader2/>}` sibling (`React.Children.count([false, el]) === 2`) | `Button` wraps children in `<Slottable>` for `asChild` | Dev smoke (10/10 routes 200) + new regression test |
| A2 | `bg-surface` utility was dead (token missing) since before the refactor | 117 usages rendered nothing | Added `--surface: #f8fafc` + `@theme` mapping | Build + browsers render surface |
| A3 | Dark-only artifacts were unreachable but still shipped (`data-theme`/`data-mode` code paths, 5 palettes) | Pre-refactor audit | Removed registry/provider/picker/switcher + `next-themes` dependency | typecheck/lint/tests; lockfile updated |

## B. Product gaps (pre-existing, surfaced — not fixed here)

| # | Gap | Impact | Recommended owner action |
| :-: | :--- | :--- | :--- |
| B1 | `dashboard/admin/layout.tsx` allow-list omits `support_agent`/`compliance_reviewer` while `route-policy.ts` allows them to `/dashboard/admin/*` | Admin-family users hit a confusing redirect | Align layout list with `ADMIN_FAMILY_ROLES` (one-line change) — deliberately deferred pending review |
| B2 | Duplicate trust modals: `components/trust/*` (unused by routes) vs `features/trust/*` | Dead code, drift risk | Delete `components/trust/*` after confirming no dynamic import references |
| B3 | `e2e/diag.spec.ts` asserts nothing (`expect(count).toBeGreaterThanOrEqual(0)`) and always passes | False confidence in CI counts | Replace with a real metrics-band assertion or delete |
| B4 | No visual-regression/screenshot tooling | Theme regressions are caught only by token tests + manual smoke | Add Playwright screenshots for key routes in a follow-up |
| B5 | Route headers duplicated in several route files instead of `components/shared` | Minor inconsistency risk | Deduplicate opportunistically |

## C. Verification gaps (honest status)

| # | Check | Status | Why |
| :-: | :--- | :--- | :--- |
| C1 | Full credentialed E2E journeys (`journey.booking`, `admin.console`, `tutor.evidence`, `tutor.verification`) | **Not run locally** — 8 tests skipped by design | Specs require seeded accounts via `E2E_*` env vars; not set in this session. The 39 credential-free E2E tests all pass. |
| C2 | Manual keyboard traversal of every dashboard route | **Partial** | Automated skip-link + a11y E2E passes; full manual traversal not performed in this session. |
| C3 | Screen-reader pass on Bengali text | **Not run** | No AT available in this environment. |
| C4 | Lighthouse/axe audit | **Not run** | Not present in repo tooling; unit contrast assertions + focus-ring CSS cover the known risks. |

## D. Explicit non-gaps (verified absent)

| # | Thing | How verified |
| :-: | :--- | :--- |
| D1 | No mock/fake datasets in UI code | Repo scan for `mockData/MOCK_/fakeData/sampleData/dummyData` → only a comment noting a previously-removed sample dataset; `AnalyticsDashboardView` renders an explicit empty state. |
| D2 | No remaining `dark:` variants or dark tokens | Repo scan of `src` (0 matches). |
| D3 | No remaining theme-switch persistence (`localStorage` theme keys, `next-themes`) | Dependency removed; theme files deleted; grep for `next-themes` in `src` = 0. |
| D4 | No unintended palette classes | Scanner only finds bKash pink / Nagad orange (intentional provider brands) and `text-white` on coloured fills. |
