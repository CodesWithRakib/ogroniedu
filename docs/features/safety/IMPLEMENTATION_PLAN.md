# Phase 07 — Child Safety, Safeguarding, Complaints & Dispute Resolution Implementation Plan

## 1. Executive Summary

This plan outlines the architecture, data models, state machines, and end-to-end implementation for **Phase 07: Child Safety, Safeguarding, Complaints & Dispute Resolution**.

The system establishes an auditable, high-trust dispute resolution framework alongside zero-tolerance child safeguarding under the laws of Bangladesh (The Children Act 2013, The Contract Act 1872).

---

## 2. Core Architectural Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OGRONIEDU TRUST & SAFETY                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│      Child Safety & Safeguarding │     Complaints & Dispute Resolution │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Zero-Tolerance Abuse Reporting │ • Booking Complaints & Disputes     │
│ • Urgent Escalation (1098, 999)  │ • Escrow Settlement Freeze Guard    │
│ • Protective Safety Hold         │ • Structured Resolution Engine      │
│ • Guardian Minor Consent Policy  │ • Tutor Replacement Guarantee       │
│ • Redacted Minor PII             │ • Review Moderation & Rebuttal      │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 3. Work Breakdown Structure (WBS)

### Step 1: Database Schema & Migration (`024_disputes_and_safeguarding.sql`)
1. Create `booking_disputes` table:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE`
   - `disputed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
   - `reason_code TEXT NOT NULL` (`tutor_no_show`, `poor_quality`, `unfulfilled_hours`, `curriculum_mismatch`, `inappropriate_conduct`, `billing_dispute`, `other`)
   - `description TEXT NOT NULL CHECK (length(description) >= 10)`
   - `evidence_asset_ids UUID[] NOT NULL DEFAULT '{}'`
   - `disputed_amount_minor BIGINT` (claimed refund in minor units)
   - `status TEXT NOT NULL DEFAULT 'opened'` (`opened`, `under_review`, `evidence_requested`, `resolved_refund`, `resolved_tutor_upheld`, `resolved_partial_refund`, `resolved_replacement`, `dismissed`)
   - `assigned_to UUID REFERENCES users(id) ON DELETE SET NULL`
   - `resolution_notes TEXT`
   - `resolution_type TEXT`
   - `refund_id UUID REFERENCES payment_refunds(id) ON DELETE SET NULL`
   - `resolved_by UUID REFERENCES users(id) ON DELETE SET NULL`
   - `resolved_at TIMESTAMPTZ`
   - `policy_version TEXT NOT NULL DEFAULT 'v1.0-dispute-resolution'`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`
2. Add `session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL` to `safety_reports`.
3. Add `safety_hold_status TEXT NOT NULL DEFAULT 'clear'` (`clear`, `under_investigation`, `safety_hold`) and `safety_hold_reason TEXT` to `tutor_profiles`.

### Step 2: Backend Entities, DTOs & Disputes Subsystem
1. Create `BookingDisputeEntity` in `apps/api/src/modules/trust/entities/booking-dispute.entity.ts`.
2. Define DTOs:
   - `CreateDisputeDto`: `bookingId`, `reasonCode`, `description`, `disputedAmountMinor`, `evidenceAssetIds`.
   - `ResolveDisputeDto`: `resolutionType` (`refund`, `tutor_upheld`, `partial_refund`, `replacement`, `dismissed`), `resolutionNotes`, `refundAmountMinor`.
   - `QueryDisputesDto`: `status`, `page`, `pageSize`.
3. Implement `DisputesService` in `apps/api/src/modules/trust/disputes.service.ts`:
   - `openDispute`: validates caller is booking participant (student/guardian), transitions booking to `'disputed'`, emits outbox event `booking.disputed`, writes audit log.
   - `getDispute`: enforces ABAC scoping (participant or admin only).
   - `listDisputes`: paginated history for user; complete queue for admin.
   - `resolveDispute`: administrative action with transactional state transition and integrated refund processing via `RefundsService`.
4. Register `DisputesController` in `trust.module.ts`.

### Step 3: Financial Invariant — Escrow Settlement Freeze
1. Update `SettlementService.settleMilestone` in `apps/api/src/modules/payments/services/settlement.service.ts`:
   - Query parent booking for the session.
   - If `booking.status === 'disputed'`, abort immediately with `BadRequestException('Settlement blocked: Booking is currently under dispute review.')`.

### Step 4: Protective Safety Hold Enforcement
1. Add `applySafetyHold` and `releaseSafetyHold` methods to `SafetyReportsService` / `TutorProfilesRepository`.
2. Update `SessionReschedulingService.startSession` to verify tutor is not under an active `safety_hold`.
3. Update `TutorSearchService` to filter out profiles with `safety_hold_status = 'safety_hold'`.

### Step 5: Frontend UI & Admin Disputes Hub
1. Create `DisputeModal` component in `apps/web/src/features/trust/components/DisputeModal.tsx`.
2. Update `BookingDetailPage` ([`/bookings/[id]`](file:///C:/Sofof_tech_2026/ogroniedu/apps/web/src/app/[locale]/bookings/[id]/page.tsx)):
   - Add `Dispute / File Complaint` button when booking is `confirmed`, `in_progress`, or `completed`.
   - Display prominent dispute banner when booking is in `'disputed'` state.
3. Enhance `AdminDisputesPage` ([`/dashboard/admin/disputes`](file:///C:/Sofof_tech_2026/ogroniedu/apps/web/src/features/admin/pages/admin-disputes-page.tsx)):
   - Multi-tab navigation:
     - **Booking Disputes Tab** (triage disputes, view evidence, execute resolutions).
     - **Safety Incidents Tab** (urgent child safety triage, protective hold actions).
     - **Support Tickets Tab** (contact requests).
     - **Ledger Accounts Tab** (reconciliation).

### Step 6: Localization & Design System
1. Synchronize `messages/en.json` and `messages/bn.json` with 100% key parity across `trust`, `safety`, and `disputes` namespaces.
2. Adhere to design system tokens (`bg-destructive-soft`, `bg-warning-soft`, `bg-success-soft`, `rounded-2xl`, etc.).

### Step 7: Automated Tests & Verification
1. Author `apps/api/test/safety-phase07.spec.ts` covering:
   - Dispute creation, validation, and booking transition to `disputed`.
   - Escrow freeze invariant during dispute.
   - Dispute resolution outcomes (refund, uphold, replacement, dismissal).
   - Critical child safety auto-escalation.
   - Protective safety hold blocking session starts.
   - Unrelated case denial (ABAC privacy).
2. Author `apps/web/test/safety-phase07.spec.ts` covering:
   - UI status mapping, dispute modal interactions, and bilingual parity.
3. Run `turbo run typecheck`, `turbo run lint`, `turbo run build`.
4. Perform live browser verification using `chrome-devtools-mcp`.
