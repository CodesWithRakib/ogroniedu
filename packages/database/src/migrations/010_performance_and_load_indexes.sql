-- ==============================================================================
-- OgroniEdu — Performance Optimization & High-Throughput Indexes Migration (010)
-- Phase 19: Performance and Load Testing Optimizations
-- ==============================================================================

-- 1. Optimize Booking Sessions retrieval by booking_id with ordered timeline
CREATE INDEX IF NOT EXISTS ix_booking_sessions_booking_start 
ON booking_sessions(booking_id, starts_at ASC);

-- 2. Optimize Global Administrative Audit Log Streams (eliminates Sort node)
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_desc 
ON audit_logs(created_at DESC);

-- 3. Optimize Multi-Dimensional Tutor Search price-range ordering on published profiles
CREATE INDEX IF NOT EXISTS ix_tutor_profiles_price_search 
ON tutor_profiles(hourly_rate_minor, verification_status, publication_status) 
WHERE publication_status = 'published';

-- 4. Optimize Transactional Outbox Worker polling with retry count awareness
CREATE INDEX IF NOT EXISTS ix_outbox_events_pending_batch 
ON outbox_events(created_at ASC, attempts) 
WHERE published_at IS NULL;
