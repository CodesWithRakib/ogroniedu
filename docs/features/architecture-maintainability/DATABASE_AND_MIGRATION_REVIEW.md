# Database Schema & Migration Review — OgroniEdu (অগ্রণী এডু)

## 1. Schema & Migration Architecture

OgroniEdu utilizes PostgreSQL 18 with 30 sequentially numbered SQL migrations in `packages/database/src/migrations/`. Migrations are raw SQL files executed by a custom migration runner (`packages/database/src/migration-runner.ts`) that records applied versions in the `schema_migrations` table with transaction wrapping and advisory locks.

---

## 2. Complete Migration Catalog (001–030)

| Migration | File | Domain | Key Tables / Objects Introduced |
| :---: | :--- | :--- | :--- |
| **001** | `001_initial_schema.sql` | Core Identity | `users`, `student_profiles`, `tutor_profiles`, `sessions` |
| **002** | `002_auth_verification_codes.sql` | Auth Security | `verification_codes`, `refresh_tokens`, `login_audit` |
| **003** | `003_learning_management.sql` | LMS & Lessons | `lesson_plans`, `assignments`, `assignment_submissions`, `progress_reports` |
| **004** | `004_payments_and_ledger.sql` | Finance & Ledger | `payment_orders`, `ledger_journals`, `ledger_entries`, `payouts` |
| **005** | `005_notifications_and_communication.sql` | Messaging | `notifications`, `notification_deliveries`, `notification_preferences`, `booking_messages` |
| **006** | `006_reviews_and_trust_safety.sql` | Reviews & Trust | `reviews`, `safety_reports`, `tutor_replacements` |
| **007** | `007_admin_and_operations.sql` | Back Office | `audit_logs`, `system_settings`, `feature_flags` |
| **008** | `008_analytics_and_reporting.sql` | BI & Reporting | `platform_daily_metrics`, `analytics_events` |
| **009** | `009_security_and_privacy_hardening.sql` | Security & GDPR | `data_export_requests`, `account_deletion_requests` |
| **010** | `010_performance_and_load_indexes.sql` | Query Tuning | Compound B-tree indexes for bookings, sessions, and notifications |
| **011** | `011_session_cancellation_tracking.sql` | Scheduling | Cancellation reason codes, penalty tracking |
| **012** | `012_support_tickets.sql` | Operations | `support_tickets`, `support_ticket_messages` |
| **013** | `013_auth_onboarding_and_magic_links.sql` | Auth Onboarding | Magic link token storage, onboarding wizard step trackers |
| **014** | `014_tutor_verification_dossier.sql` | Tutor Vetting | `tutor_verification_levels`, `tutor_verification_audits` |
| **015** | `015_academic_streams_and_institutions.sql` | Taxonomy | `categories`, `subjects`, `curriculum_grades`, `track_levels` |
| **016** | `016_tutor_discovery_and_replacement_workflow.sql` | Matching | Saved tutors, replacement candidate matching queues |
| **017** | `017_tutor_profile_localization.sql` | i18n | `headline_bn`, `bio_bn`, bilingual taxonomy fields |
| **018** | `018_profile_avatar_urls.sql` | Media | Avatar URLs, signed storage asset pointers |
| **019** | `019_booking_scheduling_integrity.sql` | Scheduling Guard | GiST exclusion constraint `ex_tutor_session_overlap` on `tutor_sessions` |
| **020** | `020_bilingual_schema_cleanup.sql` | i18n Cleanup | Redundant monolingual column removal, fallback triggers |
| **021** | `021_review_bilingual_fields.sql` | Trust i18n | Review comments bilingual translations and moderation status |
| **022** | `022_payments_escrow_payouts.sql` | Escrow Finance | Escrow hold statuses, automated milestone release triggers |
| **023** | `023_learning_lms.sql` | LMS Polish | Homework submission attachment limits, rubrics |
| **024** | `024_disputes_and_safeguarding.sql` | Trust & Safety | `booking_disputes`, dispute evidence attachments |
| **025** | `025_safeguarding_case_management.sql` | Child Safeguarding | Protective hold flags, confidential investigation case logs |
| **026** | `026_realtime_messaging_and_attachments.sql` | Chat & Media | Chat message encryption markers, attachment URLs |
| **027** | `027_organizations_and_platform_governance.sql` | Multi-Tenancy | `organizations`, `organization_members`, tenant-scoped roles |
| **028** | `028_search_performance_and_production_readiness.sql` | Search Indexing | Full-text search (tsvector) and trigram indexes on tutors |
| **029** | `029_beta_testing_and_feedback.sql` | UAT Beta | `beta_feedback`, issue category triage tagging |
| **030** | `030_product_analytics_events.sql` | Growth BI | `product_analytics_events`, `v_daily_product_funnel` |

---

## 3. High-Integrity Persistence Patterns

1. **Physical GiST Overlap Protection**:
   ```sql
   ALTER TABLE tutor_sessions 
   ADD CONSTRAINT ex_tutor_session_overlap 
   EXCLUDE USING gist (
     tutor_user_id WITH =,
     tstzrange(start_time, end_time, '[)') WITH &&
   ) WHERE (status NOT IN ('cancelled', 'rescheduled'));
   ```
   Ensures impossible double-booking of any tutor even during high-concurrency race conditions.
2. **Double-Entry Ledger Balancing**:
   The `ledger_entries` table requires balanced debit and credit entries tagged to a parent `ledger_journal`.
3. **Catastrophic Cold Recovery Drill (BCDR)**:
   Tested and verified in `packages/database/test/bcdr-recovery.spec.ts`. Simulates a complete database wipe and re-executes all 30 migrations consecutively from scratch, verifying schema parity in under 6 seconds.
