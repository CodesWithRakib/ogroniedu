# Phase 8 — Deprecated Code Cleanup

**Date:** Day 7 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Backend Lead  

---

## Objective

Remove or replace all deprecated code patterns and outdated dependencies to reduce technical debt and security exposure.

---

## Scope

| Task | Description |
|---|---|
| S8.1 | Identify `DEP-001` through `DEP-010` (deprecated code items) in `08-ARCHITECTURE-REFACTOR-REGISTER.md` |
| S8.2 | Execute fix actions: 
| • RLD-001: Implement file download endpoint (Phase 4 target) — verify completed |
| • RLD-002: Gate `POST /api/v1/notifications/test-dispatch` with env flag — verify completed |
| • RLD-003: Resolve collaborative whiteboard documentation issue — add doc in `docs/` |
| • RLD-004: Resolve phantom-route UI references in `docs/USER_JOURNEYS.md` |
| • RLD-005: Resolve phantom-route UI references in `docs/ROUTE_AND_NAVIGATION_MAP.md` |
| • RLD-006: Remove dev-secret fallbacks in notification gateway + files service — verify fail-fast |
| • RLD-007: Document exception-handling variability (add to decision log) |
| • RLD-008: Document potential null reference issues (add to decision log) |
| S8.3 | Update `09-DEPRECATED-AND-DEPENDENCY-REGISTER.md` with resolved status |
| S8.4 | Run `pnpm turbo run lint` with `--deny-warnings` flag — verify zero warnings (only in test files) |
| S8.5 | Run `pnpm turbo run typecheck` — verify zero errors |

---

## Acceptance Criteria

- [ ] All DEP-001 through DEP-010 items resolved or migrated |
- [ ] Documentation issues (RLD-003, RLD-004, RLD-005) addressed |
- [ ] Dev-secret fallbacks removed; JWT_SECRET fail-fast verified |
| [ ] Lint warnings suppressed per code base policy |
| [ ] Typecheck passes across all packages |

---

*End of Phase 8.*
