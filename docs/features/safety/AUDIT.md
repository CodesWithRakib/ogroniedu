# Phase 07 — Child Safety, Safeguarding, Complaints & Dispute Resolution Audit

> **Scope:** Child safety reporting, automated emergency escalation, Bangladesh statutory compliance (The Children Act 2013 / শিশু আইন ২০১৩, Contract Act 1872), guardian consent and minor PII redaction, booking disputes and escrow freeze, complaint investigation lifecycle, Tutor Replacement Guarantee (FR-011), review moderation and rebuttal, and support ticket triage.
>
> **Audited Against:** Working tree on branch `main`, active PostgreSQL 18 database `ogroniedu_dev`, backend API (`apps/api`), frontend web (`apps/web`), and existing policy documentation (`docs/policies/`).

---

## 1. System & Architecture Overview

| Layer         | Implementation & Stack                                  | Status & Role in Phase 07                                                                                                                                                                                                      |
| :------------ | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API**       | NestJS 12, TypeORM 1.1 (`apps/api`)                     | Hosts `trust`, `guardians`, `support`, `bookings`, `payments`, and `admin` modules. Global validation pipe (`whitelist`, `forbidNonWhitelisted`), standardized metadata envelope (`requestId`, `timestamp`, `path`, `method`). |
| **Web**       | Next.js 16 App Router, React 19, RTK Query (`apps/web`) | Bilingual (`[locale]` segment), Tailwind CSS + custom design system tokens, role dashboards (`student`, `guardian`, `tutor`, `admin`).                                                                                         |
| **Database**  | PostgreSQL 18 on port 5432 (`ogroniedu_dev`)            | 23 raw SQL migrations applied. Strict constraints, foreign keys, unique indexes, and audit logs.                                                                                                                               |
| **Contracts** | Zod schemas (`packages/contracts/src`)                  | Shared DTO validation contracts between API and Web clients.                                                                                                                                                                   |
| **Testing**   | Vitest (API + Web), Playwright (E2E)                    | Strict isolation, mock repositories for unit tests, end-to-end browser automation with `chrome-devtools-mcp`.                                                                                                                  |

---

## 2. Inventory of Existing Safety, Dispute & Safeguarding Artifacts

| Component                       | Database Table / Entity                                                                        | API Service & Controller                                                                                   | Frontend Route / Component                                                                      | Operational Verdict                                                                                                                                                                                                                                           |
| :------------------------------ | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Safety Reports**              | `safety_reports`<br>`SafetyReportEntity`                                                       | `SafetyReportsService`<br>`SafetyReportsController`<br>(`GET/POST/PATCH /api/v1/safety-reports`)           | `/(dashboard)/safety-reports`<br>`SafetyReportModal`<br>`EmergencySosModal`                     | **Operational.** Captures category, severity, description, evidence. Auto-escalates `child_safety` / `critical` to `urgent_child_safety`. Missing: session linking and direct tutor protective intervention.                                                  |
| **Guardian Minor Consent**      | `guardian_student_links`<br>`GuardianStudentLinkEntity`                                        | `GuardianAccessService`<br>`GuardiansController`<br>(`GET/POST/DELETE /api/v1/guardians/children`)         | `/dashboard/guardian/children`<br>`GuardianChildrenManager`                                     | **Operational.** Implements `POL-SEC-004` (`v1.0-bd-minor-consent`) under Children Act 2013. ABAC relationship scoping prevents cross-family data leaks.                                                                                                      |
| **Tutor Replacement Guarantee** | `tutor_replacement_cases`<br>`TutorReplacementCaseEntity`<br>`TutorReplacementCaseEventEntity` | `TutorReplacementService`<br>`TutorReplacementController`<br>(`GET/POST/PATCH /api/v1/tutor-replacements`) | `/(dashboard)/tutor-replacements`<br>`TutorReplacementModal`<br>`/dashboard/admin/replacements` | **Operational.** Implements FR-011 deterministic state machine (`requested` $\to$ `under_review` $\to$ `matching` $\to$ `offered` $\to$ `accepted` / `rejected` / `closed`). Unrelated case denial invariant enforced.                                        |
| **Reviews & Fair Moderation**   | `reviews`<br>`ReviewEntity`                                                                    | `ReviewsService`<br>`ReviewsController`<br>(`GET/POST/PATCH /api/v1/reviews`)                              | `ReviewModal`<br>`ReviewFormModal`<br>`TutorReviewsListView`                                    | **Operational.** Anti-self review constraint, anti-fake review guard (confirmed booking required), 4-criteria breakdown, single professional tutor rebuttal.                                                                                                  |
| **Support Tickets**             | `support_tickets`<br>`SupportTicketEntity`                                                     | `SupportService`<br>`SupportController`<br>`AdminSupportController`                                        | `/dashboard/admin/disputes` (`AdminSupportTab`)                                                 | **Operational.** Public and authenticated contact triage, per-email spam rate limits.                                                                                                                                                                         |
| **Booking Dispute Status**      | `bookings.status = 'disputed'`                                                                 | In `booking-status-transitions.ts`                                                                         | —                                                                                               | **State exists, but no dedicated dispute management entity or service exists.** Bookings can have status `'disputed'`, but there is no `booking_disputes` entity to track disputant claims, evidence, claimed amounts, assigned staff, or formal resolutions. |
| **Escrow Freeze on Dispute**    | `escrow_holds`<br>`EscrowHoldEntity`                                                           | `RefundsService`<br>`SettlementService`                                                                    | —                                                                                               | `RefundsService` blocks customer self-refund if earnings were released, requiring a dispute. However, no automated guard currently freezes `SettlementService.settleMilestone` when a booking is `'disputed'`.                                                |

---

## 3. Critical Findings & Architectural Gaps

### P0 — Missing Formal Booking Dispute Subsystem

While `BookingStatus.disputed` exists in the booking state machine, there is currently no database table or service managing the formal dispute lifecycle:

- Who disputed it? (`disputed_by`)
- What is the reason code? (`tutor_no_show`, `unfulfilled_hours`, `curriculum_mismatch`, `inappropriate_conduct`, `billing_dispute`)
- What is the claimed refund amount? (`disputed_amount_minor`)
- What evidence assets were uploaded? (`evidence_asset_ids`)
- Who is investigating it? (`assigned_to`)
- What is the outcome? (`resolved_refund`, `resolved_tutor_upheld`, `resolved_partial_refund`, `resolved_replacement`, `dismissed`)

### P0 — Escrow Settlement Must Automatically Freeze on Dispute

In Phase 05, `SettlementService.settleMilestone` permits settling a milestone session if the session is completed and not already settled.
If a booking is in `disputed` status, **no escrow funds must ever be released or settled to the tutor** until the dispute is formally resolved.

### P1 — Protective Safety Interventions for Reported Tutors

When a report of category `child_safety` or severity `critical` is filed against a tutor, Trust & Safety staff need an authoritative mechanism to apply a **Protective Safety Hold**:

- Temporarily suspend the tutor's profile publication (`publication_status = 'suspended_safety'`).
- Prevent starting new learning sessions with minor students during an active safeguarding investigation.
- Log emergency intervention in `audit_logs` with the actor's ID and statutory reasoning.

### P1 — Admin Disputes & Safety Hub Unified Triage

`AdminDisputesPage` ([`/dashboard/admin/disputes`](file:///C:/Sofof_tech_2026/ogroniedu/apps/web/src/features/admin/pages/admin-disputes-page.tsx)) currently switches between **Ledger Accounts** and **Support Tickets**.
It lacks:

1. An authoritative **Booking Disputes Tab** where administrators can view all active disputes, inspect evidence, view booking/escrow amounts, and execute resolutions (Refund, Uphold, or Replacement).
2. A dedicated **Safety Incidents Tab** displaying the priority queue of safety and child protection reports.

### P2 — Direct Dispute Initiation on Booking & Session Details

Learners and guardians on [`/bookings/[id]`](file:///C:/Sofof_tech_2026/ogroniedu/apps/web/src/app/[locale]/bookings/[id]/page.tsx) currently have buttons for `Report Issue` (Safety) and `Replacement` (FR-011), but no dedicated `Open Dispute / Claim Refund` button when a booking is confirmed or completed.

---

## 4. Statutory Compliance Baseline (Bangladesh)

1. **The Children Act, 2013 (শিশু আইন, ২০১৩):**
   - Section 4: All individuals below 18 are children.
   - Child safeguarding requires immediate escalation of abuse, harassment, or exploitation.
   - Toll-free helplines: **1098** (Child Helpline) and **109** (Violence Protection).
2. **The Contract Act, 1872:**
   - Section 11: Minors are legally incompetent to contract.
   - Financial commitments and tuition bookings for minors must be authorized by an adult guardian under `v1.0-bd-minor-consent`.
3. **Data Protection & PII Minimization:**
   - Tutors are never given direct personal phone numbers of minor students.
   - Safety reports and dispute statements are strictly confidential (ABAC-scoped). Reported users are never given access to confidential reporter statements.
