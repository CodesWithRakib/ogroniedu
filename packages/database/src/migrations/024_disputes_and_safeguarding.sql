-- ==============================================================================
-- OgroniEdu — Phase 07: Child Safety, Safeguarding & Booking Disputes (024)
-- ==============================================================================
-- Additive only. Implements:
--   1. booking_disputes: formal booking complaints, escrow freeze, and resolution tracking.
--   2. safety_reports: session_id linking for classroom safeguarding incident attribution.
--   3. tutor_profiles: safety_hold_status and safety_hold_reason for protective interventions.
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. Booking Disputes Table (FR-082, FR-083)
-- ---------------------------------------------------------------------------
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_booking_dispute
    ON booking_disputes(booking_id)
    WHERE status IN ('opened', 'under_review', 'evidence_requested');

CREATE INDEX IF NOT EXISTS ix_booking_disputes_booking
    ON booking_disputes(booking_id);

CREATE INDEX IF NOT EXISTS ix_booking_disputes_status
    ON booking_disputes(status);

CREATE INDEX IF NOT EXISTS ix_booking_disputes_disputed_by
    ON booking_disputes(disputed_by);

-- ---------------------------------------------------------------------------
-- 2. Safety Reports Session Linking
-- ---------------------------------------------------------------------------
ALTER TABLE safety_reports
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_safety_reports_session
    ON safety_reports(session_id);

-- ---------------------------------------------------------------------------
-- 3. Tutor Protective Safety Hold Columns
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS safety_hold_status TEXT NOT NULL DEFAULT 'clear'
        CHECK (safety_hold_status IN ('clear', 'under_investigation', 'safety_hold')),
    ADD COLUMN IF NOT EXISTS safety_hold_reason TEXT;

CREATE INDEX IF NOT EXISTS ix_tutor_profiles_safety_hold
    ON tutor_profiles(safety_hold_status);
