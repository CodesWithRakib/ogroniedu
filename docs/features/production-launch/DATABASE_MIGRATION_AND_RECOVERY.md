# OgroniEdu — Database Migration, Safety & Recovery Guide

## 1. Schema Management Philosophy

Database migrations in OgroniEdu are governed by strict safety principles:
1. **Zero-Downtime Compatibility:** Every migration must be non-blocking. Never lock active production tables with long-running operations.
2. **Idempotency:** Every migration script must be safe to re-run using `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`.
3. **Transactional Boundary:** Each migration executes inside its own dedicated database transaction (`BEGIN ... COMMIT`). If any statement fails, the entire transaction is rolled back, leaving the database clean.
4. **Expand / Contract Lifecycle:**
   - **Expand:** Add new nullable columns, create new tables, and build indexes concurrently.
   - **Deploy Code:** Deploy application code that reads and writes to new schema structures.
   - **Contract:** Drop obsolete columns or add strict `NOT NULL` constraints in subsequent releases after old code versions are decommissioned.

---

## 2. Complete Inventory of Migrations (001 – 029)

| Migration # | Filename | Scope & Capabilities Introduced | Status |
| :--- | :--- | :--- | :--- |
| `001` | `001_initial_schema.sql` | Core users, roles, auth tokens, profiles, student/tutor schemas | Applied |
| `002` | `002_auth_verification_codes.sql` | OTP verification codes, rate limiting tracking | Applied |
| `003` | `003_learning_management.sql` | Courses, subjects, sessions, learning modules | Applied |
| `004` | `004_payments_and_ledger.sql` | Ledger entries, escrow balance, transaction histories | Applied |
| `005` | `005_notifications_and_communication.sql` | Realtime notifications, preferences, delivery channels | Applied |
| `006` | `006_reviews_and_trust_safety.sql` | Reviews, ratings, verified bookings, safety reports | Applied |
| `007` | `007_admin_and_operations.sql` | Admin operations, audit logging, system settings | Applied |
| `008` | `008_analytics_and_reporting.sql` | Aggregated analytics tables, platform KPIs | Applied |
| `009` | `009_security_and_privacy_hardening.sql` | Security hardening, account suspension flags | Applied |
| `010` | `010_performance_and_load_indexes.sql` | High-throughput composite search and filter indexes | Applied |
| `011` | `011_session_cancellation_tracking.sql` | Session reschedule/cancellation tracking | Applied |
| `012` | `012_support_tickets.sql` | Support ticket intake, triage, and escalation | Applied |
| `013` | `013_auth_onboarding_and_magic_links.sql` | Magic link passwordless authentication | Applied |
| `014` | `014_tutor_verification_dossier.sql` | Tutor academic dossier, background checks | Applied |
| `015` | `015_academic_streams_and_institutions.sql` | Bangladeshi academic curriculum and streams | Applied |
| `016` | `016_tutor_discovery_and_replacement_workflow.sql` | Tutor replacement guarantee cases | Applied |
| `017` | `017_tutor_profile_localization.sql` | Bengali and English localization profiles | Applied |
| `018` | `018_profile_avatar_urls.sql` | User avatar URLs in profiles | Applied |
| `019` | `019_booking_scheduling_integrity.sql` | Booking time-slot overlapping constraint checks | Applied |
| `020` | `020_bilingual_schema_cleanup.sql` | Clean bilingual data structures | Applied |
| `021` | `021_review_bilingual_fields.sql` | Localized review attributes and feedback | Applied |
| `022` | `022_payments_escrow_payouts.sql` | Escrow release workflows, payout methods, refunds | Applied |
| `023` | `023_learning_lms.sql` | LMS homework, assignments, submissions, grading | Applied |
| `024` | `024_disputes_and_safeguarding.sql` | Dispute cases and resolution workflows | Applied |
| `025` | `025_safeguarding_case_management.sql` | Safeguarding incident tracking, audit trails | Applied |
| `026` | `026_realtime_messaging_and_attachments.sql` | Booking chat messages and attachment metadata | Applied |
| `027` | `027_organizations_and_platform_governance.sql` | Multi-tenant organization support and RBAC | Applied |
| `028` | `028_search_performance_and_production_readiness.sql` | Search vector indexing and performance indexes | Applied |
| `029` | `029_beta_testing_and_feedback.sql` | Beta feedback intake, satisfaction ratings | Applied |

---

## 3. Migration Runner Implementation

The runner is defined in `packages/database/src/migration-runner.ts`. It executes pending migrations sequentially and records successful executions in `schema_migrations`:

```typescript
// Transaction isolation per migration
const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

await client.query('BEGIN');
try {
  await client.query(sql);
  await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
  await client.query('COMMIT');
  executed.push(file);
} catch (err) {
  await client.query('ROLLBACK');
  throw new Error(`Failed to apply migration ${file}: ${(err as Error).message}`);
}
```

---

## 4. Disaster Recovery & Restoration Procedures

### 4.1 Daily Snapshot & Continuous WAL Archiving
- **Point-In-Time Recovery (PITR):** Neon Serverless PostgreSQL / Cloud PostgreSQL automatically archives write-ahead logs (WAL) enabling point-in-time recovery up to 7 days.
- **Logical Dump Backup:** A daily cron runs `pg_dump` to capture a consistent logical snapshot stored in an encrypted offsite S3 bucket:

```bash
# Automated daily logical backup command
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="ogroniedu_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 4.2 Database Restoration Runbook
If a catastrophic data corruption event occurs:

1. **Stop Application Containers:** Immediately scale down API instances to prevent further writes:
   ```bash
   docker service scale ogroniedu_api=0
   ```
2. **Restore Target Database:**
   - On Neon: Restore to a new branch or point in time using Neon Console / CLI.
   - On standard PostgreSQL:
     ```bash
     pg_restore --clean --if-exists --dbname="$DATABASE_URL" ogroniedu_backup_target.dump
     ```
3. **Verify Integrity:** Run the status check:
   ```bash
   node packages/database/scripts/run-migrations.mjs
   ```
4. **Restart Application Containers:**
   ```bash
   docker service scale ogroniedu_api=3
   ```
5. **Verify Health:** Run `node scripts/smoke-test.mjs --target production`.
