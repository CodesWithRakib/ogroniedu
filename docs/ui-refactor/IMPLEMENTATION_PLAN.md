# Implementation Plan — UI/UX Refactor

**Date:** 2026-10-17
**Status:** Phases 0–7 complete; phase 8 (review & commit) open.

## Phase 0 — Audit (completed)

- Regenerated route/layout inventory (64 pages / 9 layouts), component census (73 route + 79 component + 105 feature files), provider tree, dark-mode and hex inventory (~349 `dark:` in 74 files; ~718 hexes in 37 files; 117 dead `bg-surface`).
- Output: `REPOSITORY_AUDIT.md`, `ROUTE_AND_PAGE_INVENTORY.md`, `EXISTING_COMPONENT_AUDIT.md`.

## Phase 1 — Token system (completed)

- Rewrote `apps/web/src/app/globals.css` as the single light-only source of truth: brand accents verbatim, derived accessible shades, status triples, sidebar tokens, surfaces, geometry/motion/type, decorative utilities, focus ring, reduced-motion, light scrollbars.
- Added `src/lib/theme/brand.ts` with exact approved hexes + `relativeLuminance`/`contrastRatio`.
- Added missing `--surface` token (fixes 117 dead utilities).

## Phase 2 — Theme-mode removal (completed)

- Deleted theme registry/provider/picker/switcher + theme-init script; removed `data-theme`/`data-mode` logic from layouts and `ui-slice`; removed `next-themes` dependency (lockfile updated); `color-scheme: light`; PWA assets (`manifest.json`, `offline.html`) rewritten light.

## Phase 3 — Codemod conversion (completed)

Three review-gated passes:

| Pass                               | Scope                | Result                                                                                                                          |
| :--------------------------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `light-pass1` (dark→light mapping) | dark-first markup    | palette → semantic tokens                                                                                                       |
| `light-pass2` (full normalisation) | 83 files, 1304 lines | `bg-slate-900→bg-card`, safe `text-white→text-foreground`, status washes, gradient panels → light brand cards, hover/focus maps |
| `light-pass3` + cleanup            | 114 + 15 files       | remaining Tailwind palette utilities → semantic tokens                                                                          |

Codemod scripts retained in the session temp dir with `--dry` mode; leftover scanners confirmed only intentional literals remain.

## Phase 4 — Hand fixes (completed)

`StudyTimeTrackerCard` play button, `authShell` avatar ink, `BottomNavbar` FAB ring, `checkoutMethodPicker` ink, `Navigation` role badges, `sonner` toaster, PWA assets.

## Phase 5 — Verification tooling (completed)

- Replaced the old theme-registry test with brand-config/contrast assertions in `test/api-contract.spec.ts`.
- Added `Button` `asChild` regression test (`test/components.spec.ts`).
- Ran: typecheck, lint, 179 unit tests, production build, dev-server smoke of all 64 routes, credential-free Playwright suite.

## Phase 6 — Defect repair (completed)

- **A1**: strict radix-slot `Slottable` fix in `Button` (all public pages had been 500).
- Documented (not changed): admin layout allow-list mismatch, duplicate trust modals.

## Phase 7 — Documentation (completed)

`docs/ui-refactor/*` (this set) + rewritten `docs/design-system-and-ui-guidelines.md` v2.0.0.

## Phase 8 — Review & commit (open)

- Open items: human review of the 167 modified + new files under `apps/web/src`; decide on B1/B2 from the gap register; run the credentialed E2E journeys with seeded accounts; commit (currently uncommitted).

## Sequencing notes

- Phases 1→2 are hard prerequisites for the codemods (token names must exist first).
- Hand fixes were intentionally last so automated passes could not overwrite them.
- No API/schema work was required — this refactor is frontend-only (see `API_AND_SCHEMA_CHANGES.md`).
