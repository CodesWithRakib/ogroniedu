-- ==============================================================================
-- OgroniEdu — Session Cancellation Tracking Columns Migration (011)
-- Phase 21: align booking_sessions table with BookingSessionEntity
-- (cancellation_assessment JSONB + rescheduled_from_id UUID).
-- Idempotent: safe to run on databases that already have the columns.
-- ==============================================================================

ALTER TABLE booking_sessions
  ADD COLUMN IF NOT EXISTS cancellation_assessment JSONB;

ALTER TABLE booking_sessions
  ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_booking_sessions_rescheduled_from
  ON booking_sessions(rescheduled_from_id);
