-- ==============================================================================
-- OgroniEdu — Phase 06: LMS, Lesson Content, Homework History & Goals (023)
-- ==============================================================================
-- Additive only. Reuses booking_sessions as the learning session, the existing
-- assignments/submissions/attendance tables, and file_assets for storage
-- registration. Adds:
--   * lesson_plans + learning_materials (reusable lesson content)
--   * learning_goals (evidence-based goal tracking)
--   * assignment_revisions (immutable attempt snapshots)
--   * session idempotency + actual start timestamp
--   * assignment publication + attempt policy columns
--   * attendance correction metadata
-- ==============================================================================

-- ---------------------------------------------------------------------------
-- 1. Session lifecycle extensions
-- ---------------------------------------------------------------------------
ALTER TABLE booking_sessions
    ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_idempotency
    ON booking_sessions(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_sessions_booking_completed
    ON booking_sessions(booking_id, completed_at DESC)
    WHERE status = 'completed';

-- ---------------------------------------------------------------------------
-- 2. Attendance correction metadata
-- ---------------------------------------------------------------------------
ALTER TABLE session_attendance
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS correction_reason TEXT;

CREATE INDEX IF NOT EXISTS ix_attendance_participant_recorded
    ON session_attendance(participant_user_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Assignment publication and attempt policy
-- ---------------------------------------------------------------------------
ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resubmission_allowed BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS late_submission_allowed BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3
        CHECK (max_attempts BETWEEN 1 AND 10);

-- Rows created before this migration were all published immediately.
UPDATE assignments
   SET published_at = created_at
 WHERE status = 'published'
   AND published_at IS NULL;

ALTER TABLE assignment_submissions
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1
        CHECK (attempt_count >= 1),
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS return_reason TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ix_assignment_submissions_review_queue
    ON assignment_submissions(assignment_id, status, submitted_at ASC);

-- ---------------------------------------------------------------------------
-- 4. Immutable submission attempt history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    submission_text TEXT,
    asset_ids UUID[] NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    score NUMERIC(5,2),
    max_score NUMERIC(5,2),
    tutor_feedback TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    return_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_assignment_revision_attempt UNIQUE (submission_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS ix_assignment_revisions_submission
    ON assignment_revisions(submission_id, attempt_number DESC);

-- ---------------------------------------------------------------------------
-- 5. Reusable lesson plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE RESTRICT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    objectives TEXT[] NOT NULL DEFAULT '{}',
    steps JSONB NOT NULL DEFAULT '[]'::JSONB,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_lesson_plans_booking
    ON lesson_plans(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_lesson_plans_tutor_status
    ON lesson_plans(tutor_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_lesson_plans_session
    ON lesson_plans(session_id)
    WHERE session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Learning materials (file or external link)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
    session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
    file_asset_id UUID REFERENCES file_assets(id) ON DELETE RESTRICT,
    external_url TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_material_single_source CHECK (
        (kind = 'file' AND file_asset_id IS NOT NULL AND external_url IS NULL) OR
        (kind = 'link' AND external_url IS NOT NULL AND file_asset_id IS NULL)
    ),
    CONSTRAINT chk_material_https_link CHECK (
        external_url IS NULL OR external_url ~ '^https://'
    )
);

CREATE INDEX IF NOT EXISTS ix_learning_materials_plan
    ON learning_materials(lesson_plan_id);
CREATE INDEX IF NOT EXISTS ix_learning_materials_session
    ON learning_materials(session_id, status);
CREATE INDEX IF NOT EXISTS ix_learning_materials_booking
    ON learning_materials(booking_id, status);
CREATE INDEX IF NOT EXISTS ix_learning_materials_assignment
    ON learning_materials(assignment_id)
    WHERE assignment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Learning goals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'achieved', 'not_achieved', 'cancelled')),
    evidence TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    achieved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_learning_goals_student
    ON learning_goals(student_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_learning_goals_booking
    ON learning_goals(booking_id, created_at DESC);
