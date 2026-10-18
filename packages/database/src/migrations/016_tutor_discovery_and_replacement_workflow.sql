-- =============================================================================
-- 016_tutor_discovery_and_replacement_workflow.sql  (Phase 03)
-- =============================================================================
-- Discovery:
--   * tutor_service_areas gains the *public service-area* coordinate the tutor
--     approved for distance search. It is never a home address and stays NULL
--     when the tutor has not supplied one (search then skips distance matching
--     for that area instead of inventing a location).
--   * saved_tutors stores a user's private shortlist.
--
-- Replacement guarantee:
--   * deadline/escalation metadata on tutor_replacement_cases
--   * optimistic-concurrency version
--   * refund *eligibility* is recorded; the refund execution belongs to the
--     payment/ledger system and is not performed here.
--   * tutor_replacement_case_events is the append-only case audit trail, with
--     user-visible notes separated from internal notes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Public service-area coordinates (nullable, validated ranges only)
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_service_areas
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6);
ALTER TABLE tutor_service_areas
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_service_area_latitude'
    ) THEN
        ALTER TABLE tutor_service_areas
            ADD CONSTRAINT chk_service_area_latitude
            CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_service_area_longitude'
    ) THEN
        ALTER TABLE tutor_service_areas
            ADD CONSTRAINT chk_service_area_longitude
            CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_service_area_coordinate_pair'
    ) THEN
        ALTER TABLE tutor_service_areas
            ADD CONSTRAINT chk_service_area_coordinate_pair
            CHECK ((latitude IS NULL) = (longitude IS NULL));
    END IF;
END $$;

-- Bounding-box prefilter for radius search.
CREATE INDEX IF NOT EXISTS ix_tutor_service_area_geo
    ON tutor_service_areas(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Saved tutors (per-user shortlist, duplicate-safe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_tutors (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tutor_user_id),
    CONSTRAINT chk_saved_tutor_not_self CHECK (user_id <> tutor_user_id)
);

CREATE INDEX IF NOT EXISTS ix_saved_tutors_user_created
    ON saved_tutors(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Replacement case workflow metadata
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS extended_at TIMESTAMPTZ;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS extension_reason TEXT;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS refund_eligibility TEXT NOT NULL DEFAULT 'not_determined';
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS refund_decided_at TIMESTAMPTZ;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS user_visible_note TEXT;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tutor_replacement_cases
    ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

-- Status vocabulary extended with the two explicit end states from the policy
-- (refund eligibility, user cancellation). `closed` is retained for cases that
-- were already archived before this migration.
ALTER TABLE tutor_replacement_cases
    DROP CONSTRAINT IF EXISTS tutor_replacement_cases_status_check;
ALTER TABLE tutor_replacement_cases
    ADD CONSTRAINT tutor_replacement_cases_status_check
    CHECK (status IN (
        'requested', 'under_review', 'matching', 'offered',
        'accepted', 'rejected', 'closed', 'refund_eligible', 'cancelled'
    ));

ALTER TABLE tutor_replacement_cases
    DROP CONSTRAINT IF EXISTS tutor_replacement_cases_refund_eligibility_check;
ALTER TABLE tutor_replacement_cases
    ADD CONSTRAINT tutor_replacement_cases_refund_eligibility_check
    CHECK (refund_eligibility IN ('not_determined', 'eligible', 'not_eligible'));

ALTER TABLE tutor_replacement_cases
    DROP CONSTRAINT IF EXISTS tutor_replacement_cases_version_check;
ALTER TABLE tutor_replacement_cases
    ADD CONSTRAINT tutor_replacement_cases_version_check CHECK (version >= 1);

-- Backfill deadline only for cases that are still open. A late migration must
-- not resurrect or extend a deadline that operations already handled.
UPDATE tutor_replacement_cases
SET deadline_at = created_at + interval '24 hours'
WHERE deadline_at IS NULL
  AND status NOT IN ('accepted', 'rejected', 'closed', 'refund_eligible', 'cancelled');

-- Exactly one active case per booking (completed/cancelled cases remain).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_replacement_active_booking
    ON tutor_replacement_cases(booking_id)
    WHERE status NOT IN ('rejected', 'closed', 'cancelled');

CREATE INDEX IF NOT EXISTS ix_tutor_replacement_cases_status_deadline
    ON tutor_replacement_cases(status, deadline_at);
CREATE INDEX IF NOT EXISTS ix_tutor_replacement_cases_assigned
    ON tutor_replacement_cases(assigned_to, status);
CREATE INDEX IF NOT EXISTS ix_tutor_replacement_cases_overdue
    ON tutor_replacement_cases(deadline_at)
    WHERE status NOT IN ('accepted', 'rejected', 'closed', 'refund_eligible', 'cancelled');

-- ---------------------------------------------------------------------------
-- 4. Append-only case history (auditable decisions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_replacement_case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES tutor_replacement_cases(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL DEFAULT 'system',
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    -- Applicant-facing explanation. Safe to serialize to the case owner.
    user_visible_note TEXT,
    -- Reviewer-only note. Never serialized to applicants/public endpoints.
    internal_note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_tutor_replacement_events_case
    ON tutor_replacement_case_events(case_id, created_at ASC);

-- Seed the creation event for pre-existing cases so every case has a trail.
INSERT INTO tutor_replacement_case_events (
    case_id, actor_user_id, actor_role, event_type, to_status,
    user_visible_note, metadata, created_at
)
SELECT
    c.id,
    c.requested_by,
    'requester',
    'case.requested',
    c.status,
    'Replacement guarantee request received.',
    jsonb_build_object('reasonCode', c.reason_code, 'backfilled', true),
    c.created_at
FROM tutor_replacement_cases c
WHERE NOT EXISTS (
    SELECT 1 FROM tutor_replacement_case_events e WHERE e.case_id = c.id
);
