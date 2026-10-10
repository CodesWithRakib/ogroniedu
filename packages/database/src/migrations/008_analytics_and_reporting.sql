-- Migration 008: Analytics & Operational Reporting
-- Phase 15 Core Schema & Reporting Indexes

-- 1. Optimized Compound Indexes for Temporal Querying
CREATE INDEX IF NOT EXISTS ix_bookings_created_status ON bookings(created_at, status);
CREATE INDEX IF NOT EXISTS ix_booking_sessions_start_status ON booking_sessions(starts_at, status);
CREATE INDEX IF NOT EXISTS ix_payment_orders_created_status ON payment_orders(created_at, status);
CREATE INDEX IF NOT EXISTS ix_payment_refunds_created_status ON payment_refunds(created_at, status);
CREATE INDEX IF NOT EXISTS ix_tutor_replacement_created_status ON tutor_replacement_cases(created_at, status);
CREATE INDEX IF NOT EXISTS ix_safety_reports_created_status ON safety_reports(created_at, status);

-- 2. Daily Operational Booking Funnel Reporting View
CREATE OR REPLACE VIEW v_operational_daily_metrics AS
SELECT
    DATE_TRUNC('day', b.created_at)::date AS metric_date,
    COUNT(b.id)::int AS total_booking_requests,
    COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'in_progress', 'completed'))::int AS confirmed_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::int AS cancelled_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'declined')::int AS declined_bookings
FROM bookings b
GROUP BY DATE_TRUNC('day', b.created_at)::date;
