# 04 — Database: Schema, Migrations, Integrity, and Dev-Data State

Measured 2026-10-16 against the live dev database `ogroniedu_dev` (PostgreSQL 18) using catalog
counts only (no table contents beyond aggregates). Query scripts: `09-evidence-appendix.md` §4.

## 1. Inventory (measured)

| Metric                        | Value                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tables (public)               | **45**                                                                                                               |
| Views (public)                | 1                                                                                                                    |
| Indexes (public)              | 122                                                                                                                  |
| `pg_constraint` rows (public) | **515**, broken down as: 45 primary key · 78 foreign key · 21 unique · 69 check · **301 not-null** · **1 exclusion** |
| TypeORM entities              | 41 (`apps/api/src/modules/**/*.entity.ts`)                                                                           |
| SQL migrations                | 12 (`packages/database/src/migrations/001…012`)                                                                      |
| Migration ledger              | `schema_migrations` — 12 rows, `001` applied 2026-10-10 → `012` applied 2026-10-12                                   |

> The 301 not-null rows explain the earlier "515" headline: PostgreSQL 17+ records NOT NULL
> in `pg_constraint`, so totals include them. Application-meaningful subsets are the 78 FKs,
> 21 uniques, 69 checks, and the exclusion constraint below.

## 2. Migrations (all applied; names verified)

| #   | File                                      | Domain                                                    |
| --- | ----------------------------------------- | --------------------------------------------------------- |
| 001 | `001_initial_schema.sql`                  | Core schema incl. the double-booking exclusion constraint |
| 002 | `002_auth_verification_codes.sql`         | Auth verification codes                                   |
| 003 | `003_learning_management.sql`             | Attendance/assignments/submissions/grades/progress        |
| 004 | `004_payments_and_ledger.sql`             | Orders, milestones, ledger                                |
| 005 | `005_notifications_and_communication.sql` | Notifications, booking messages                           |
| 006 | `006_reviews_and_trust_safety.sql`        | Reviews, safety reports, replacements                     |
| 007 | `007_admin_and_operations.sql`            | Admin ops, audit, settings, flags                         |
| 008 | `008_analytics_and_reporting.sql`         | Analytics/reporting support                               |
| 009 | `009_security_and_privacy_hardening.sql`  | Security/privacy hardening                                |
| 010 | `010_performance_and_load_indexes.sql`    | Performance indexes                                       |
| 011 | `011_session_cancellation_tracking.sql`   | Session cancellation fields                               |
| 012 | `012_support_tickets.sql`                 | Support tickets                                           |

## 3. Integrity highlights

- **Double-booking is prevented at the database level**, not just in services:
  `ex_tutor_session_overlap` — `EXCLUDE USING gist (tutor_user_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('scheduled','in_progress'))`
  on `booking_sessions` (`001_initial_schema.sql:289-301`). This is the strongest single integrity
  invariant in the schema and is consistent with the scheduling tests.
- **78 foreign keys across 45 tables** — referential integrity is the default, not the exception.
- 69 CHECK constraints (state machines / range guards) and 21 uniques (identity/natural keys).
- Migration ledger is explicit (`schema_migrations` table) and append-only by convention; no
  down-migrations were exercised this session (not tested).

## 4. Dev-data state after this session's E2E run (aggregates)

| Table              |            Rows | Note                                                    |
| ------------------ | --------------: | ------------------------------------------------------- |
| `users`            |              24 | includes 4 seeded demo roles + E2E disposables          |
| `tutor_profiles`   | 9 (2 published) | only published+approved tutors are bookable/searchable  |
| `bookings`         |              14 | E2E/session history                                     |
| `subjects`         |               8 | taxonomy seed                                           |
| `education_levels` |               5 | taxonomy seed                                           |
| `curricula`        |               4 | taxonomy seed                                           |
| `user_roles`       |              25 | multi-role support in use                               |
| `auth_sessions`    |             162 | **test-artifact growth** (every E2E/UI login adds rows) |
| `support_tickets`  |              10 | contact-form E2E runs accumulate                        |
| `audit_logs`       |              35 | admin actions from E2E                                  |

The dev DB is **not reset** between test runs: E2E logins, tickets, and bookings accumulate.
That is acceptable for dev but means (a) demo counts drift from seeds, and (b) any future
"seed parity" check must tolerate extras (see `06-quality-baseline.md`).

## 5. Observations & gaps

- **Location taxonomy is not in the database.** `GET /api/v1/taxonomy/locations` returns 12
  hardcoded districts in the controller (`taxonomy.controller.ts:46-63`), while `README.md`
  advertises "search across 64 districts and upazilas". The web hero search has its own 10-item
  fallback (`HeroSearchBar.tsx:80-94`). See `05-static-data-audit.md` §S-3.
- **No `locations`/`upazilas` reference tables** were found in the table inventory; service-area
  rows store `districtCode`/`upazilaCode` strings (`tutor service areas`), so a taxonomy
  migration would be additive (not breaking) later.
- The exclusion constraint's partial `WHERE` clause excludes other statuses (e.g. `completed`,
  `cancelled`) — consistent with "only active sessions block a tutor's calendar"; cancellation
  tracking (migration 011) supplies the status transitions.
- Backups/restores and migration rollback were **not** exercised this session (Phase 24 WS3
  scopes the drill).
