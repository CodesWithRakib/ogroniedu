-- ==============================================================================
-- OgroniEdu — Migration 032: Compound Search & Availability Performance Indexes
-- Task: DB-002 (Phase 06)
-- Target: PostgreSQL 16+ / 18
-- ==============================================================================

-- 1. Compound index on tutor_profiles for price and experience filtering
CREATE INDEX IF NOT EXISTS ix_tutor_profiles_rate_exp
  ON tutor_profiles (hourly_rate_minor, years_experience)
  WHERE publication_status = 'published' AND verification_status = 'approved';

-- 2. Compound index on booking_sessions for active tutor scheduling lookups
CREATE INDEX IF NOT EXISTS ix_booking_sessions_active_schedule
  ON booking_sessions (tutor_user_id, status, starts_at)
  WHERE status IN ('scheduled', 'in_progress');

-- 3. Compound index on bookings for learner and tutor status lookups
CREATE INDEX IF NOT EXISTS ix_bookings_actor_status
  ON bookings (student_user_id, tutor_user_id, status, created_at DESC);
