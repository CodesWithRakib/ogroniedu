# Phase 07 — API and Data Model Specification

## 1. Database Schema Additions (`packages/database/src/migrations/024_disputes_and_safeguarding.sql`)

### Table: `booking_disputes`

```sql
CREATE TABLE IF NOT EXISTS booking_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    disputed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason_code TEXT NOT NULL CHECK (reason_code IN (
        'tutor_no_show',
        'poor_quality',
        'unfulfilled_hours',
        'curriculum_mismatch',
        'inappropriate_conduct',
        'billing_dispute',
        'other'
    )),
    description TEXT NOT NULL CHECK (length(description) >= 10),
    evidence_asset_ids UUID[] NOT NULL DEFAULT '{}',
    disputed_amount_minor BIGINT,
    status TEXT NOT NULL DEFAULT 'opened' CHECK (status IN (
        'opened',
        'under_review',
        'evidence_requested',
        'resolved_refund',
        'resolved_tutor_upheld',
        'resolved_partial_refund',
        'resolved_replacement',
        'dismissed'
    )),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolution_type TEXT CHECK (resolution_type IS NULL OR resolution_type IN (
        'refund',
        'tutor_upheld',
        'partial_refund',
        'replacement',
        'dismissed'
    )),
    refund_id UUID REFERENCES payment_refunds(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    policy_version TEXT NOT NULL DEFAULT 'v1.0-dispute-resolution',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_active_booking_dispute UNIQUE (booking_id) WHERE status IN ('opened', 'under_review', 'evidence_requested')
);

CREATE INDEX IF NOT EXISTS ix_booking_disputes_booking ON booking_disputes(booking_id);
CREATE INDEX IF NOT EXISTS ix_booking_disputes_status ON booking_disputes(status);
CREATE INDEX IF NOT EXISTS ix_booking_disputes_disputed_by ON booking_disputes(disputed_by);
```

### Alterations: `safety_reports` and `tutor_profiles`

```sql
-- 1. Link safety reports to specific sessions
ALTER TABLE safety_reports
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL;

-- 2. Add safety hold columns to tutor profiles
ALTER TABLE tutor_profiles
ADD COLUMN IF NOT EXISTS safety_hold_status TEXT NOT NULL DEFAULT 'clear' CHECK (safety_hold_status IN ('clear', 'under_investigation', 'safety_hold')),
ADD COLUMN IF NOT EXISTS safety_hold_reason TEXT;
```

---

## 2. API Endpoints

### 1. Booking Disputes (`apps/api/src/modules/trust/disputes.controller.ts`)

- `POST /api/v1/disputes`
  - **Auth:** Student or Guardian participant of the booking.
  - **Body:** `{ bookingId: UUID, reasonCode: string, description: string, disputedAmountMinor?: number, evidenceAssetIds?: UUID[] }`
  - **Action:** Validates caller is participant, creates `booking_disputes` record, transitions `bookings.status = 'disputed'`, emits `booking.disputed` outbox event, writes audit log.
  - **Returns:** HTTP 201 Created.
- `GET /api/v1/disputes`
  - **Auth:** Current authenticated user.
  - **Query:** `?status=opened&page=1&pageSize=20`
  - **Action:** If Admin, returns platform dispute triage queue; if Student/Guardian, returns disputes they opened; if Tutor, returns disputes where they are the assigned educator.
  - **Returns:** HTTP 200 OK.
- `GET /api/v1/disputes/:id`
  - **Auth:** Disputant, booking participants, or Admin.
  - **Returns:** HTTP 200 OK.
- `PATCH /api/v1/disputes/:id/resolve`
  - **Auth:** Admin or Super Admin only.
  - **Body:** `{ resolutionType: 'refund' | 'tutor_upheld' | 'partial_refund' | 'replacement' | 'dismissed', resolutionNotes: string, refundAmountMinor?: number }`
  - **Action:**
    - If `refund` / `partial_refund`: calls `RefundsService` to disburse funds.
    - If `tutor_upheld`: restores booking status to `completed` or `in_progress`.
    - If `replacement`: triggers replacement guarantee.
    - If `dismissed`: restores booking status.
  - **Returns:** HTTP 200 OK with resolved dispute entity.

### 2. Safeguarding & Protective Holds (`apps/api/src/modules/trust/safety-reports.controller.ts`)

- `POST /api/v1/safety-reports/:id/protective-hold`
  - **Auth:** Admin or Super Admin only.
  - **Body:** `{ reason: string }`
  - **Action:** Sets `tutor_profiles.safety_hold_status = 'safety_hold'`, unpublishes profile, prevents session starts, logs critical audit entry.
- `DELETE /api/v1/safety-reports/:id/protective-hold`
  - **Auth:** Admin or Super Admin only.
  - **Action:** Restores `tutor_profiles.safety_hold_status = 'clear'`.
