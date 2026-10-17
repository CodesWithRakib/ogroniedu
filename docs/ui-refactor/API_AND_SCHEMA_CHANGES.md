# API & Schema Changes — UI/UX Refactor

**Date:** 2026-10-17

## 1. Verdict

**No API, contract, database, or seed changes were required or made.**
This refactor is **frontend-presentation-only**. Verified by `git status`:

| Path | Changed files |
| :--- | --: |
| `apps/web/**` (src, tests, PWA assets, package.json) | 173 |
| `docs/**` | 2 (guidelines rewrite + `ui-refactor/`) |
| `pnpm-lock.yaml` | 1 (removal of `next-themes`) |
| `apps/api/**` | **0** |
| `packages/contracts/**` | **0** |
| `packages/database/**` | **0** |

## 2. Why no backend change was needed

| Concern | Reason |
| :--- | :--- |
| Theme persistence | Theme selection was **client-side localStorage only**; removing it cannot break the API. |
| Data fetching | No endpoint, request shape, zod contract or DTO was touched — every page keeps its existing RTK Query services in `src/store/services/*` and `src/lib/api/*`. |
| Auth/roles | No policy or role list changed (`route-policy.ts` untouched). |
| PWA metadata | `manifest.json` theme/background colours updated — static asset, not API. |

## 3. UI-facing API dependencies (unchanged, for context)

- Base URL `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).
- Responsive data flows through RTK Query services + zod parsing (`parseItem`, collections, `fieldErrorsOf`); error surfaces map to the same canonical messages as before the refactor.
- The contact form E2E test posts a real ticket to the API (`smoke.public.spec.ts` passed), demonstrating the untouched contract end-to-end.

## 4. Follow-ups recorded elsewhere

Backend-adjacent gaps surfaced by the audit (admin role allow-list mismatch, duplicate trust components) are **frontend-only fixes** and tracked in `FEATURE_GAP_REGISTER.md` §B / `KNOWN_ISSUES.md`.
