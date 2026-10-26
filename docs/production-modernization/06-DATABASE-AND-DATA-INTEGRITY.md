# OgroniEdu — Master Database and Data Integrity Register

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Scope:** PostgreSQL 18 schema, 80 tables/views, 30 migrations, entity relations, transaction boundaries, and ledger invariants in `packages/database`.

---

## 1. Database Architecture & Engine Configuration

- **Database Engine**: PostgreSQL 18
- **ORM / Driver**: TypeORM `^1.1.2` with native `pg` `^8.23.1`
- **Default Schema**: `public`
- **Table Count**: 78 active tables
- **View Count**: 2 views (`v_tutor_public_catalog`, `v_ledger_account_balances`)
- **Total Relations**: 80
- **Migration Strategy**: Versioned raw SQL migrations executed sequentially via `scripts/run-migrations.mjs` and recorded in `schema_migrations` table.

---

## 2. Authoritative Migration Register (30 Migrations)

Verified directly against `packages/database/src/migrations/`:

| #   | Migration File                                        | Size    | Purpose & Tables Created / Altered                                                                                                          | Status             |
| --- | ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 001 | `001_initial_schema.sql`                              | 19.3 KB | Core foundational tables: `users`, `roles`, `user_roles`, `auth_sessions`, `tutor_profiles`, `bookings`, `sessions`, `outbox`, `audit_logs` | Applied & Verified |
| 002 | `002_auth_verification_codes.sql`                     | 1.1 KB  | `auth_verification_codes`: OTP delivery, expiry timestamps, attempt counters                                                                | Applied & Verified |
| 003 | `003_learning_management.sql`                         | 3.3 KB  | `assignments`, `assignment_submissions`, `session_attendance`, `progress_reports`                                                           | Applied & Verified |
| 004 | `004_payments_and_ledger.sql`                         | 1.7 KB  | `ledger_entries`, `payment_orders`, `payout_requests`, `refund_requests`                                                                    | Applied & Verified |
| 005 | `005_notifications_and_communication.sql`             | 1.9 KB  | `notifications`, `notification_preferences`, `booking_messages`                                                                             | Applied & Verified |
| 006 | `006_reviews_and_trust_safety.sql`                    | 4.5 KB  | `reviews`, `disputes`, `safety_reports`, `tutor_replacements`                                                                               | Applied & Verified |
| 007 | `007_admin_and_operations.sql`                        | 1.8 KB  | `platform_settings`, `feature_flags`, `system_sweepers`                                                                                     | Applied & Verified |
| 008 | `008_analytics_and_reporting.sql`                     | 1.3 KB  | `analytics_kpis`, `tutor_metrics`, `daily_revenue`                                                                                          | Applied & Verified |
| 009 | `009_security_and_privacy_hardening.sql`              | 0.7 KB  | Credential epoch tracking, session replay security                                                                                          | Applied & Verified |
| 010 | `010_performance_and_load_indexes.sql`                | 1.1 KB  | B-tree and composite search indexes on users, bookings, sessions                                                                            | Applied & Verified |
| 011 | `011_session_cancellation_tracking.sql`               | 0.8 KB  | Cancellation reasons, initiator tracking, penalty shares                                                                                    | Applied & Verified |
| 012 | `012_support_tickets.sql`                             | 1.3 KB  | `support_tickets`, `ticket_messages`                                                                                                        | Applied & Verified |
| 013 | `013_auth_onboarding_and_magic_links.sql`             | 2.6 KB  | `magic_link_tokens`, `onboarding_steps`, `user_onboarding_status`                                                                           | Applied & Verified |
| 014 | `014_tutor_verification_dossier.sql`                  | 10.5 KB | `tutor_verification_levels`, `tutor_verification_documents`, audit logs                                                                     | Applied & Verified |
| 015 | `015_academic_streams_and_institutions.sql`           | 10.9 KB | Taxonomy: `education_levels`, `curricula`, `academic_streams`, `institutions`                                                               | Applied & Verified |
| 016 | `016_tutor_discovery_and_replacement_workflow.sql`    | 8.0 KB  | `tutor_replacement_candidates`, replacement SLA sweepers                                                                                    | Applied & Verified |
| 017 | `017_tutor_profile_localization.sql`                  | 3.0 KB  | Bilingual profile fields (`bio_bn`, `experience_bn`, `qualifications_bn`)                                                                   | Applied & Verified |
| 018 | `018_profile_avatar_urls.sql`                         | 1.0 KB  | S3/local avatar URL storage keys on user profiles                                                                                           | Applied & Verified |
| 019 | `019_booking_scheduling_integrity.sql`                | 5.5 KB  | PostgreSQL exclusion constraints (`btree_gist`) preventing tutor overlapping sessions                                                       | Applied & Verified |
| 020 | `020_bilingual_schema_cleanup.sql`                    | 2.4 KB  | Normalized taxonomy localization and fallback triggers                                                                                      | Applied & Verified |
| 021 | `021_review_bilingual_fields.sql`                     | 1.3 KB  | Bilingual review feedback and moderation responses                                                                                          | Applied & Verified |
| 022 | `022_payments_escrow_payouts.sql`                     | 15.0 KB | Escrow state machine, payment gateway webhook logs, commission tiers                                                                        | Applied & Verified |
| 023 | `023_learning_lms.sql`                                | 8.6 KB  | `lesson_plans`, `learning_materials`, `learning_goals`                                                                                      | Applied & Verified |
| 024 | `024_disputes_and_safeguarding.sql`                   | 3.8 KB  | Safety protective holds, dispute evidence attachments                                                                                       | Applied & Verified |
| 025 | `025_safeguarding_case_management.sql`                | 5.2 KB  | Safeguarding incident tracking, guardian notification linkages                                                                              | Applied & Verified |
| 026 | `026_realtime_messaging_and_attachments.sql`          | 0.9 KB  | Message attachments linkage to `file_assets`, read receipt timestamps                                                                       | Applied & Verified |
| 027 | `027_organizations_and_platform_governance.sql`       | 3.5 KB  | `organizations`, `organization_members`, `organization_invitations`                                                                         | Applied & Verified |
| 028 | `028_search_performance_and_production_readiness.sql` | 1.8 KB  | Trigram GIN indexes (`pg_trgm`) on tutor bio/names, location composite index                                                                | Applied & Verified |
| 029 | `029_beta_testing_and_feedback.sql`                   | 1.6 KB  | `feedback`, `beta_testers`, feedback resolution tracking                                                                                    | Applied & Verified |
| 030 | `030_product_analytics_events.sql`                    | 2.8 KB  | `product_analytics_events` table partitioning and retention triggers                                                                        | Applied & Verified |

---

## 3. Financial Invariant & Double-Entry Ledger

The financial ledger table `ledger_entries` enforces double-entry accounting:
$$\sum \text{Debit Poisha} = \sum \text{Credit Poisha}$$

- **Accounts**:
  - `user_wallet`: Student escrow deposits and tutor earned balances.
  - `platform_escrow`: Holds student funds until tutor completes sessions.
  - `platform_revenue`: Realized platform commission (e.g. 10%).
  - `gateway_clearing`: Pending SSLCommerz/bKash/Nagad settlement funds.
- **Transactional Boundary**: All ledger mutations occur inside a single PostgreSQL transaction (`queryRunner.startTransaction()`). Any imbalance throws `LedgerIntegrityViolationException` and rolls back immediately.

---

## 4. Transactional Outbox Pattern

To prevent dual-write split-brain between database state and external messaging services:

1. Mutating services insert a row into `outbox` table in the same transaction as entity changes.
2. `OutboxWorkerService` polls with:
   ```sql
   SELECT * FROM outbox
   WHERE status = 'pending'
   ORDER BY created_at ASC
   LIMIT 50
   FOR UPDATE SKIP LOCKED;
   ```
3. Guarantees zero locking conflicts in multi-worker environments and strictly at-least-once delivery.

---

## 5. Upcoming Migrations (Planned in Phase 06)

- **`031_file_assets_foreign_keys.sql` (`DB-001`)**: Add foreign keys from `file_assets` to `tutor_verification_documents` and `booking_messages`.
- **`032_search_indexes.sql` (`DB-002`)**: Add composite indexes on `tutors(hourly_rate_poisha, rating_average)` and `sessions(tutor_user_id, start_time)`.
