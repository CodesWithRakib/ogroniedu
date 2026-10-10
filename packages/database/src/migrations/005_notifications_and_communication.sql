-- ==============================================================================
-- OgroniEdu — Migration 005: Notifications and Communication
-- Target: PostgreSQL 16+ / 18
-- Standards: UUID v4 PK, TIMESTAMPTZ UTC, ABAC Scoped, Delivery Failure Protection
-- ==============================================================================

-- 1. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('booking', 'schedule', 'payment', 'learning', 'system', 'marketing')),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'whatsapp')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_preferences UNIQUE (user_id, category, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- 2. Participant-Scoped Booking Messages Table
CREATE TABLE IF NOT EXISTS booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0),
  is_redacted BOOLEAN NOT NULL DEFAULT false,
  redaction_reason TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_thread ON booking_messages(booking_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_booking_messages_unread ON booking_messages(recipient_user_id, read_at) WHERE read_at IS NULL;
