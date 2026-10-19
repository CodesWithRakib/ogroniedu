-- =============================================================================
-- 017_tutor_profile_localization.sql  (Phase 03 — bilingual tutor profiles)
-- =============================================================================
-- Tutors must be able to publish their headline and biography in both Bangla
-- and English. The public API serializes both values so the UI can render the
-- language that matches the visitor's locale.
--
-- The original `headline` / `bio` columns are kept as the canonical English
-- fallback for existing consumers (search ranking, older clients, admin
-- tooling). New writes keep them synchronized with `*_en`.
--
-- Bangla values are never machine-translated or copied from English: when a
-- tutor has not supplied Bangla copy the API returns NULL and the UI falls back
-- to English instead of showing fabricated content.
-- =============================================================================

ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS headline_en TEXT;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS headline_bn TEXT;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS bio_en TEXT;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS bio_bn TEXT;

-- Backfill English copy from the legacy columns. Idempotent: already-populated
-- rows are not overwritten.
UPDATE tutor_profiles
SET headline_en = headline
WHERE headline_en IS NULL
  AND headline IS NOT NULL;

UPDATE tutor_profiles
SET bio_en = bio
WHERE bio_en IS NULL
  AND bio IS NOT NULL;

-- Length ceilings mirror the API DTO (headline 160, bio 2000 characters).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutor_headline_en_length'
    ) THEN
        ALTER TABLE tutor_profiles
            ADD CONSTRAINT chk_tutor_headline_en_length
            CHECK (headline_en IS NULL OR char_length(headline_en) <= 160);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutor_headline_bn_length'
    ) THEN
        ALTER TABLE tutor_profiles
            ADD CONSTRAINT chk_tutor_headline_bn_length
            CHECK (headline_bn IS NULL OR char_length(headline_bn) <= 160);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutor_bio_en_length'
    ) THEN
        ALTER TABLE tutor_profiles
            ADD CONSTRAINT chk_tutor_bio_en_length
            CHECK (bio_en IS NULL OR char_length(bio_en) <= 2000);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tutor_bio_bn_length'
    ) THEN
        ALTER TABLE tutor_profiles
            ADD CONSTRAINT chk_tutor_bio_bn_length
            CHECK (bio_bn IS NULL OR char_length(bio_bn) <= 2000);
    END IF;
END $$;

-- Keyword search runs `ILIKE '%term%'` across both languages. That pattern
-- cannot use a B-tree index, and this project does not ship the pg_trgm
-- extension, so no index is added here rather than adding an unused one.
