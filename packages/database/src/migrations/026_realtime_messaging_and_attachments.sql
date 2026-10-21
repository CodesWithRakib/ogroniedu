-- ==============================================================================
-- OgroniEdu — Migration 026: Real-Time Messaging Enhancements & Attachments
-- Target: PostgreSQL 16+ / 18
-- Standards: UUID v4 PK, TIMESTAMPTZ UTC, ABAC Scoped, Attachment Tracking
-- ==============================================================================

-- 1. Extend booking_messages with attachments and metadata
ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS attachment_asset_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Performance indexes for real-time cursor navigation & conversation aggregations
CREATE INDEX IF NOT EXISTS idx_booking_messages_cursor
  ON booking_messages(booking_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_recipient
  ON booking_messages(sender_user_id, recipient_user_id);
