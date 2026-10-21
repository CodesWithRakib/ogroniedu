-- Migration 030: Privacy-Conscious Product Analytics Events & Funnel Tracking
-- Phase 14 Core Schema

CREATE TABLE IF NOT EXISTS product_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(64) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'anonymous',
    session_id VARCHAR(64),
    entity_type VARCHAR(64),
    entity_id VARCHAR(64),
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment VARCHAR(16) NOT NULL DEFAULT 'production',
    client_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_name_valid CHECK (
        event_name IN (
            'registration_started',
            'registration_completed',
            'onboarding_step_completed',
            'onboarding_completed',
            'tutor_search_performed',
            'tutor_profile_viewed',
            'booking_started',
            'booking_request_submitted',
            'booking_confirmed',
            'booking_cancelled',
            'session_attended',
            'session_completed',
            'homework_submitted',
            'homework_reviewed',
            'feedback_submitted'
        )
    )
);

-- Optimized Compound Indexes for Temporal Querying, Funnel Slicing & Actor Isolation
CREATE INDEX IF NOT EXISTS ix_analytics_events_name_time ON product_analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_analytics_events_actor ON product_analytics_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_analytics_events_entity ON product_analytics_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_analytics_events_session ON product_analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_analytics_events_created_at ON product_analytics_events(created_at DESC);

-- View: Aggregated Daily Funnel Metrics from Real Persisted Records & Events
CREATE OR REPLACE VIEW v_daily_product_funnel AS
SELECT 
    DATE_TRUNC('day', e.created_at)::date as metric_date,
    COUNT(e.id) FILTER (WHERE e.event_name = 'tutor_search_performed')::int as search_count,
    COUNT(e.id) FILTER (WHERE e.event_name = 'tutor_profile_viewed')::int as profile_views_count,
    COUNT(e.id) FILTER (WHERE e.event_name = 'booking_started')::int as bookings_started_count,
    COUNT(e.id) FILTER (WHERE e.event_name = 'booking_request_submitted')::int as booking_requests_count,
    COUNT(e.id) FILTER (WHERE e.event_name = 'booking_confirmed')::int as bookings_confirmed_count,
    COUNT(e.id) FILTER (WHERE e.event_name = 'session_completed')::int as sessions_completed_count
FROM product_analytics_events e
GROUP BY DATE_TRUNC('day', e.created_at)::date;
