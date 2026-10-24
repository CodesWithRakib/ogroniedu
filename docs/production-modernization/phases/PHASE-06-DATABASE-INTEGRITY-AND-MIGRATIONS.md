# Phase 06 — Database Integrity, Migrations & Performance Indexes

**Phase ID:** `PHASE-06`  
**Phase Name:** Database Integrity, Migrations & Performance Indexes  
**Estimated Effort:** 0.5 Day (Day 5)  
**Status:** READY  
**Owner:** Database Engineer & Backend Lead

---

## 1. Objective and Business Justification
Ensure referential integrity, eliminate orphan records, and optimize query latency across the PostgreSQL 18 database. Execute disaster recovery drills verifying cold migration replays without data corruption.

---

## 2. Current-State Findings and Evidence
- 80 tables and views managed by 30 sequential migrations (`001` through `030`).
- Test suite `packages/database/test/migration.spec.ts` passes 18/18 tests.
- `file_assets` stores uploads, but lacks direct foreign key constraints to `tutor_verification_documents` and `booking_messages`.
- Tutor search query builder benefits from compound indexes on `(hourly_rate_poisha, rating_average)`.

---

## 3. Exact Scope
1. Author migration `031_file_assets_foreign_keys.sql` adding foreign keys with `ON DELETE RESTRICT` or `ON DELETE CASCADE` where appropriate.
2. Author migration `032_search_indexes.sql` creating compound B-tree indexes for tutor discovery and booking scheduling filters.
3. Verify migration runner executes migrations idempotently.
4. Run BCDR catastrophic wipe and cold recovery replay drill (`packages/database/test/bcdr-recovery.spec.ts`).

---

## 4. Explicit Exclusions
- Never run destructive `typeorm schema:sync` in staging or production.
- Do not modify historical migrations `001` through `030`.

---

## 5. Prerequisite Phases
- `PHASE-04-SECURITY-HARDENING-AND-STORAGE-ACCESS.md`
- `PHASE-05-EVENT-DRIVEN-ARCHITECTURE-AND-OUTBOX.md`

---

## 6. Tasks and Unique Task IDs
- `DB-001`: Add foreign key constraints from `file_assets` to entity tables via migration 031.
- `DB-002`: Add compound indexes for tutor search geo-queries via migration 032.
- `DB-003`: Verify BCDR cold recovery drill with migration replay.

---

## 7. Actual Affected Files and Modules
- `packages/database/src/migrations/031_file_assets_foreign_keys.sql` (new)
- `packages/database/src/migrations/032_search_indexes.sql` (new)
- `packages/database/test/migration.spec.ts`
- `packages/database/test/bcdr-recovery.spec.ts`

---

## 8. Files Created, Split, Moved, or Removed
- Created: Migrations 031 and 032.

---

## 9. Frontend Work
- None.

---

## 10. Backend Work
- Update entity metadata in `packages/database/src/entities` if needed.

---

## 11. Database and Migration Work
- Apply migrations 031 and 032 via `pnpm --filter @ogroniedu/database db:migrate`.

---

## 12. Event-Driven Architecture Work
- None.

---

## 13. Security Requirements
- Ensure database connection string does not log credentials in migration logs.

---

## 14. Unit Test Requirements
- `packages/database/test/migration.spec.ts` passes 18/18 tests.
- `packages/database/test/seed.spec.ts` passes 4/4 tests.

---

## 15. Integration Test Requirements
- BCDR disaster recovery drill passes 5/5 tests (`test/bcdr-recovery.spec.ts`).

---

## 16. Browser Automation and E2E Scenarios
- N/A; verified through database integration drills.

---

## 17. Required Commands
```pwsh
pnpm --filter @ogroniedu/database test
```

---

## 18. Acceptance Criteria
1. Migrations 031 and 032 apply cleanly without errors.
2. Referential integrity enforced for `file_assets`.
3. BCDR cold recovery drill replays all 32 migrations cleanly.

---

## 19. Failure and Rollback Considerations
- Migrations must include down migration scripts or safe rollback statements.

---

## 20. Definition of Done
- Migrations 031 and 032 committed, database tests pass 100%.

---

## 21. Expected Evidence
- Clean test run output of `packages/database/test/*.spec.ts`.

---

## 22. Known Risks and Blockers
- Test isolation flake between `migration.spec.ts` and `bcdr-recovery.spec.ts` when run in parallel. Ensure test runner uses serial execution for database wipe drills.

---

## 23. Estimated Effort
- 0.5 Day.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`.
