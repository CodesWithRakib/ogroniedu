-- =============================================================================
-- 021_review_bilingual_fields.sql
-- =============================================================================
-- The seed runner and review UI expect bilingual review text columns that were
-- never added by 020_bilingual_schema_cleanup.sql. Additive only; legacy
-- `comment` / `tutor_response` columns remain the source of truth for old rows.
-- =============================================================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment_en TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment_bn TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tutor_response_en TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tutor_response_bn TEXT;

UPDATE reviews
SET comment_en = COALESCE(comment_en, comment)
WHERE comment_en IS NULL AND comment IS NOT NULL;

UPDATE reviews
SET comment_bn = COALESCE(comment_bn, comment)
WHERE comment_bn IS NULL AND comment IS NOT NULL;

UPDATE reviews
SET tutor_response_en = COALESCE(tutor_response_en, tutor_response)
WHERE tutor_response_en IS NULL AND tutor_response IS NOT NULL;

UPDATE reviews
SET tutor_response_bn = COALESCE(tutor_response_bn, tutor_response)
WHERE tutor_response_bn IS NULL AND tutor_response IS NOT NULL;
