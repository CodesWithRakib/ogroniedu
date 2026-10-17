-- =============================================================================
-- 014_tutor_verification_dossier.sql  (Phase 02 — Tutor Profile & Verification)
-- =============================================================================
-- Introduces the three-level verification dossier:
--   * tutor_verification_levels    — one independently reviewable record per
--                                    level (identity | educational | institutional)
--   * tutor_verification_documents — evidence metadata under review, tied to a
--                                    private file_assets row (never a public URL)
--   * tutor_verification_reviews   — extended into a level-scoped audit trail
--                                    (legacy rows stay with level IS NULL)
--   * tutor_profiles               — derived-status + expiry bookkeeping
-- The profile-level verification_status remains the DERIVED value and stays the
-- single source of truth for discovery eligibility (no duplicate truth tables).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-level verification state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_verification_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK(level IN ('identity', 'educational', 'institutional')),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN (
        'not_started', 'draft', 'submitted', 'under_review',
        'needs_information', 'approved', 'rejected', 'suspended', 'expired'
    )),
    assigned_reviewer_user_id UUID REFERENCES users(id),
    decided_by_user_id UUID REFERENCES users(id),
    decision_reason_code TEXT,
    -- Applicant-facing text. Reviewer-only text lives in internal_notes and is
    -- never serialized to applicant or public surfaces.
    applicant_feedback TEXT,
    internal_notes TEXT,
    expires_at TIMESTAMPTZ,
    first_submitted_at TIMESTAMPTZ,
    last_submitted_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    policy_version TEXT NOT NULL,
    -- Counts tutor submissions so the resubmission cap after a rejection is
    -- enforced without inferring it from audit rows.
    submission_count INTEGER NOT NULL DEFAULT 0 CHECK(submission_count >= 0),
    -- Optimistic concurrency guard: two reviewers cannot silently overwrite
    -- each other's decision (UPDATE ... WHERE version = :expected).
    version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tutor_user_id, level)
);

CREATE INDEX IF NOT EXISTS ix_tutor_verification_level_queue
    ON tutor_verification_levels(status, last_submitted_at);
CREATE INDEX IF NOT EXISTS ix_tutor_verification_level_reviewer
    ON tutor_verification_levels(assigned_reviewer_user_id, status);
CREATE INDEX IF NOT EXISTS ix_tutor_verification_level_expiry
    ON tutor_verification_levels(expires_at) WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- 2. Dossier evidence documents (private)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK(level IN ('identity', 'educational', 'institutional')),
    document_type TEXT NOT NULL CHECK(document_type IN (
        'nid_front', 'nid_back', 'selfie_with_nid',
        'academic_certificate', 'transcript', 'professional_certificate',
        'institution_letter', 'employment_letter', 'other_supporting'
    )),
    file_asset_id UUID NOT NULL REFERENCES file_assets(id),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN (
        'pending', 'approved', 'rejected', 'superseded'
    )),
    reviewed_by_user_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    reason_code TEXT,
    expires_on DATE,
    -- Reminder idempotency: last delivered stage (e.g. 'D-30' / 'D-7').
    reminder_stage TEXT,
    last_reminded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_tutor_verification_documents_tutor
    ON tutor_verification_documents(tutor_user_id, level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_tutor_verification_documents_review
    ON tutor_verification_documents(review_status, level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_tutor_verification_documents_expiry
    ON tutor_verification_documents(expires_on)
    WHERE deleted_at IS NULL AND review_status = 'approved';

-- One live (pending|approved) document per type and level. Replacement must
-- explicitly supersede the previous row so review history is never erased.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_verification_document_active
    ON tutor_verification_documents(tutor_user_id, level, document_type)
    WHERE deleted_at IS NULL AND review_status IN ('pending', 'approved');

-- ---------------------------------------------------------------------------
-- 3. Review history becomes level-scoped
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES tutor_verification_documents(id) ON DELETE SET NULL;
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS from_status TEXT;
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS to_status TEXT;
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS applicant_feedback TEXT;
ALTER TABLE tutor_verification_reviews
    ADD COLUMN IF NOT EXISTS reviewer_role TEXT;

CREATE INDEX IF NOT EXISTS ix_tutor_verification_reviews_level
    ON tutor_verification_reviews(tutor_user_id, level, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Derived status + expiry bookkeeping on the profile
-- ---------------------------------------------------------------------------
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS verification_policy_version TEXT;

-- Discovery eligibility scan (published + approved + not expired).
CREATE INDEX IF NOT EXISTS ix_tutor_discovery_eligibility
    ON tutor_profiles(verification_expires_at)
    WHERE publication_status = 'published' AND verification_status = 'approved';

-- ---------------------------------------------------------------------------
-- 5. Legacy backfill (idempotent)
-- ---------------------------------------------------------------------------
-- 5a. One level row per existing tutor profile, mirroring the legacy
--     single-status model. `approved` legacy profiles become approved on all
--     three levels; identity carries the policy validity window, the other two
--     levels have no expiry policy (validity_days NULL).
INSERT INTO tutor_verification_levels (
    tutor_user_id, level, status, policy_version, decided_at, expires_at
)
SELECT
    p.user_id,
    l.level,
    CASE p.verification_status
        WHEN 'approved' THEN 'approved'
        WHEN 'suspended' THEN 'suspended'
        WHEN 'expired' THEN 'expired'
        WHEN 'rejected' THEN 'rejected'
        WHEN 'submitted' THEN 'submitted'
        WHEN 'under_review' THEN 'under_review'
        WHEN 'needs_information' THEN 'needs_information'
        ELSE 'not_started'
    END,
    'v1.0-bd-tutor-verification',
    CASE WHEN p.verification_status = 'approved' THEN COALESCE(p.profile_updated_at, now()) END,
    CASE
        WHEN p.verification_status = 'approved' AND l.level = 'identity'
            THEN COALESCE(p.profile_updated_at, now()) + interval '3650 days'
    END
FROM tutor_profiles p
CROSS JOIN (VALUES ('identity'), ('educational'), ('institutional')) AS l(level)
ON CONFLICT (tutor_user_id, level) DO NOTHING;

-- 5b. Promote legacy qualification evidence into dossier documents so the
--     review history of already-uploaded files is preserved.
INSERT INTO tutor_verification_documents (
    tutor_user_id, level, document_type, file_asset_id,
    review_status, reviewed_at, expires_on, created_at
)
SELECT
    q.tutor_user_id,
    CASE
        WHEN q.qualification_type = 'nid' THEN 'identity'
        WHEN q.qualification_type = 'experience' THEN 'institutional'
        ELSE 'educational'
    END,
    CASE
        WHEN q.qualification_type = 'nid' THEN 'nid_front'
        WHEN q.qualification_type = 'academic_certificate' THEN 'academic_certificate'
        WHEN q.qualification_type = 'degree' THEN 'academic_certificate'
        WHEN q.qualification_type = 'experience' THEN 'employment_letter'
        ELSE 'other_supporting'
    END,
    q.evidence_asset_id,
    CASE
        WHEN q.review_status = 'approved' THEN 'approved'
        WHEN q.review_status IN ('rejected', 'expired') THEN 'rejected'
        ELSE 'pending'
    END,
    CASE WHEN q.review_status IN ('approved', 'rejected', 'expired') THEN q.created_at END,
    CASE WHEN q.expires_on IS NOT NULL THEN q.expires_on END,
    q.created_at
FROM tutor_qualifications q
WHERE q.evidence_asset_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5c. Stamp the derived policy version / expiry for legacy approved profiles so
--     discovery eligibility stays consistent before the first sweep runs.
UPDATE tutor_profiles p
SET verification_policy_version = 'v1.0-bd-tutor-verification',
    verified_at = CASE
        WHEN p.verification_status = 'approved'
            THEN COALESCE(p.verified_at, p.profile_updated_at)
        ELSE p.verified_at
    END,
    verification_expires_at = CASE
        WHEN p.verification_status = 'approved'
            THEN COALESCE(p.verification_expires_at, COALESCE(p.profile_updated_at, now()) + interval '3650 days')
        ELSE p.verification_expires_at
    END
WHERE p.verification_policy_version IS NULL;
