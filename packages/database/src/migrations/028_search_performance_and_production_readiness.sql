-- Migration: 028_search_performance_and_production_readiness.sql
-- Module: Search Performance, Trigram Text Indexing & Production Readiness
-- Target: PostgreSQL 16+ / 18

-- 1. Enable Trigram Extension for High-Performance Text & Fuzzy Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram GIN Indexes on Users and Tutor Profiles for Sub-Millisecond Search
CREATE INDEX IF NOT EXISTS ix_users_display_name_trgm 
ON users USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_tutor_profiles_headline_trgm 
ON tutor_profiles USING gin (headline gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_tutor_profiles_bio_trgm 
ON tutor_profiles USING gin (bio gin_trgm_ops);

-- 3. Partial Btree Index on Active Users (Prevents Full Table Scans in Discovery)
CREATE INDEX IF NOT EXISTS ix_users_active_search 
ON users (id) 
WHERE status = 'active' AND deleted_at IS NULL;

-- 4. Composite Partial Index on Tutor Qualifications (Accelerates Match Score Scoring)
CREATE INDEX IF NOT EXISTS ix_tutor_qualifications_search 
ON tutor_qualifications (tutor_user_id, review_status, qualification_type) 
WHERE review_status = 'approved';

-- 5. Multi-Column Filter & Sort Composite Index on Tutor Profiles
CREATE INDEX IF NOT EXISTS ix_tutor_profiles_composite_search 
ON tutor_profiles (publication_status, verification_status, safety_hold_status, hourly_rate_minor, years_experience) 
WHERE publication_status = 'published' AND verification_status = 'approved';

-- 6. Trigram Index on Taxonomy Subjects for Fast Subject Autocomplete and Matching
CREATE INDEX IF NOT EXISTS ix_subjects_name_en_trgm 
ON subjects USING gin (name_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_subjects_name_bn_trgm 
ON subjects USING gin (name_bn gin_trgm_ops);
