# Phase 13 — Decision & Blocker Log Tracking

**Date:** Ongoing  
**Owner:** Release Lead

---

## Purpose

Track all architectural decisions, blockers, and scope decisions during the modernization program.

---

## Decision Log (Latest)

| ID    | Decision                                         | Date       | Status         |
| ----- | ------------------------------------------------ | ---------- | -------------- |
| D-001 | Adopt Next.js App Router with Server Components  | 2026-10-24 | ✅ Completed   |
| D-002 | Use NestJS with future GraphQL (Phase 5+)        | 2026-10-24 | 📝 Pending     |
| D-003 | Fail-fast on missing JWT_SECRET in production    | 2026-10-24 | ✅ Completed   |
| D-004 | Gate test-dispatch behind env flag               | 2026-10-24 | ✅ Completed   |
| D-005 | Extract domain packages                          | 2026-10-24 | 📝 In Progress |
| D-006 | Add FK constraints + indexes to file_assets      | 2026-10-24 | ✅ Completed   |
| D-007 | Migrate DTO validation to zod (Phase 11)         | 2026-10-24 | 📝 Pending     |
| D-008 | Keep local disk storage; plan S3 migration later | 2026-10-24 | ✅ Completed   |
| D-009 | Preserve soft-delete pattern across all entities | 2026-10-24 | ✅ Completed   |
| D-010 | Adopt Istanbul coverage with 90% threshold       | 2026-10-24 | ✅ Completed   |

---

## Blocker Log (Latest)

| ID    | Blocker                                    | Status         | Resolution / Mitigation                 | Target Date |
| ----- | ------------------------------------------ | -------------- | --------------------------------------- | ----------- |
| B-001 | Dev-secret fallbacks (RLD-006)             | ✅ Resolved    | Fail-fast env validation added          | 2026-10-24  |
| B-002 | Missing file download endpoint (RLD-001)   | 📝 In Progress | Implementing Phase 4                    | 2026-10-28  |
| B-003 | Unguarded test-dispatch (RLD-002)          | ✅ Resolved    | Env flag added                          | 2026-10-27  |
| B-004 | Flaky E2E tests (learning + notifications) | 📝 In Progress | Fixing Phase 10                         | 2026-10-31  |
| B-005 | FK constraints migration risk              | ✅ Mitigated   | Apply in staging first, rollback script | 2026-10-28  |

---

## Open Decisions Pending

| ID     | Decision                              | Needed By                   |
| ------ | ------------------------------------- | --------------------------- |
| DD-001 | GraphQL vs REST for future iterations | Phase 5 (post-7-day sprint) |

---

## Status Summary

- **Decisions**: 10 recorded (7 completed, 3 pending)
- **Blockers**: 5 identified, 2 resolved, 3 in progress
- **Critical blockers (P0/P1) remaining**: 0 (all resolved or escalated with mitigation)

---

_End of Phase 13._
