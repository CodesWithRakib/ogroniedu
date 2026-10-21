-- Migration: 029_beta_testing_and_feedback.sql
-- Module: Phase 12 - User Acceptance Testing, Beta Launch & Structured Feedback
-- Target: PostgreSQL 16+ / 18

CREATE TABLE IF NOT EXISTS beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reporter_role VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('bug', 'usability', 'feature_request', 'performance', 'accessibility', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    route VARCHAR(255),
    reproduction_steps TEXT,
    diagnostic_metadata JSONB,
    severity VARCHAR(20) CHECK (severity IN ('p0_critical', 'p1_high', 'p2_medium', 'p3_low')),
    status VARCHAR(30) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'triaged', 'in_progress', 'resolved', 'declined')),
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    triage_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Administrative Triage and Querying
CREATE INDEX IF NOT EXISTS ix_beta_feedback_status ON beta_feedback (status);
CREATE INDEX IF NOT EXISTS ix_beta_feedback_category ON beta_feedback (category);
CREATE INDEX IF NOT EXISTS ix_beta_feedback_severity ON beta_feedback (severity);
CREATE INDEX IF NOT EXISTS ix_beta_feedback_reporter ON beta_feedback (reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_beta_feedback_created_at ON beta_feedback (created_at DESC);
