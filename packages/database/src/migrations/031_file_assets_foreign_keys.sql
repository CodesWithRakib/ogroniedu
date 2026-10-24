-- ==============================================================================
-- OgroniEdu — Migration 031: File Assets Referential Integrity & Indexing
-- Task: DB-001 (Phase 06)
-- Target: PostgreSQL 16+ / 18
-- ==============================================================================

-- 1. Index on file_assets(owner_user_id, created_at) for fast owner retrieval
CREATE INDEX IF NOT EXISTS ix_file_assets_owner_created
  ON file_assets (owner_user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. Index on tutor_verification_documents(file_asset_id) to eliminate table scan during cascading deletes
CREATE INDEX IF NOT EXISTS ix_tutor_verification_documents_file_asset
  ON tutor_verification_documents (file_asset_id)
  WHERE deleted_at IS NULL;

-- 3. GIN index on booking_messages(attachment_asset_ids) for efficient attachment lookup
CREATE INDEX IF NOT EXISTS ix_booking_messages_attachments_gin
  ON booking_messages USING gin (attachment_asset_ids);
