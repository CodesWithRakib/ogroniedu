-- Migration 006: Reviews, Trust & Safety, and Tutor Replacement Guarantee
-- Phase 13 Core Schema

-- 1. Reviews Table (Fair, Verified, Anti-Self / Anti-Fake Reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tutor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    punctuality_rating SMALLINT CHECK (punctuality_rating BETWEEN 1 AND 5),
    teaching_clarity_rating SMALLINT CHECK (teaching_clarity_rating BETWEEN 1 AND 5),
    subject_mastery_rating SMALLINT CHECK (subject_mastery_rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL CHECK (length(comment) <= 2000),
    moderation_status TEXT NOT NULL DEFAULT 'published' CHECK (moderation_status IN ('pending', 'published', 'flagged', 'hidden')),
    policy_version TEXT NOT NULL DEFAULT 'v1.0-fair-reviews',
    tutor_response TEXT,
    tutor_responded_at TIMESTAMPTZ,
    is_verified_booking BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_review_booking_reviewer UNIQUE (booking_id, reviewer_user_id),
    CONSTRAINT chk_review_no_self_review CHECK (reviewer_user_id <> tutor_user_id)
);

CREATE INDEX IF NOT EXISTS ix_reviews_tutor ON reviews(tutor_user_id, moderation_status);
CREATE INDEX IF NOT EXISTS ix_reviews_booking ON reviews(booking_id);

-- 2. Safety & Abuse Reports (Support Intake & Child Safety Escalation)
CREATE TABLE IF NOT EXISTS safety_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reported_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('harassment', 'child_safety', 'inappropriate_content', 'off_platform_payment', 'academic_dishonesty', 'fraud_billing', 'other')),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL CHECK (length(description) >= 10),
    evidence_asset_ids UUID[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_investigation', 'escalated', 'action_taken', 'dismissed')),
    escalation_level TEXT NOT NULL DEFAULT 'standard' CHECK (escalation_level IN ('standard', 'urgent_child_safety', 'legal_review')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    policy_version TEXT NOT NULL DEFAULT 'v1.0-child-safety-reporting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_safety_reports_status ON safety_reports(status, escalation_level);
CREATE INDEX IF NOT EXISTS ix_safety_reports_reporter ON safety_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS ix_safety_reports_booking ON safety_reports(booking_id);

-- 3. Tutor Replacement Guarantee Cases (FR-011)
CREATE TABLE IF NOT EXISTS tutor_replacement_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('trial_dissatisfaction', 'frequent_tutor_cancellation', 'tutor_no_show', 'teaching_mismatch', 'unprofessional_conduct', 'other')),
    explanation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'under_review', 'matching', 'offered', 'accepted', 'rejected', 'closed')),
    replacement_tutor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    outcome_notes TEXT,
    policy_version TEXT NOT NULL DEFAULT 'v1.0-tutor-replacement-guarantee',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_tutor_replacement_cases_booking ON tutor_replacement_cases(booking_id);
CREATE INDEX IF NOT EXISTS ix_tutor_replacement_cases_requested_by ON tutor_replacement_cases(requested_by);
