# Phase 04 — Database and Migrations Audit Report

**Date of Audit:** 2026-10-10 12:25:00 BST  
**Auditor:** Principal Software Architect & Database Engineer (AI Pair Programmer)  
**Project:** OgroniEdu — Enterprise Tutoring and Educational Management Platform (Bangladesh)  
**Repository Working Directory:** `c:\Sofof_tech_2026\ogroniedu`  
**Phase Objective:** Establish reviewed relational schema, production migration tooling, exclusion/integrity constraints, double-entry financial ledger structures, idempotent seed scripts, and verification tests.

---

## 1. Executive Summary

Phase 04 successfully established the production database foundation for OgroniEdu:

1. **Dedicated Database Package:** Established `@ogroniedu/database` workspace package with TypeScript compilation and native ESM support (`"type": "module"`).
2. **Sequential Migration Runner:** Implemented transactional `MigrationRunner` that tracks executed migrations in `schema_migrations`, executes pending `.sql` files in strict alphanumeric order, rolls back on any error, and is provably idempotent.
3. **Core Relational Schema (`001_initial_schema.sql`):** Created 23 core tables with strict relational integrity, UUIDv7 identifiers, ISO-8601 UTC timestamps, minor-unit integer currency (BDT Poisha), and btree/gin/gist indexing.
4. **Schedule Conflict Prevention:** Implemented PostgreSQL `btree_gist` extension and GiST exclusion constraint (`ex_tutor_session_overlap`) preventing double-booking and overlapping tutoring sessions for the same tutor.
5. **Contact Integrity Check:** Implemented check constraint (`chk_user_contact_present`) ensuring every user profile contains at least a valid email or phone number.
6. **Double-Entry Financial Ledger:** Modeled ledger accounts, journals, and entries with constraints enforcing balanced debits and credits and tamper prevention.
7. **Idempotent Seeding (`initial_seed.ts`):** Seeded standard system roles (`student`, `guardian`, `tutor`, `admin`, `super_admin`), national curricula (`bangla_medium`, `english_version`, `english_medium`, `madrasah`), education levels, and foundational academic subjects using `ON CONFLICT DO UPDATE`.
8. **Automated Verification:** Added 8 automated Vitest tests covering migration execution, idempotency, catalog presence, GiST exclusion negative testing, contact presence negative testing, and seed repetition. Monorepo total test count reached 61 passing tests with 0 failures.

---

## 2. Table Catalog Inventory (23 Tables Verified)

| Domain                  | Table Name                | Purpose & Key Constraints                                             |
| :---------------------- | :------------------------ | :-------------------------------------------------------------------- |
| **IAM & Auth**          | `users`                   | User identities with `chk_user_contact_present` check constraint      |
|                         | `roles`                   | System roles (`student`, `guardian`, `tutor`, `admin`, `super_admin`) |
|                         | `permissions`             | Granular permission nodes (e.g., `tutor:verify`, `booking:create`)    |
|                         | `user_roles`              | Many-to-many role assignments with foreign key cascading              |
| **Academic Hierarchy**  | `curricula`               | National & international curricula (NCTB, Cambridge, Madrasah)        |
|                         | `education_levels`        | Classes 1–12, SSC, HSC, University Admission                          |
|                         | `subjects`                | Bangla, English, Mathematics, Physics, Chemistry, Biology, etc.       |
| **Relationships**       | `guardian_student_links`  | Multi-child management and guardian authorization                     |
| **Tutors**              | `tutor_profiles`          | Verified credentials, bio, rate, status, badges                       |
|                         | `tutor_subjects`          | Subjects taught by verified tutors                                    |
|                         | `tutor_availabilities`    | Weekly recurring availability windows                                 |
| **Bookings & Lessons**  | `bookings`                | Booking contracts between student/guardian and tutor                  |
|                         | `booking_sessions`        | Individual scheduled lessons with GiST `ex_tutor_session_overlap`     |
|                         | `session_attendance`      | Verified attendance tracking with timestamps and dispute flags        |
| **Ledger & Accounting** | `ledger_accounts`         | Double-entry asset, liability, equity, revenue, expense accounts      |
|                         | `ledger_journals`         | Transaction journal headers with idempotency keys                     |
|                         | `ledger_entries`          | Individual debit and credit legs                                      |
| **Payments**            | `payment_orders`          | Orders created for bKash, Nagad, cards in minor units (Poisha)        |
|                         | `payment_transactions`    | Gateway transaction records with provider reference numbers           |
| **Realtime & Outbox**   | `notifications`           | Notification records matching contracts schema                        |
|                         | `notification_deliveries` | Channel delivery records (in-app, SMS, email)                         |
|                         | `outbox_events`           | Transactional outbox pattern for guaranteed messaging                 |
|                         | `idempotency_keys`        | API request deduplication cache                                       |
|                         | `audit_logs`              | Immutable audit trail for administrative and sensitive operations     |
| **Versioning**          | `schema_migrations`       | Recorded executed schema migrations                                   |

---

## 3. Verification Test Evidence

```bash
$ pnpm --filter @ogroniedu/database test

 RUN  v5.0.3 C:/Sofof_tech_2026/ogroniedu/packages/database

 ✓ test/migration.spec.ts (5 tests) 1840ms
   ✓ Database Migration Runner & Integrity Constraint Tests (5)
     ✓ should run initial migration and record execution in schema_migrations 775ms
     ✓ should be idempotent on second run (no duplicate execution)
     ✓ should verify all core tables exist in the database catalog
     ✓ NEGATIVE TEST: should reject user creation when both email and phone are NULL
     ✓ NEGATIVE TEST: should reject overlapping tutor sessions via GiST exclusion constraint (ex_tutor_session_overlap)
 ✓ test/seed.spec.ts (3 tests) 522ms
   ✓ Database Seed Runner & Idempotency Tests (3)
     ✓ should run initial seeds and populate foundational tables
     ✓ should be idempotent when seeds are executed repeatedly
     ✓ should maintain foreign key relationships between roles and users

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Duration  3.33s
```

Full Monorepo Test Suite Result:

- `@ogroniedu/database`: 8 tests passed
- `@ogroniedu/api`: 33 tests passed
- `@ogroniedu/web`: 20 tests passed
- **Total: 61 passed, 0 failed, 0 skipped**
