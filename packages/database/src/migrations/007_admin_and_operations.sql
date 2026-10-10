-- Migration 007: Admin Operations, System Settings & Feature Flags
-- Phase 14 Core Schema

-- 1. System Settings Table (Platform Fee Rates, Cancellation Windows, Policies)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Feature Flags Table (Super-Admin Emergency Controls, Canary Toggles)
CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT false,
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Default Operational Settings Seed
INSERT INTO system_settings (key, value, description)
VALUES 
    ('platform_fee_percent', '{"percent": 8}'::jsonb, 'Platform commission fee percentage deducted upon session milestone completion'),
    ('cancellation_window_hours', '{"hours": 24}'::jsonb, 'Minimum hours before session for 100% guardian cancellation refund'),
    ('replacement_guarantee_trial_hours', '{"hours": 48}'::jsonb, 'Time window after trial session to invoke 100% tutor replacement guarantee'),
    ('impersonation_max_minutes', '{"minutes": 15}'::jsonb, 'Maximum allowable duration for emergency super-admin impersonation sessions')
ON CONFLICT (key) DO NOTHING;

-- 4. Default Feature Flags Seed
INSERT INTO feature_flags (key, enabled, rules)
VALUES 
    ('emergency_maintenance_mode', false, '{"allowRoles": ["admin", "super_admin"]}'::jsonb),
    ('instant_replacement_matching', true, '{}'::jsonb),
    ('strict_pnr_verification', true, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
