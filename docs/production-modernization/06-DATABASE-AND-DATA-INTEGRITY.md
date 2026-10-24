# OgroniEdu — Database and Data Integrity

**Status:** VERIFIED (2026-10-24)  
**Scope:** Entities, relations, migrations, indexes, transactions. Accurate as of commit `32712a9`.

---

## 1. Database Summary

| Item | Value |
|---|---|
| Database | PostgreSQL 18 |
| Schema | `public` |
| Tables | 78 |
| Views | 2 |
| Migration files | 30 (001–030) |
| Total relations | 80 |
| Migration naming | `NNN_description.sql` (sequential, 3-digit) |

---

## 2. Migration Files Inventory

| # | File | Description |
|---|---|---|
| 001 | `initial_schema.sql` | Core tables: users, roles, user_roles, sessions, etc. |
| 002 | `add_taxonomy.sql` | Subject, education_level, curriculum, stream, institution |
| 003 | `add_tutor_profile.sql` | tutor_profiles, qualifications, subjects, service_areas, availability, blocked_periods |
| 004 | `add_booking_requests.sql` | bookings, booking_status_history |
| 005 | `add_sessions.sql` | sessions, session_series, series_bookings |
| 006 | `add_learning.sql` | assignments, submissions, attendance, progress_reports, lesson_plans, learning_materials |
| 007 | `add_payments.sql` | payment_orders, ledger_entries, invoices, payouts, refunds, commission_policy |
| 008 | `add_notifications.sql` | notifications, notification_preferences, outbox |
| 009 | `add_trust.sql` | safety_reports, disputes, reviews, tutor_replacements |
| 010 | `add_guardians.sql` | guardian_student_links, guardian_relations |
| 011 | `add_files.sql` | file_assets |
| 012 | `add_organizations.sql` | organizations, organization_members, organization_invitations |
| 013 | `add_onboarding.sql` | onboarding_steps, user_onboarding_status |
| 014 | `add_analytics.sql` | product_analytics_events, analytics_funnel_daily |
| 015 | `add_feedback.sql` | feedback |
| 016 | `add_support.sql` | support_tickets |
| 017 | `add_taxonomy_extensions.sql` | Locations, subject relationships |
| 018 | `add_verification_dossier.sql` | tutor_verification_levels, tutor_verification_documents |
| 019 | `add_session_booking_indexes.sql` | GiST indexes for overlap exclusion, partial unique indexes |
| 020 | `add_audit_logs.sql` | audit_logs |
| 021 | `add_advisory_lock_keys.sql` | Advisory lock constants |
| 022 | `add_ledger_integrity.sql` | Balance invariants, triggers |
| 023 | `add_rate_limiting.sql` | Rate limiter state table |
| 024 | `add_learning_goals.sql` | learning_goals |
| 025 | `add_learning_reports.sql` | learning_reports |
| 026 | `add_taxonomy_admin.sql` | Admin-managed taxonomy tables |
| 027 | `add_payment_webhook_security.sql` | Webhook signature verification columns |
| 028 | `add_session_no_show.sql` | no_show status in sessions |
| 029 | `add_impersonation.sql` | impersonation_sessions |
| 030 | `product_analytics_events.sql` | Analytics event table optimizations |

---

## 3. Key Entity Relationships

### 3.1 User Hierarchy

```
users (1) ──< (N) user_roles >── (1) roles
users (1) ──< (N) tutor_profiles
users (1) ──< (N) guardian_student_links (self-ref: users ↔ users)
users (1) ──< (N) organization_members
users (1) ──< (N) file_assets
users (1) ──< (N) audit_logs
```

### 3.2 Booking & Session Core

```
bookings (1) ──< (N) booking_status_history
bookings (1) ──< (N) payment_orders
bookings (1) ──< (N) sessions
sessions (1) ──< (N) session_status_history
session_series (1) ──< (N) series_bookings
```

### 3.3 Financial Ledger (Double-Entry)

```
payment_orders (1) ──< (N) ledger_entries
invoices (1) ──< (N) ledger_entries
payouts (1) ──< (N) ledger_entries
refunds (1) ──< (N) ledger_entries
commission_policy (1) ──< (N) ledger_entries (via policy_id)
```

**Chart of Accounts** (validated in `LedgerService`):
- `1010_CASH_SSLCOMMERZ`
- `1020_CASH_BKASH`
- `2010_STUDENT_ESCROW`
- `2000_TUTOR_PAYABLE`
- `4000_PLATFORM_REVENUE`

**Invariant:** Σ debits == Σ credits per journal entry. Enforced at application level + trigger.

### 3.4 Trust & Safety

```
safety_reports (1) ──< (N) safety_report_messages
safety_reports (1) ──< (N) safety_actions
tutor_replacements (1) ──< (N) replacement_candidates
reviews (1) ──< (N) tutor_reply
disputes (1) ──< (N) dispute_messages
```

### 3.5 Learning

```
assignments (1) ──< (N) submissions
submissions (1) ──< (N) submission_revisions
lesson_plans (1) ──< (N) lesson_plan_sessions
learning_materials (1) ──< (N) booking_learning_materials
```

---

## 4. Critical Indexes & Constraints

| Table | Index / Constraint | Purpose |
|---|---|---|
| `bookings` | `uq_bookings_active_request` (partial unique) | Prevent duplicate open requests per (student, tutor, subject) |
| `sessions` | GiST exclusion index on `tutor_id` + `tsrange(start_at, end_at)` | Prevent double-booking tutor active slots |
| `outbox` | `uq_outbox_idempotency` | Idempotent event dispatch |
| `series_bookings` | `uq_series_booking_idempotency` | Idempotent recurring series generation |
| `sessions` | `ix_sessions_tutor_start` (btree) | Tutor calendar queries |
| `payment_orders` | `ix_payment_orders_user_status` | Student payment history |
| `notifications` | `ix_notifications_user_unread` | Unread count queries |
| `tutor_verification_documents` | `ix_verification_docs_tutor_level` | Admin queue queries |

---

## 5. Transaction Boundaries

| Operation | Transaction Scope | Advisory Lock |
|---|---|---|
| Booking creation + tutor response | Single DB transaction (BookingService) | None |
| Payment order creation | Single DB transaction (PaymentsService) | None |
| Escrow release + ledger entry | Single DB transaction (PaymentsService.settleMilestone) | None |
| Session scheduling (conflict check) | Single DB transaction (SchedulingService.scheduleSession) | None |
| Booking expiry sweep | Single DB transaction per sweep cycle | `BOOKING_EXPIRY_LOCK_KEY` |
| Tutor verification expiry | Single DB transaction per sweep | `TUTOR_VERIFICATION_LOCK_KEY` |
| Replacement case sweep | Single DB transaction per sweep | `REPLACEMENT_SWEEP_LOCK_KEY` |
| Outbox event write + dispatch | Event written in same tx as business state | None (poll-based) |

---

## 6. Concurrency & Idempotency Risks

| Risk | Mitigation |
|---|---|
| Double-booking tutor | GiST exclusion index + application-level `assertNoTutorOverlap` |
| Duplicate payment order | Idempotency key (`uq_payment_orders_idempotency`) |
| Duplicate webhook processing | `uq_outbox_idempotency` + provider signature verification |
| Duplicate recurring series | `uq_series_booking_idempotency` |
| Race in booking expiry sweep | PostgreSQL advisory lock (`pg_try_advisory_lock`) |
| Race in tutor verification sweep | PostgreSQL advisory lock |
| Race in replacement sweep | PostgreSQL advisory lock |

---

## 7. Soft Delete Pattern

Most entities use soft delete via `deleted_at` timestamp + `is_deleted` boolean:

| Table | Soft Delete |
|---|---|
| `users` | `deleted_at`, `is_deleted` |
| `tutor_profiles` | `deleted_at` |
| `bookings` | `deleted_at` (status = `deleted`) |
| `sessions` | `deleted_at` |
| `organizations` | `deleted_at` |
| `taxonomy` tables | `deleted_at` |

**Never hard-delete** production data. Migrations are the source of truth.

---

## 8. Data Retention & Sensitive Information

| Data Type | Retention | Sensitive Fields |
|---|---|---|
| User accounts | Indefinite (soft delete) | `password_hash`, `email`, `phone`, `nid_number` |
| Tutor verification docs | Indefinite | NID images, degree certificates |
| Payment data | 7 years (regulatory) | Card numbers (never stored), bKash/Nagad transaction IDs |
| Chat messages | 2 years | Phone/payment/link content (redacted at send) |
| Audit logs | 3 years | PII redacted in logs |
| Safety reports | Indefinite | Child data, reporter identity |

---

## 9. Known Data Integrity Gaps

| Gap | Location | Remediation |
|---|---|---|
| `file_assets` metadata-only storage (no bytes) | `files.service.ts`, migration 011 | RLD-001 — persist bytes or re-label |
| `product_analytics_events` no partition | migration 030 | Future: partition by month |
| No foreign key from `file_assets` to specific entity | migration 011 | Polymorphic via `reference_type` + `reference_id`; consider adding explicit FKs |

---

*End of `06-DATABASE-AND-DATA-INTEGRITY.md`.*