-- =============================================================================
-- 020_bilingual_schema_cleanup.sql
-- Backfill and ensure all bilingual fields (*_en, *_bn) exist and contain data
-- from legacy un-suffixed columns across users, tutor_qualifications,
-- tutor_profiles, and tutor_service_areas.
-- =============================================================================

-- 1. tutor_qualifications
ALTER TABLE tutor_qualifications ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE tutor_qualifications ADD COLUMN IF NOT EXISTS title_bn TEXT;
ALTER TABLE tutor_qualifications ADD COLUMN IF NOT EXISTS institution_en TEXT;
ALTER TABLE tutor_qualifications ADD COLUMN IF NOT EXISTS institution_bn TEXT;

UPDATE tutor_qualifications
SET title_en = COALESCE(title_en, title)
WHERE title_en IS NULL AND title IS NOT NULL;

UPDATE tutor_qualifications
SET institution_en = COALESCE(institution_en, institution)
WHERE institution_en IS NULL AND institution IS NOT NULL;

-- 2. tutor_profiles
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS headline_en TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS headline_bn TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_en TEXT;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bio_bn TEXT;

UPDATE tutor_profiles
SET headline_en = COALESCE(headline_en, headline)
WHERE headline_en IS NULL AND headline IS NOT NULL;

UPDATE tutor_profiles
SET bio_en = COALESCE(bio_en, bio)
WHERE bio_en IS NULL AND bio IS NOT NULL;

-- 3. users
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name_en TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name_bn TEXT;

UPDATE users
SET display_name_en = COALESCE(display_name_en, display_name)
WHERE display_name_en IS NULL AND display_name IS NOT NULL;

UPDATE users
SET display_name_bn = COALESCE(display_name_bn, display_name)
WHERE display_name_bn IS NULL AND display_name IS NOT NULL;

-- 4. tutor_service_areas
ALTER TABLE tutor_service_areas ADD COLUMN IF NOT EXISTS locality_name_en TEXT;
ALTER TABLE tutor_service_areas ADD COLUMN IF NOT EXISTS locality_name_bn TEXT;

UPDATE tutor_service_areas
SET locality_name_en = COALESCE(locality_name_en, locality_name)
WHERE locality_name_en IS NULL AND locality_name IS NOT NULL;

UPDATE tutor_service_areas
SET locality_name_bn = COALESCE(locality_name_bn, locality_name)
WHERE locality_name_bn IS NULL AND locality_name IS NOT NULL;
