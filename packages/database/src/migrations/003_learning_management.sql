-- ==============================================================================
-- OgroniEdu — Learning Management Migration (003)
-- Purpose: Assignments, Homework Submissions, and Progress Reports
-- ==============================================================================

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    instructions TEXT,
    due_at TIMESTAMPTZ,
    max_score NUMERIC(5,2) DEFAULT 100.00 CHECK (max_score > 0),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_assignments_booking ON assignments(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_assignments_student ON assignments(student_user_id, status, due_at);
CREATE INDEX IF NOT EXISTS ix_assignments_tutor ON assignments(tutor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id),
    submission_text TEXT,
    asset_ids UUID[] NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'reviewed', 'returned')),
    score NUMERIC(5,2) CHECK (score IS NULL OR score >= 0),
    max_score NUMERIC(5,2) CHECK (max_score IS NULL OR max_score >= score),
    tutor_feedback TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(assignment_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS ix_assignment_submissions_student ON assignment_submissions(student_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS ix_assignment_submissions_assignment ON assignment_submissions(assignment_id);

CREATE TABLE IF NOT EXISTS progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    attendance_rate NUMERIC(5,2) NOT NULL CHECK (attendance_rate BETWEEN 0 AND 100),
    assignments_completed INT NOT NULL DEFAULT 0 CHECK (assignments_completed >= 0),
    average_score NUMERIC(5,2) CHECK (average_score IS NULL OR (average_score BETWEEN 0 AND 100)),
    observable_progress TEXT NOT NULL,
    areas_for_growth TEXT,
    tutor_remarks TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_progress_report_dates CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS ix_progress_reports_booking ON progress_reports(booking_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ix_progress_reports_student ON progress_reports(student_user_id, generated_at DESC);
