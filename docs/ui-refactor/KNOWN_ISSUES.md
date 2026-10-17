# Known Issues — UI/UX Refactor

**Date:** 2026-10-17 · Severity: **High** = user-visible breakage · **Medium** = confusing behaviour / maintenance risk · **Low** = cosmetic/tooling.
Items marked ✅ were **fixed within this session**; everything else is open and honestly reported.

## Open

| # | Severity | Issue | Impact | Recommended fix |
| :-: | :--- | :--- | :--- | :--- |
| K1 | **Medium** | Admin-family layout mismatch: `dashboard/admin/layout.tsx` allow-list excludes `support_agent`/`compliance_reviewer`, while `route-policy.ts` (and `/admin`, `/analytics`) allows them into the admin family | Those two roles are bounced from `/dashboard/admin/*` to their dashboard after the initial navigation — confusing, though not a security boundary | Add both roles to the layout allow-list to mirror `ADMIN_FAMILY_ROLES`; verify with `admin.console` E2E |
| K2 | **Medium** | Duplicate trust modals: `components/trust/*` (not referenced by routes) vs `features/trust/*` (canonical) | Dead code drifts and doubles review surface | Delete `components/trust/*` after a dynamic-import grep; do it in a dedicated commit |
| K3 | **Low** | `e2e/diag.spec.ts` asserts nothing (always passes) | Inflates pass counts; masks a potential metrics-band regression | Replace with a real assertion on `platform-metrics-band` or delete |
| K4 | **Low** | No visual-regression tooling | Theme/token regressions rely on unit contrast tests + manual smoke | Add Playwright screenshot snapshots for ~10 key routes |
| K5 | **Low** | Credentialed E2E journeys (booking lifecycle, admin console, tutor evidence/verification) not runnable without seeded accounts | Those flows are verified only by unit tests + manual dev smoke in this environment | Document seeds (`pnpm db:seed`, `E2E_*` envs) and run before merge/CI |
| K6 | **Low** | No route-level middleware; auth/role redirects are client-side | Brief content flash / no server-side protection (API remains authoritative) | Out of scope for this refactor; consider Next middleware in a future security pass |
| K7 | **Low** | Route duplication to review: `/{locale}/bookings/[id]` vs `/{locale}/dashboard/bookings/[id]` (and their `pay` variants) appear to render the same flows | Potential redundant maintenance | Confirm product intent; keep or de-duplicate in a follow-up |

## Fixed in this refactor

| # | Severity | Issue | Resolution |
| :-: | :--- | :--- | :--- |
| F1 | **High** | `Button asChild` crashed under strict radix-slot ≥1.4 → **all 10 public marketing routes returned HTTP 500** | `<Slottable>` wrap in `Button`; regression test + smoke/build/E2E verification (see `CHANGELOG.md` “Fixed”) |
| F2 | **Medium** | `bg-surface` used 117× with no `--surface` token (dead styling) | Added `--surface: #f8fafc` + `@theme` mapping |
| F3 | **Medium** | Dark-mode/theme-switching code shipped despite light-only product decision (5 palettes, persistence, `next-themes`) | Removed wholesale; scans confirm 0 residue |

## Non-issues (documented so future scans don’t re-flag)

- `InteractiveWhiteboard` canvas literals — required by the Canvas 2D API.
- bKash pink / Nagad orange in checkout — deliberate third-party brand colours.
- ~58 `text-white` utilities — all on coloured fills; contrast-verified.
