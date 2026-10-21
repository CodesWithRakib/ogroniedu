# Phase 10: Search, SEO, Performance, Accessibility & Production Readiness
## Search Architecture & Query Optimization

This document outlines the architecture, indexing strategy, and ranking formula of OgroniEdu's database-backed tutor discovery engine.

---

## 1. Engine Decision: PostgreSQL vs External Search Service

### Evaluation
- **External Search (Elasticsearch / Typesense / Meilisearch):**
  - Introduces substantial operational complexity: external JVM/Go daemon, secondary data store, dual-write synchronization hazards, eventual consistency lag on tutor suspensions/holds, and additional memory overhead.
- **PostgreSQL 18 Native Engine:**
  - ACID transactional consistency: immediate reflection of verification approval, profile publication, or emergency safety holds.
  - Native support for `pg_trgm` (trigram matching) and GiST/SP-GiST for geospatial queries.
  - Sub-millisecond execution times when queries utilize partial and composite indexes.
  - Zero synchronization delay or split-brain risks.

**Decision:** Maintain PostgreSQL as the single source of truth and optimize search using trigram GIN indexes, partial indexes, and selective column projection.

---

## 2. Match Scoring & Ranking Formula

The ranking score is computed entirely within PostgreSQL to ensure stable pagination:

$$\text{Score} = 100 + B_{\text{NID}} + B_{\text{Acad}} + \min(\text{Exp} \times 5, 50) + R_{\text{Response}}$$

Where:
- **Base Score:** 100 for all approved published tutors.
- **Verified NID ($B_{\text{NID}}$):** +20 points if an approved NID qualification exists.
- **Verified Degree ($B_{\text{Acad}}$):** +20 points if an approved degree/certificate qualification exists.
- **Experience:** +5 points per year of experience, capped at +50 points (10 years).
- **Fast Responder ($R_{\text{Response}}$):** +10 points if median response time is $\le 60$ minutes.

---

## 3. Indexing Strategy (Migration 028)

To support low-latency search across multiple dimensions:

1. **Active Users Partial Index:**
   ```sql
   CREATE INDEX ix_users_active_search ON users (id)
   WHERE status = 'active' AND deleted_at IS NULL;
   ```
2. **Tutor Qualifications Partial Index:**
   ```sql
   CREATE INDEX ix_tutor_qualifications_search 
   ON tutor_qualifications (tutor_user_id, review_status, qualification_type)
   WHERE review_status = 'approved';
   ```
3. **Tutor Profiles Search Composite Index:**
   ```sql
   CREATE INDEX ix_tutor_profiles_composite_search
   ON tutor_profiles (publication_status, verification_status, safety_hold_status, hourly_rate_minor, years_experience)
   WHERE publication_status = 'published' AND verification_status = 'approved';
   ```
4. **Trigram Search Extension & GIN Indexes:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX ix_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
   CREATE INDEX ix_tutor_profiles_headline_trgm ON tutor_profiles USING gin (headline gin_trgm_ops);
   CREATE INDEX ix_tutor_profiles_bio_trgm ON tutor_profiles USING gin (bio gin_trgm_ops);
   ```

---

## 4. Query Bounds & Stable Pagination

1. **Pagination Limits:** Query param `limit` is strictly bounded between 1 and 50 (default 12).
2. **Stable Tie-Breakers:** Every search sort includes `tp.user_id ASC` as the ultimate tie-breaker to prevent pagination jitter or duplicate rows across pages.
3. **Defensive Geospatial Bounding Box:** When searching by radius, an indexed latitude/longitude bounding box is applied first, ensuring the expensive spherical Haversine formula runs only on candidate records within the box.
