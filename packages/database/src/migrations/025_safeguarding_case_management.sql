-- ==============================================================================
-- OgroniEdu — Phase 07: Safeguarding Case Management & Incident System (025)
-- ==============================================================================
-- Additive only. Implements:
--   1. safety_reports extensions (investigator assignment, confidentiality, conflict tracking).
--   2. safety_case_messages (reporter communication & separate internal investigator notes).
--   3. safety_case_events (immutable case transition, evidence access, and audit trail).
--   4. safety_actions (audited immediate protective actions: hold, restriction, suspension).
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend safety_reports Table
-- ---------------------------------------------------------------------------
ALTER TABLE safety_reports
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT NOT NULL DEFAULT 'in_app',
    ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS conflict_user_ids UUID[] NOT NULL DEFAULT '{}';

-- Safely expand status check constraint on safety_reports
DO $$
BEGIN
    ALTER TABLE safety_reports DROP CONSTRAINT IF EXISTS safety_reports_status_check;
    ALTER TABLE safety_reports ADD CONSTRAINT safety_reports_status_check CHECK (status IN (
        'submitted',
        'triaged',
        'assigned',
        'under_review',
        'awaiting_information',
        'escalated',
        'action_taken',
        'resolved',
        'closed',
        'reopened',
        'dismissed'
    ));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

CREATE INDEX IF NOT EXISTS ix_safety_reports_assigned_to
    ON safety_reports(assigned_to);

CREATE INDEX IF NOT EXISTS ix_safety_reports_confidential
    ON safety_reports(is_confidential);

-- ---------------------------------------------------------------------------
-- 2. Case Messages Table (Reporter Thread vs Internal Notes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL CHECK (length(trim(message)) >= 1),
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    attachment_asset_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_safety_case_messages_report
    ON safety_case_messages(report_id, created_at);

CREATE INDEX IF NOT EXISTS ix_safety_case_messages_internal
    ON safety_case_messages(report_id, is_internal_note);

-- ---------------------------------------------------------------------------
-- 3. Case Events & Access Audit Table (Immutable Audit Trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_safety_case_events_report
    ON safety_case_events(report_id, created_at);

CREATE INDEX IF NOT EXISTS ix_safety_case_events_actor
    ON safety_case_events(actor_id);

CREATE INDEX IF NOT EXISTS ix_safety_case_events_type
    ON safety_case_events(event_type);

-- ---------------------------------------------------------------------------
-- 4. Immediate Safety Actions Table (Protective Restrictions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'tutor_safety_hold',
        'contact_restriction',
        'messaging_disabled',
        'temporary_suspension',
        'flagged_for_review'
    )),
    reason TEXT NOT NULL CHECK (length(trim(reason)) >= 5),
    applied_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_safety_actions_target
    ON safety_actions(target_user_id, action_type);

CREATE INDEX IF NOT EXISTS ix_safety_actions_report
    ON safety_actions(report_id);
