# Phase 07: Child Safety, Safeguarding, Complaints & Dispute Resolution — Final Implementation Report

**Status:** Completed & Ready for Review  
**Date:** October 20, 2026  
**Platform:** OgroniEdu (অগ্রণী এডু)  
**Governing Standard:** The Children Act 2013 (শিশু আইন ২০১৩), The Contract Act 1872, Legal Minor Protection Policy `v1.0-bd-minor-consent`.

---

## 1. Executive Summary

Phase 07 delivers an end-to-end child safeguarding, complaint, and dispute resolution platform for OgroniEdu. The implementation bridges legal compliance under Bangladeshi law with rigorous fintech invariants:

1. **Child Safeguarding & Emergency Hotlines:**
   - One-click top-header emergency SOS dialog linking to the National Child Helpline (`1098`), Bangladesh Police & Emergency (`999`), and Women & Children Violence Helpline (`109`).
   - Incident filing system categorized under `child_safety`, `harassment`, `inappropriate_conduct`, `off_platform_payment`, and `fraud_billing`.
   - Admin child safeguarding incident desk with protective safety hold capabilities.

2. **Protective Safety Hold:**
   - Administrators can immediately suspend an alleged tutor's public profile and live classroom sessions during investigation (`safety_hold`).
   - Discovery search excludes tutors on hold; session launch endpoints actively reject sessions with HTTP 403 Forbidden.

3. **Booking Dispute Lifecycle & Escrow Settlement Freeze:**
   - Full dispute filing workflow for students and legal guardians with reason codes, description, evidence attachments, and claimed refund amounts.
   - **Escrow Settlement Freeze Invariant:** Any booking with active dispute status (`disputed`) strictly blocks milestone escrow releases in `SettlementService.settleMilestone()`.
   - Administrative dispute adjudication desk supporting full refunds, partial refunds, tutor upholds, replacement cases, or dismissals.
   - Transactional refund execution via `RefundsService.requestAndApproveForAdmin()`, recording double-entry ledger entries and outbox notifications (`dispute.resolved`).

---

## 2. Key Architecture & Deliverables

### Database & Schema Migration
- **Migration:** `packages/database/src/migrations/024_disputes_and_safeguarding.sql`
- **Tables & Columns Added:**
  - `booking_disputes`: tracks booking disputes with `reason_code`, `status`, `disputed_amount_minor`, `evidence_asset_ids`, `resolution_type`, `resolution_notes`, `refund_id`.
  - `safety_reports.session_id`: links safety reports directly to scheduled class sessions (`booking_sessions.id`).
  - `tutor_profiles.safety_hold_status`: (`clear`, `under_investigation`, `safety_hold`) and `safety_hold_reason`.

### Backend Implementation (`@ogroniedu/api`)
- **Entities & DTOs:**
  - `BookingDisputeEntity` (`apps/api/src/modules/trust/entities/booking-dispute.entity.ts`)
  - `CreateDisputeDto`, `ResolveDisputeDto`, `QueryDisputesDto` (`apps/api/src/modules/trust/dto/`)
  - Updated `SafetyReportEntity` and `TutorProfileEntity`.
- **Services & Controllers:**
  - `DisputesService` & `DisputesController` (`/api/v1/disputes`): open, retrieve, list, and resolve disputes.
  - `SafetyReportsService` & `SafetyReportsController`: apply and release protective safety holds (`/api/v1/trust/safety-reports/tutors/:tutorId/hold`).
  - `SettlementService`: enforced escrow freeze invariant blocking settlement when `booking.status === 'disputed'`.
  - `SessionReschedulingService`: enforced safety hold invariant blocking session start when tutor profile is on safety hold.
  - `TutorSearchService`: filtered out tutors with `safety_hold_status === 'safety_hold'` from discovery queries.

### Notification Contracts (`@ogroniedu/contracts`)
- Added `dispute.resolved` to `NotificationEventTypes` and registered bilingual notification templates (`bn` / `en`) with channels `[in_app, email]`.

### Frontend Web Implementation (`@ogroniedu/web`)
- **RTK Query Slice:**
  - Updated `apps/web/src/store/services/trust-api.ts` with hooks: `useGetDisputesQuery`, `useGetDisputeByIdQuery`, `useCreateDisputeMutation`, `useResolveDisputeMutation`, `useApplyProtectiveSafetyHoldMutation`, `useReleaseProtectiveSafetyHoldMutation`.
  - Added `BookingDispute` to cache `tagTypes` in `apps/web/src/store/base-api.ts`.
- **User-Facing UI:**
  - `DisputeModal.tsx`: Premium accessible modal for students/guardians to file booking disputes with reason selection, character counter, claimed amount input, and escrow freeze disclaimer.
  - `BookingDetailPage`: Displays "File Dispute" CTA for active bookings (`confirmed`, `in_progress`, `completed`), dispute status badges, and prominent warning banner when escrow is frozen.
- **Admin Governance Desk:**
  - `adminDisputesTab.tsx`: Booking disputes queue table, filters, claimed amounts, and resolution action modal.
  - `adminSafetyTab.tsx`: Safeguarding incident desk, priority escalation badges, and one-click protective safety hold actions.
  - `admin-disputes-page.tsx`: Unified 4-tab control center (`Booking Disputes`, `Child Safety`, `Ledger Accounts`, `Support Tickets`).

---

## 3. Decisions Requiring Product-Owner Approval

The following implementation decisions were designed according to platform conventions and Bangladeshi regulatory guidelines, but require explicit business sign-off before production deployment:

1. **Dispute Filing Eligibility Window:**
   - *Current Implementation:* Students/guardians may dispute a booking while it is in `confirmed`, `in_progress`, or `completed` status.
   - *Decision for PO:* Should there be an automated cutoff window for completed bookings (e.g. 7 days or 14 days after final session) after which dispute filing is disabled in favor of general support tickets?

2. **Automatic vs. Manual Tutor Payout Resumption:**
   - *Current Implementation:* Resolving a dispute with `tutor_upheld` restores the booking status to `completed`, allowing subsequent milestone payouts to process normally through standard settlement sweeps.
   - *Decision for PO:* Should tutor payouts for previously disputed sessions require explicit secondary approval by a senior finance manager before funds are released?

3. **Guardian Notification Policy on Minor Incident Filing:**
   - *Current Implementation:* Filing a child safety report sends a critical alert to the platform safeguarding triage team and records an audit log.
   - *Decision for PO:* In scenarios where a minor student files a safety report, should an automatic SMS/email be dispatched immediately to the linked guardian, or should the safeguarding desk review first to handle sensitive cases where the guardian may be implicated?

4. **Tutor Replacement Guarantee Integration:**
   - *Current Implementation:* If an admin resolves a dispute with `replacement`, a `replacement_case` is created with priority status and the booking escrow remains frozen for transfer to the new tutor.
   - *Decision for PO:* Is the tutor replacement fee credit capped at 100% of the disputed milestone, or can administrative discretion grant supplementary tuition credit?

---

## 4. Verification & Quality Gates

| Verification Gate | Result | Notes |
|:---|:---:|:---|
| **TypeScript Typecheck** | **PASS** | 0 errors across 5 workspace packages (`@ogroniedu/contracts`, `@ogroniedu/database`, `@ogroniedu/tsconfig`, `@ogroniedu/api`, `@ogroniedu/web`). |
| **Oxlint Quality & Style** | **PASS** | 0 errors, 0 warnings across 922 files. |
| **Backend Vitest Suite** | **PASS** | 74 test files, 776 passing unit/integration tests (including `safety-phase07.spec.ts` and `safety-reports.service.spec.ts`). |
| **Frontend Vitest Suite** | **PASS** | 35 test files, 218 passing tests (including `safety-phase07.spec.ts` and `admin-operations.spec.ts`). |
| **Total Test Suite** | **PASS** | **994 / 994 tests passing (100%)**. |
| **Production Build** | **PASS** | Clean build for NestJS backend and Next.js 16 (Turbopack) frontend. |
| **Chrome DevTools MCP Inspection** | **PASS** | Headful verification on port 5000: Admin Disputes Hub, Child Safety Desk, SOS Modal (1098/999/109), Booking Dossier. Zero console errors. |

---

## 5. Next Phase Status

Phase 07 is **COMPLETE**. Work is now paused awaiting Product-Owner approval before initiating Phase 08.
