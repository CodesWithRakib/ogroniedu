# Phase 07: Safeguarding & Complaint Management — Baseline Audit

**Document Identifier:** `AUDIT-SAFEGUARDING-001`  
**Date:** October 20, 2026  
**Platform:** OgroniEdu (অগ্রণী এডু)  
**Governing Standard:** The Children Act, 2013 (শিশু আইন, ২০১৩), The Contract Act, 1872, Child Safeguarding & Legal Minor Protection Policy `v1.0-bd-minor-consent`.

---

## 1. Scope & Objective

This audit establishes the baseline architectural, database, security, and authorization state of the OgroniEdu monorepo for the end-to-end implementation of the **Safeguarding and Complaint-Management System**.

The system must protect learners, especially minors under Bangladeshi law, while providing transparent dispute adjudication, robust evidence protection, and conflict-of-interest controls without compromising financial invariants or leaking confidential allegations to accused parties.

---

## 2. Existing Architecture & Capability Inventory

### 2.1 Existing Models & Database Entities
1. **`safety_reports` (`apps/api/src/modules/trust/entities/safety-report.entity.ts`):**
   - Stores user-submitted incident reports.
   - Columns: `id`, `reporter_user_id`, `reported_user_id`, `booking_id`, `session_id`, `category`, `severity`, `description`, `evidence_asset_ids`, `status`, `escalation_level`, `resolution_notes`, `resolved_by`, `resolved_at`, `policy_version`.
   - *Gaps identified:* Missing investigator assignment (`assigned_to`), confidentiality flags (`is_confidential`), incident occurrence timestamp (`incident_date`), preferred safe contact method (`preferred_contact_method`), case messages, and case access audit history.
2. **`booking_disputes` (`apps/api/src/modules/trust/entities/booking-dispute.entity.ts`):**
   - Implemented in Phase 07 baseline. Links disputes directly to `bookings` and `payment_refunds`.
   - State machine: `opened` -> `under_review` -> `resolved_refund` / `resolved_partial_refund` / `resolved_tutor_upheld` / `resolved_replacement` / `dismissed`.
   - Freezes milestone escrow settlement in `SettlementService.settleMilestone()`.
3. **`support_tickets` (`apps/api/src/modules/support/entities/support-ticket.entity.ts`):**
   - Unauthenticated/authenticated public inquiries and technical tickets.
   - Categories: `general`, `account`, `billing`, `tutor_onboarding`, `technical`, `complaint`, `other`.
4. **`tutor_replacement_cases` (`apps/api/src/modules/trust/entities/tutor-replacement-case.entity.ts`):**
   - 48-Hour tutor replacement guarantee cases.
5. **`reviews` (`apps/api/src/modules/trust/entities/review.entity.ts`):**
   - Public star ratings and textual reviews with moderation controls.

### 2.2 Roles & Permission Infrastructure
- **Role Hierarchy (`packages/contracts/src/` & `apps/api/src/common/auth/`):**
  - Roles supported: `student`, `guardian`, `tutor`, `admin`, `super_admin`, `support_agent`, `compliance_reviewer`, `organization_owner`, `organization_staff`.
  - Roles are persisted in `user_roles` with `revoked_at IS NULL` active status checks.
  - Role utility: `isAdminRole()`, `isTutor()`, `isGuardian()`, `isStudent()`.
  - *Gaps identified:* Fine-grained ABAC for confidential reports. Currently, an accused tutor could technically call general report endpoints if not strictly filtered by ABAC; must ensure accused users receive HTTP 404 or 403 when requesting confidential cases filed against them.

### 2.3 Tutor Suspension & Verification Controls
- **Tutor Profiles (`tutor_profiles`):**
  - `safety_hold_status`: (`clear`, `under_investigation`, `safety_hold`).
  - `safety_hold_reason`: Textual justification.
  - Enforced in `TutorSearchService` (unpublishes tutor from discovery) and `SessionReschedulingService.startSession()` (blocks classroom launch).

### 2.4 Financial & Escrow Integration
- **Escrow Freeze Invariant:**
  - `SettlementService.settleMilestone()` verifies `booking.status !== 'disputed'`.
  - Disputed milestones cannot be disbursed to tutor balances while under dispute.
- **Refund Processing:**
  - `RefundsService.requestAndApproveForAdmin()` posts balanced double-entry ledger transactions to the PostgreSQL ledger without bypassing validation.

### 2.5 Private Documents & Evidence Storage
- **File Assets (`apps/api/src/modules/files/`):**
  - Manages asset metadata (`file_assets` table) and storage adapters (Local disk / S3).
  - *Gaps identified:* Evidence attached to safeguarding cases requires case-level authorization before issuing secure download links, blocking accused parties and logging access in case audit trails.

### 2.6 Centralized Notifications & Realtime Gateway
- Centralized `NotificationService` and `NotificationGateway` (Socket.IO).
- Templates in `packages/contracts/src/notification-registry.ts`.
- Outbox pattern via `outbox_events` and worker.
- *Gaps identified:* Generic wording required for sensitive safeguarding alerts to prevent leaking sensitive allegations in email subject lines or push notifications.

---

## 3. Classification of Concerns & Workflows

To avoid misrouting, the platform explicitly categorizes cases into five distinct operational workflows:

| Type | Nature | Primary Queue | SLA | Escrow Impact |
|:---|:---|:---|:---:|:---:|
| **1. General Service Complaint** | Punctuality, curriculum mismatch, communication issues. | Support Desk | 48 Hours | None (unless escalated) |
| **2. Booking Dispute** | Tutor no-show, unfulfilled hours, missed sessions. | Dispute Queue | 24 Hours | **Escrow Frozen** |
| **3. Financial Dispute** | Double charge, billing discrepancy, payout failure. | Finance Ops | 24 Hours | Transaction Held |
| **4. Safeguarding Concern** | Inappropriate conduct, coercion, boundary violations. | Safeguarding Desk | 4 Hours | Tutor Safety Hold |
| **5. Urgent Child Safety** | Child abuse, grooming, harassment, physical threat. | **Emergency Triage** | **Immediate (<1h)** | **Full Safety Freeze & Hotlines** |

---

## 4. Key Gaps & Implementation Requirements

1. **Case Domain Expansion:**
   - Case messages distinguishing internal investigator notes from reporter messages.
   - Immutable audit trail (`safety_case_events`) tracking status transitions, evidence access, and investigator assignment.
   - Explicit immediate safety actions (`safety_actions`) recording target user, action type, scope, reason, and revoker.
2. **Conflict of Interest & Assignment Controls:**
   - Prevent self-assignment or resolution by any investigator/admin implicated in a report.
3. **Confidentiality & Privacy:**
   - Strict ABAC ensuring tutors, guardians, or organization staff cannot see confidential reports they are not authorized to view.
   - Non-revealing error responses (HTTP 404/403) when probing sensitive case IDs.
4. **Security & Authorization Verification:**
   - 12 mandatory security tests, unit tests, integration tests, and 5 comprehensive E2E workflow specs.
