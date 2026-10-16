# OgroniEdu — Database Design & Schema Architecture

**Database Engine:** PostgreSQL 18 (Local) / 16+ (Production Target)  
**Extensions:** `pgcrypto`, `btree_gist`  
**Migration Strategy:** Versioned, Immutable SQL Migrations (Source of Truth)  
**ORM:** TypeORM with schema synchronization **strictly disabled** in production

---

## 1. Architectural Principles

1. **UUIDv4 Primary Keys:** All primary keys utilize `gen_random_uuid()` to prevent ID enumeration attacks and simplify distributed data ingestion.
2. **Strict Timezone Integrity:** All timestamps are defined as `timestamptz` (stored in UTC). Conversions to `Asia/Dhaka` occur at presentation layer.
3. **Monetary Precision:** Stored exclusively as 64-bit integers (`bigint`) representing minor currency units (poisha = BDT * 100). Floating-point numeric columns are strictly forbidden for currency.
4. **PostgreSQL GiST Exclusion Constraints:** Time conflict prevention for scheduled lessons utilizes native PostgreSQL GiST range indexing (`tstzrange`) to enforce physical impossibility of double-booking at the storage engine level.
5. **Auditing & Soft Deletes:** Sensitive resources feature `created_at`, `updated_at`, and nullable `deleted_at`. High-security entities (financial journals, audit logs, attendance records) are strictly append-only.

---

## 2. Domain Entities & Relationships

### 2.1 Identity, Access & Family Links

- `users`: Core account details, credentials, phone/email, verification status.
- `roles`, `permissions`, `user_roles`, `role_permissions`: Strict RBAC tables.
- `auth_sessions`: Active login sessions, refresh token hashes, client device footprints.
- `guardian_student_links`: Many-to-many relationship linking a parent user to child student users with verification status and parental consent version.
- `student_profiles`: School grade/class, curriculum, stream, district, institution.
- `tutor_profiles`: Biography, hourly rate, teaching modes, verification status, publication status.

### 2.2 Academic Catalog & Tutor Specialization

- `curricula`: Bangla Medium, English Medium, English Version, Madrasah Board.
- `education_levels`: Class 1 to Class 12, SSC, HSC, University Admission.
- `subjects`: Bangla, English, Mathematics, Higher Math, Physics, Chemistry, Biology, Accounting, ICT, etc.
- `tutor_subjects`: Tutor's verified teaching subjects, levels, and specialized rates.
- `tutor_service_areas`: Geographical districts, upazilas, and home tutoring radius (km).
- `tutor_availability`: Weekly recurring time slots (0=Sunday to 6=Saturday) with start and end times in Asia/Dhaka.
- `tutor_blocked_periods`: Specific dates/ranges when the tutor is unavailable.

### 2.3 Bookings, Sessions & Concurrency Control

- `tutor_requests`: Initial booking inquiry from guardian/student to tutor.
- `bookings`: Formal service agreement tracking status (`requested` -> `confirmed` -> `completed`).
- `booking_sessions`: Individual lesson instances within a booking.
  - **Exclusion Constraint:**
    ```sql
    ALTER TABLE booking_sessions
    ADD CONSTRAINT ex_tutor_session_overlap
    EXCLUDE USING gist (
      tutor_user_id WITH =,
      tstzrange(starts_at, ends_at, '[)') WITH &&
    )
    WHERE (status IN ('scheduled', 'in_progress'));
    ```
- `session_attendance`: Records whether student attended (`present`, `late`, `absent`, `excused`).

### 2.4 Learning Management

- `assignments`: Homework issued by tutor with instructions, due date, and attachments.
- `assignment_submissions`: Student submission with answer text, file assets, and tutor grading feedback.
- `assessments` & `assessment_results`: Quizzes, practice tests, and scored evaluations.
- `progress_reports`: Bi-weekly structured evaluations accessible by guardians.

### 2.5 Double-Entry Financial Ledger & Payments

- `payment_orders`: Cryptographically signed gateway checkout requests.
- `payment_transactions`: Raw verified transaction receipts from SSLCOMMERZ/bKash/Nagad.
- `ledger_accounts`: Standard Chart of Accounts (Asset, Liability, Equity, Revenue, Expense).
- `ledger_journals`: Immutable transaction headers linked to domain events with idempotency keys.
- `ledger_entries`: Debits and credits per journal. Invariant: `SUM(debits) = SUM(credits)`.
- `refunds` & `tutor_payouts`: Audited disbursements with gateway tracking.

### 2.6 Real-Time Notifications & Outbox

- `notifications`: Durable in-app notification records with title, body, event type, read status, and payload.
- `notification_deliveries`: Delivery attempt tracking (`in_app`, `email`, `sms`, `push`, `whatsapp`).
- `outbox_events`: Transactional outbox buffer for asynchronous reliable dispatch.
- `audit_logs`: Append-only security audit trail recording actor, action, resource, IP hash, and metadata.
- `idempotency_keys`: Locks and cached responses for API idempotency.
