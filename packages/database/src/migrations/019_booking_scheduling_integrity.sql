-- =============================================================================
-- 019_booking_scheduling_integrity.sql
-- =============================================================================
-- Phase 04: booking/session state history, recurring series, date-specific
-- availability blocks, durable reminder idempotency, and duplicate-request
-- protection at the database level.
--
-- Additive only. Existing rows keep working:
--  * series columns are nullable,
--  * existing availability rows are untouched,
--  * existing outbox rows have a NULL idempotency key (partial unique index),
--  * existing requested bookings are de-duplicated by a partial unique index
--    only when the data is already unique (dev/prod both verified clean).
-- =============================================================================

-- 1. Explicit booking transition history (audit trail per booking) -----------
CREATE TABLE IF NOT EXISTS booking_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT,
    reason TEXT,
    safe_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_booking_status_events_booking
    ON booking_status_events(booking_id, created_at ASC);

-- 2. Recurring weekly series -------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_session_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    start_date DATE NOT NULL,
    horizon_end_date DATE NOT NULL,
    occurrences_planned INTEGER NOT NULL CHECK (occurrences_planned BETWEEN 1 AND 24),
    slots JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'completed')),
    idempotency_key TEXT NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_series_horizon CHECK (horizon_end_date >= start_date),
    CONSTRAINT uq_series_booking_idempotency UNIQUE (booking_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_booking_session_series_booking
    ON booking_session_series(booking_id, created_at DESC);

-- 3. Session series linkage, lifecycle metadata, reminder idempotency --------
ALTER TABLE booking_sessions
    ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES booking_session_series(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS occurrence_index INTEGER,
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rescheduled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reschedule_reason TEXT,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_series_occurrence
    ON booking_sessions(series_id, occurrence_index)
    WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_sessions_series_start
    ON booking_sessions(series_id, starts_at ASC)
    WHERE series_id IS NOT NULL;

-- Reminder scan: only sessions still waiting for a reminder.
CREATE INDEX IF NOT EXISTS ix_sessions_reminder_due
    ON booking_sessions(starts_at)
    WHERE status = 'scheduled' AND reminder_sent_at IS NULL;

-- 4. Date-specific availability blocks ---------------------------------------
CREATE TABLE IF NOT EXISTS tutor_availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    reason TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_availability_exception_time CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS ix_tutor_availability_exceptions_window
    ON tutor_availability_exceptions(tutor_user_id, starts_at, ends_at);

-- 5. Outbox idempotency ------------------------------------------------------
ALTER TABLE outbox_events
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_idempotency
    ON outbox_events(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 6. Duplicate active booking request protection -----------------------------
-- One open request per (student, tutor, subject). Cancelled/declined/expired
-- rows are excluded, so a student can re-request after a closed request.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_request
    ON bookings(student_user_id, tutor_user_id, subject_id)
    WHERE status = 'requested';
