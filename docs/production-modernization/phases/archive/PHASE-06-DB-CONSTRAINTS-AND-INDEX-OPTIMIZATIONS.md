# Phase 6 — DB Constraints & Index Optimizations

**Date:** Day 5 of 7-day sprint  
**Duration:** 1 day  
**Owner:** Database Team

---

## Objective

Apply foreign key constraints and performance indexes to `file_assets` and `outbox` tables, ensuring referential integrity and improved query performance.

---

## Scope

| Task | Description                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S6.1 | Create migration `031-add-file-asset-fk.sql`: add foreign keys from `file_assets.reference_type` + `reference_id` to target entity tables (e.g., `tutor_profiles.id`, `bookings.id`) |
| S6.2 | Add GiST exclusion index for `sessions(tutor_id, start_at, end_at)` to reduce booking conflicts                                                                                      |
| S6.3 | Add partial unique index `ix_outbox_idempotency` on `(entity_type, entity_id, event_type)`                                                                                           |
| S6.4 | Create composite index `ix_file_assets_reference` on `(reference_type, reference_id)`                                                                                                |
| S6.5 | Run migration in staging first; rollback script prepared for emergency cutover                                                                                                       |
| S6.6 | Verify FK constraints hold across test data (seed)                                                                                                                                   |
| S6.7 | Execute query benchmarks: booking conflict query and outbox deduplication query before/after                                                                                         |
| S6.8 | Run `pnpm turbo run typecheck` + `lint` — ensure no schema/type issues                                                                                                               |

---

## Acceptance Criteria

- [ ] All new FK constraints enforce referential integrity; no orphaned rows in test dataset
- [ ] Index performance reduces target query execution time by ≥10% (benchmarked)
- [ ] Migration runs cleanly in staging and local development
      | [ ] `pnpm turbo run typecheck` and `pnpm turbo run lint` pass
- [ ] Rollback script available: `rollback.sql` reverses FKs and indexes

---

## Risk Mitigation

| Risk                            | Mitigation                                          |
| ------------------------------- | --------------------------------------------------- |
| FK violation in production data | Apply migration in staging first; verify seed data; |

- rollback script available |
  | Deployment downtime from index building | Apply indexes during maintenance window; monitor ongoing queries |

---

_End of Phase 6._
