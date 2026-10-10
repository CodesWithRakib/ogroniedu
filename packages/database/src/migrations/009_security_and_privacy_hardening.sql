-- 009_security_and_privacy_hardening.sql
-- Security & Privacy indexes for audit trails, file assets, and privacy erasure processing

-- 1. Optimized file asset access indexes
CREATE INDEX IF NOT EXISTS ix_file_assets_owner ON file_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS ix_file_assets_created ON file_assets(created_at DESC);

-- 2. User privacy and lifecycle indexes for retention purge queue
CREATE INDEX IF NOT EXISTS ix_users_status_privacy ON users(status) WHERE status = 'deletion_pending';

-- 3. Rapid booking lookup for active commitment check before deletion
CREATE INDEX IF NOT EXISTS ix_bookings_active_participants ON bookings(requester_user_id, tutor_user_id, student_user_id, status);
