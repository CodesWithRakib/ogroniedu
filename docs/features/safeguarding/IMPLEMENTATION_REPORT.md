# Phase 07: Child Safety, Safeguarding, Complaints & Dispute Resolution — Implementation Report

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 07  
**Date:** October 20, 2026  
**Status:** COMPLETE (Pending Product-Owner Phase 08 Sign-Off)  
**Author:** Senior Full-Stack Engineer, Application Security Engineer & Child-Safety Systems Architect

---

## 1. Executive Summary

Phase 07 delivers a comprehensive, auditable, and security-hardened **Safeguarding, Complaints Management, and Booking Dispute Resolution System** tailored to the legal and operational context of Bangladesh (The Children Act 2013 / শিশু আইন ২০১৩, The Contract Act 1872).

The implementation establishes a zero-tolerance safeguarding framework with immediate automated protective interventions, strict Attribute-Based Access Control (ABAC), confidential minor reporting, conflict-of-interest prevention for investigators, and an immutable audit trail for state transitions and evidence access.

---

## 2. Implemented Architecture & Data Model

### 2.1 Database Migrations Applied

1. **`024_disputes_and_safeguarding.sql`**:
   - `booking_disputes` table with financial dispute lifecycle (`opened`, `under_review`, `evidence_required`, `resolved_refund`, `resolved_payout`, `dismissed`).
   - Escrow settlement freeze invariant: while an open dispute exists on a booking, `settlement_runs` are frozen.
2. **`025_safeguarding_case_management.sql`**:
   - `safety_reports`: Extended with `assigned_to`, `is_confidential`, `preferred_contact_method`, `incident_date`, `conflict_user_ids`, `session_id`, `resolved_by`, `resolved_at`, and `policy_version`.
   - `safety_case_messages`: Multi-party threaded communication with role-based internal note masking (`is_internal_note: true`).
   - `safety_case_events`: Append-only, tamper-evident audit log recording every transition, assignment, message, and evidence view.
   - `safety_actions`: Protective interventions applied immediately upon report triage (`tutor_safety_hold`, `contact_restriction`, `messaging_disabled`, `temporary_suspension`, `flagged_for_review`).

### 2.2 Backend Service & Controller Layer (`@ogroniedu/api`)

- **`SafetyReportsService`** (`apps/api/src/modules/trust/safety-reports.service.ts`):
  - `createReport`: Ingests reports, runs server-side severity determination, flags statutory helplines (1098, 999, 109), and logs immutable submission events.
  - `getReport`: Enforces strict ABAC. Blocks accused persons (HTTP 403), blocks students from seeing other students' cases, blocks guardians from confidential minor reports (`is_confidential: true`), and filters out internal investigator notes for reporters.
  - `listReports`: Scoped listing based on caller role. Support staff see only non-critical assigned cases; Safeguarding Officers and Admins see full or unassigned triage queues.
  - `assignCase`: Enforces conflict-of-interest checks. An investigator or admin implicated in `reportedUserId` or `conflictUserIds` is forbidden from assigning the case or being assigned as the case handler.
  - `updateCaseStatus`: Manages strict state machine transitions (`submitted` -> `triaged` -> `assigned` -> `under_investigation` -> `awaiting_information` -> `escalated` -> `action_taken` -> `resolved` / `closed` / `dismissed`).
  - `addCaseMessage`: Enables reporter-investigator communications and private investigator notes.
  - `applySafetyAction` & `revokeSafetyAction`: Issues immediate protective sanctions against accused parties.
  - `resolveCase` & `reopenCase`: Finalizes formal findings or reopens cases upon newly discovered evidence.
  - `getEvidenceAccess`: Issues short-lived signed URLs with download logging in `safety_case_events`.
- **`DisputesService`** (`apps/api/src/modules/trust/disputes.service.ts`):
  - Integrates booking dispute resolution with the double-entry escrow ledger (`SettlementService` / `LedgerService`), executing automated partial/full refunds or tutor payouts.

---

## 3. Mandatory Security & Authorization Gates (12 / 12 Passing)

| Gate #   | Security Requirement                                                      |   Status   | Verification Test                                           |
| :------- | :------------------------------------------------------------------------ | :--------: | :---------------------------------------------------------- |
| **G-01** | Accused person cannot retrieve report or evidence against them            | **PASSED** | `ForbiddenException` on GET report/evidence                 |
| **G-02** | Unrelated student/tutor cannot view third-party cases                     | **PASSED** | `ForbiddenException` on GET report                          |
| **G-03** | Guardian cannot view confidential minor reports (`is_confidential: true`) | **PASSED** | `ForbiddenException` on guardian access                     |
| **G-04** | Support agents cannot view `critical` / `abuse_exploitation` cases        | **PASSED** | Restricted to `safeguarding_lead` / `admin`                 |
| **G-05** | Implicated admin cannot assign themselves or manage cases                 | **PASSED** | Conflict of interest check throws `ConflictException`       |
| **G-06** | Reporters cannot view internal staff notes (`is_internal_note: true`)     | **PASSED** | Filtered from message array in API responses                |
| **G-07** | Evidence files require authenticated, authorized, short-lived URLs        | **PASSED** | Signed URLs with signed token & expiry                      |
| **G-08** | Every evidence download is audited in immutable events                    | **PASSED** | `evidence_accessed` event committed to database             |
| **G-09** | Escrow settlement runs are frozen during open booking disputes            | **PASSED** | Invariant enforced in `SettlementService`                   |
| **G-10** | Protective safety holds immediately restrict tutor booking & messaging    | **PASSED** | `tutor_safety_hold` prevents active sessions                |
| **G-11** | Statutory emergency contacts (1098, 999, 109) presented on urgent cases   | **PASSED** | Banner displayed and emergency response logged              |
| **G-12** | Notifications do not leak allegations, evidence, or names                 | **PASSED** | Non-revealing bilingual templates in `@ogroniedu/contracts` |

---

## 4. End-to-End Workflow Verification

All 5 core real-world workflows were verified in `apps/api/test/safeguarding-security-authorization.spec.ts`:

1. **General Complaint Workflow:** Submission -> Triage -> Assigned -> Resolved.
2. **Confidential Minor Report:** Minor marks confidential -> Guardian cannot view -> Safeguarding officer investigates.
3. **Urgent Child Safety Escalation:** Critical category auto-escalated -> Protective safety hold applied -> Emergency helpline advised.
4. **Conflict of Interest Guard:** Implicated officer in conflict list -> Assignment blocked -> Clean officer handles investigation.
5. **Booking Dispute & Escrow Ledger:** Dispute opened -> Settlement frozen -> Resolved with refund -> Ledger executed.

---

## 5. Frontend & UI Verification

### 5.1 Components Upgraded (`@ogroniedu/web`)

- **Admin Child Safety Tab** (`apps/web/src/features/admin/components/tabs/adminSafetyTab.tsx`):
  - Case Overview table with severity pills (`Low`, `Medium`, `High`, `Critical`).
  - **Case Investigation & Management Drawer**:
    - Status badge and statutory helplines banner (1098 Child Helpline, 999 Police Emergency, 109 Women & Children Violence).
    - Investigator Assignment dropdown with conflict-of-interest prevention.
    - Lifecycle State Transition controller.
    - Threaded Case Messages with "Internal Staff Note Only" toggle.
    - Protective Safety Hold modal with reason and duration selection.
    - Formal Resolution Findings modal.
- **RTK Query Integration** (`apps/web/src/store/services/trust-api.ts`):
  - Added hooks: `useAssignCaseMutation`, `useAddCaseMessageMutation`, `useUpdateCaseStatusMutation`, `useApplyCaseSafetyActionMutation`, `useResolveSafetyCaseMutation`, `useReopenSafetyCaseMutation`.

### 5.2 Browser & Visual Verification (Chrome DevTools MCP)

- Successfully navigated to `http://localhost:5000/en/dashboard/admin/disputes`.
- Verified Child Safety tab rendering and case listing.
- Opened Case Investigation & Management drawer and verified layout, investigator assignment, timeline, and internal note toggles.
- Zero runtime JavaScript errors or unhandled network exceptions in browser console.

---

## 6. Monorepo Quality Gates Results

| Check                | Target                           |       Result       | Notes                                               |
| :------------------- | :------------------------------- | :----------------: | :-------------------------------------------------- |
| **Typecheck**        | Monorepo (`turbo run typecheck`) |   **100% PASS**    | 6/6 packages clean, 0 TypeScript errors             |
| **Linter**           | Monorepo (`turbo run lint`)      |   **100% PASS**    | 468 web files + 464 api files, 0 warnings, 0 errors |
| **API Test Suite**   | `@ogroniedu/api` Vitest          |  **39 / 39 PASS**  | Safeguarding & safety test specs passed cleanly     |
| **Web Test Suite**   | `@ogroniedu/web` Vitest          | **218 / 218 PASS** | All 35 web test suites passed cleanly               |
| **Production Build** | `turbo run build`                |   **100% PASS**    | Next.js 16.4.0 Turbopack build & NestJS build clean |

---

## 7. Decisions Requiring Product-Owner Approval

The following design decisions were implemented safely according to established best practices, but require explicit formal sign-off from the Product Owner:

1. **Minor Confidential Reports vs. Guardian Transparency:**
   - _Current Implementation:_ If a minor student explicitly checks "Keep this report confidential from my guardian" (`is_confidential: true`), guardians linked to the student cannot view or search the case in their dashboard. This protects vulnerable minors from domestic retaliation.
   - _Decision Required:_ Confirm if guardians should be notified that _an incident is under review_ without revealing details, or if complete confidentiality should remain the default for sensitive allegations.
2. **Dispute Filing Window:**
   - _Current Implementation:_ Booking disputes can be opened up to 72 hours after session completion before escrow funds are released to the tutor.
   - _Decision Required:_ Confirm whether 72 hours is the standard dispute filing window across all tuition tiers.
3. **Statutory Law Enforcement Reporting:**
   - _Current Implementation:_ Critical child safety cases generate urgent internal alerts and present Bangladeshi emergency contacts (1098/999). Reports are not automatically transmitted to law enforcement APIs without human investigator review.
   - _Decision Required:_ Confirm protocol for manual vs. automated dispatch to designated child-protection liaisons.

---

## 8. Completion & Next Steps

Phase 07 is fully completed, verified, and ready for deployment. In accordance with instructions, **development is stopped here to await Product-Owner approval before beginning Phase 08.**
