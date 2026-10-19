# Search Filter → Data Matrix (Phase 03)

The table below is the authoritative mapping between each supported filter and the database fields
that back it. A filter is only exposed in the UI when its data is reliably maintained.

| Query param                | UI label           | Database source / predicate                                                                                                                                                                                                                                             | Notes                                                                                                                         |
| -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `q`                        | Keyword            | `users.display_name`, `tutor_profiles.headline/bio` (legacy English) plus `headline_en/headline_bn/bio_en/bio_bn`, `tutor_qualifications.title/institution` (approved), `subjects.name_en/name_bn/code`, `tutor_service_areas.locality_name/district_code/upazila_code` | Case-insensitive `ILIKE`; parameterised. Bangla and English copy are both searchable. Text is debounced 350 ms on the client. |
| `subjectId`                | Subject            | `EXISTS tutor_subjects WHERE subject_id = :subjectId`                                                                                                                                                                                                                   | UUID validated server-side.                                                                                                   |
| `educationLevelId`         | Class / level      | `EXISTS tutor_subjects WHERE education_level_id = :educationLevelId`                                                                                                                                                                                                    | UUID validated server-side.                                                                                                   |
| `curriculumId`             | Curriculum / board | `EXISTS tutor_subjects WHERE curriculum_id = :curriculumId`                                                                                                                                                                                                             | UUID validated server-side.                                                                                                   |
| `mode`                     | Teaching method    | `:mode = ANY(tutor_profiles.teaching_modes)`                                                                                                                                                                                                                            | One of `in_person`, `online`, `hybrid`. `hybrid` is a distinct stored value, not an alias.                                    |
| `minPrice` / `maxPrice`    | Hourly fee (BDT)   | `tutor_profiles.hourly_rate_minor`                                                                                                                                                                                                                                      | Integers in poisha. Tutors with a NULL rate are excluded when either bound is supplied.                                       |
| `minExperience`            | Minimum experience | `tutor_profiles.years_experience`                                                                                                                                                                                                                                       | Integer ≥ 0. NULL experience does not pass a supplied minimum.                                                                |
| `districtCode`             | District           | `EXISTS tutor_service_areas WHERE lower(district_code) = lower(:code)`                                                                                                                                                                                                  | Free-text administrative code; exact case-insensitive match.                                                                  |
| `upazilaCode`              | Upazila / area     | `EXISTS tutor_service_areas WHERE lower(upazila_code) = lower(:code)`                                                                                                                                                                                                   | Combined with district when both are supplied.                                                                                |
| `lat` + `lng` + `radiusKm` | Distance radius    | `tutor_service_areas.latitude/longitude`; bounding-box prefilter + haversine (`6371 km`)                                                                                                                                                                                | All three are required together. Radius bounded to 1–100 km. Tutors without coordinates are excluded.                         |
| `availableWeekday`         | Availability day   | `EXISTS tutor_availability WHERE is_active AND weekday = :d AND (effective_from IS NULL OR <= today) AND (effective_until IS NULL OR >= today)`                                                                                                                         | Weekday 0=Sunday…6=Saturday. Only active, date-effective slots.                                                               |
| `sort=recommended`         | Recommended        | Deterministic score (see below)                                                                                                                                                                                                                                         | Default.                                                                                                                      |
| `sort=nearest`             | Nearest first      | `MIN(haversine)` across service areas                                                                                                                                                                                                                                   | Requires `lat`/`lng`; otherwise the API rejects the request with 400 rather than silently re-sorting.                         |
| `sort=price_asc/desc`      | Fee                | `hourly_rate_minor`                                                                                                                                                                                                                                                     | NULL rates sort last; ties broken by `user_id`.                                                                               |
| `sort=experience_desc`     | Experience         | `years_experience`                                                                                                                                                                                                                                                      | NULL sorts last; ties broken by `user_id`.                                                                                    |
| `sort=rating_desc`         | Rating             | `AVG(reviews.rating)` where `moderation_status='published'`                                                                                                                                                                                                             | Tutors with no published review sort last. Not shown as a rating value when `totalReviews = 0`.                               |
| `page` / `pageSize`        | Pagination         | SQL `LIMIT/OFFSET`                                                                                                                                                                                                                                                      | Page size 1–50, default 12/10 per client; total count is a separate `COUNT`.                                                  |

## Mandatory eligibility (applied before any filter/ranking)

```
tutor_profiles.publication_status = 'published'
AND tutor_profiles.verification_status = 'approved'
AND (verification_expires_at IS NULL OR verification_expires_at > now())
AND users.status = 'active'
AND users.deleted_at IS NULL
```

Implemented once in `isDiscoveryEligible()` and mirrored in SQL; a public profile and a search result
can never disagree about eligibility.

## Bilingual public copy

Tutor-authored free text is stored and serialized in both languages:

| Public field | Database column                                             | UI behaviour                                            |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| `headlineEn` | `tutor_profiles.headline_en` (legacy `headline` mirrors it) | Shown on `/en` routes.                                  |
| `headlineBn` | `tutor_profiles.headline_bn`                                | Shown on `/bn` routes; falls back to English when NULL. |
| `bioEn`      | `tutor_profiles.bio_en` (legacy `bio` mirrors it)           | Shown on `/en` routes.                                  |
| `bioBn`      | `tutor_profiles.bio_bn`                                     | Shown on `/bn` routes; falls back to English when NULL. |

Bangla is never machine-translated or copied from English. Tutors edit both languages in
`/dashboard/tutor/profile`; onboarding collects English and Bangla copy as separate fields. The client
resolver is `localizedTutorText()` in `apps/web/src/features/tutor-discovery/utils/localized-tutor-text.ts`.

## Ranking formula (documented, deterministic)

`matchScore = 100` (approved platform tutor)
`+ 20` if an approved NID/identity qualification exists
`+ 20` if an approved degree/academic certificate exists
`+ min(yearsExperience * 5, 50)`
`+ 10` if `response_time_minutes <= 60`.

Tie-break: `matchScore DESC, user_id ASC`. No hidden or per-request weights. Filters are hard
constraints and are never outranked by a higher score.

## Unsupported / deliberately omitted filters

| Candidate filter           | Reason omitted                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Language                   | No language column or reliable tutor-maintained data.                                                            |
| Precise tutor home address | Privacy policy; only coarse service areas are stored.                                                            |
| Precise pupil location     | Not persisted; search location is a transient query parameter.                                                   |
| Rating below threshold     | Ratings exist only for reviewed tutors; absence is not a low rating, so filtering would misrepresent new tutors. |
| “Currently online”         | No reliable presence signal is stored.                                                                           |
