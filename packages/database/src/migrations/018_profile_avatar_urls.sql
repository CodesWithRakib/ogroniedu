-- =============================================================================
-- 018_profile_avatar_urls.sql
-- =============================================================================
-- `UserEntity.avatarUrl` and `TutorProfileEntity.avatarUrl` have been mapped to
-- `users.avatar_url` / `tutor_profiles.avatar_url` since the initial schema, but
-- neither column was ever created. Every query that selects a mapped entity
-- (public tutor search, tutor profile, auth session) therefore failed at
-- runtime with:
--
--   column TutorProfileEntity.avatar_url does not exist
--
-- This migration creates the missing columns. Values stay nullable: a tutor
-- without an uploaded photo continues to render initials in the UI, and no
-- placeholder image is fabricated.
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;
