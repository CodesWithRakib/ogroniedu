# Tutor Discovery, Location Matching & Replacement Guarantee — Audit (Phase 03)

**Date:** 2026-10-18
**Scope:** public tutor discovery, advanced search/filtering, location matching, public tutor
profiles, saved tutors, and the tutor replacement guarantee workflow.
**Method:** direct inspection of the current repository and the running PostgreSQL database
(27 `tutor_profiles` rows at audit time), then verification against executable tests.

Stack observed (not assumed):

| Concern         | Actual implementation                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| Frontend        | Next.js 16 App Router (`apps/web`), Redux Toolkit + RTK Query, Tailwind, custom UI components |
| Backend         | NestJS 12 + TypeORM 1.1.2, global validation pipe, feature modules                            |
| Database        | PostgreSQL 16, forward-only SQL migrations (`packages/database/src/migrations`)               |
| Geospatial      | No PostGIS extension and no geocoding provider installed                                      |
| Notifications   | Central registry in `packages/contracts/src/notification-registry.ts` + Socket.IO gateway     |
| Tests           | Vitest (API/web/database), Playwright (web e2e)                                               |
| Package manager | pnpm workspaces + Turborepo                                                                   |

---

## 1. What already existed and is reused

| Area                     | Existing implementation                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Discovery API            | `GET /api/v1/tutors/search`, `GET /api/v1/tutors/public/:id` (`apps/api/src/modules/tutors`)                                  |
| Search DTOs              | `search-tutors-query.dto.ts`, `search-tutors-response.dto.ts`, `tutor-public-profile.dto.ts`                                  |
| Eligibility rule         | `isDiscoveryEligible()` in `services/verification-state-machine.ts`                                                           |
| Tutor profile data       | `tutor_profiles`, `tutor_subjects`, `tutor_service_areas`, `tutor_availability`, `tutor_qualifications`                       |
| Verification gate        | `verification_status = 'approved'` + `publication_status = 'published'` + account active + not expired                        |
| Discovery UI             | `apps/web/src/features/tutor-discovery/*` (filters, result grid, card, booking-request modal)                                 |
| Public profile UI        | `apps/web/src/features/tutors/pages/tutor-details-page.tsx`                                                                   |
| Replacements (partial)   | `tutor_replacement_cases` + `GET/POST/PATCH /api/v1/tutor-replacements` + `tutor-replacement.service.ts`                      |
| Replacement UI           | `apps/web/src/app/[locale]/(dashboard)/tutor-replacements/page.tsx`, `features/trust/components/tutorReplacementModal.tsx`    |
| Notification event       | `tutor.replacement` already defined in the registry                                                                           |
| Booking participant data | `bookings.requester_user_id`, `student_user_id`, `tutor_user_id`, `status`; `booking_sessions` with `cancellation_assessment` |
| Reviews                  | `reviews` table with `moderation_status`; `GET /api/v1/reviews/tutors/:id`                                                    |
| Taxonomy                 | `subjects`, `education_levels`, `curricula`; public taxonomy endpoints                                                        |

## 2. Defects and gaps found

| ID   | Severity | Finding                                                                                                                                                                                                                                                     |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1  | **High** | `GET /public/:id` returned **fabricated** `ratingAverage: 4.9`, `totalReviews: 48`, `completedSessions: 120` for every tutor. No review/session query existed.                                                                                              |
| F-2  | **High** | `tutor-details-page.tsx` fell back to three hardcoded fake tutors (`FALLBACK_TUTORS_DETAILS`) with invented reviews, statistics, fees, availability and qualifications when the API was missing or failed.                                                  |
| F-3  | **High** | `tutorCard.tsx` always rendered “4.9 / 48 reviews” regardless of real data (hardcoded rating demonstration).                                                                                                                                                |
| F-4  | **High** | Search was executed **in application memory**: every published profile was loaded with four relations, then filtered/sorted/paginated in JS. No DB-level pagination, no scalable filtering.                                                                 |
| F-5  | **High** | No location matching at all: `tutor_service_areas` had no coordinates and search accepted no coordinates/radius; `sort=nearest` could not exist.                                                                                                            |
| F-6  | **High** | Public profile serialization did not include availability timing data from the DB (only mapping existed), and `search` results had no availability/distance/rating fields.                                                                                  |
| F-7  | Medium   | Search sort had no deterministic tie-breaker (equal `matchScore` / rates produced nondeterministic order across pages).                                                                                                                                     |
| F-8  | Medium   | `verified_academic` badge was emitted by the API but the card checked `verified_degree`, so the academic badge never rendered.                                                                                                                              |
| F-9  | Medium   | Saved tutors did not exist: no table, entity, endpoint, UI, or cache tag.                                                                                                                                                                                   |
| F-10 | **High** | Replacement flow had **no state-machine validation**: any admin could jump from `requested` to `accepted`/`closed`; no deadline, no history, no concurrency guard, no refund-eligibility tracking.                                                          |
| F-11 | **High** | Anyone could accept a replacement by calling `PATCH /:id` as admin (`accepted`) — user consent was not required. The participant page called the admin-only endpoint.                                                                                       |
| F-12 | Medium   | Duplicate active requests were checked with a read-then-write race and no database constraint.                                                                                                                                                              |
| F-13 | Medium   | Replacement case detail exposed raw entity fields including `outcomeNotes`; there was no separation between internal notes and applicant-facing text.                                                                                                       |
| F-14 | Medium   | No staff queue filtering by status/deadline, no overdue detection, no candidate suggestions, no participant decline path.                                                                                                                                   |
| F-15 | Medium   | Replacement booking status was set to `replacement_requested` **outside a transaction** and before notifications; partial failures left inconsistent state.                                                                                                 |
| F-16 | Low      | `GET /taxonomy/subjects`/`education-levels` computed an `all` filter but ignored it (always returned all rows).                                                                                                                                             |
| F-17 | Low      | Discovery page did not persist filters in the URL, did not debounce text input, and did not reset pagination consistently on filter changes.                                                                                                                |
| F-18 | Low      | Service-area district names were never enriched in API responses; UI had to display raw codes or a hardcoded “ঢাকা”.                                                                                                                                        |
| F-19 | **High** | Tutor profiles had only single-language `headline`/`bio`. A Bangla visitor and an English visitor saw the same copy, and there was no tutor-owned screen to enter both languages.                                                                           |
| F-20 | **High** | Both `users.avatar_url` and `tutor_profiles.avatar_url` were mapped in TypeORM but the columns did not exist. Every entity query (public search, tutor profile, auth session) failed at runtime with `column TutorProfileEntity.avatar_url does not exist`. |

## 3. Privacy and authorization findings

- Public search/profile endpoints are intentionally unauthenticated; they returned only
  whitelisted fields, but **profile detail fabricated review data** (F-1/F-2), which is a truthfulness
  defect, not just a UI defect.
- No private verification evidence, NID, email, phone or address is exposed by the public DTOs.
  This invariant is preserved.
- `tutor_service_areas` contains `district_code`, `upazila_code` and `locality_name` (coarse service
  area). Phase 03 adds optional **service-area centre coordinates** only; no home address column is
  added and no exact address may be stored in it.
- Replacement case access already checked requester/student/guardian/admin, but admin updates had no
  transition validation and participant consent was bypassable (F-10/F-11).
- Saved tutors must be user-private; no organization/tenant concept exists for saved lists.

## 4. Database/migration requirements identified

1. `tutor_service_areas.latitude/longitude` (nullable, range-checked, partial geo index).
2. `saved_tutors` table with `(user_id, tutor_user_id)` primary key.
3. `tutor_replacement_cases`: deadline, extension, refund eligibility, user-visible note, version,
   overdue marker, extended status vocabulary.
4. `tutor_replacement_case_events`: append-only per-case history with user-visible vs internal notes.
5. Partial unique index for one active replacement case per booking.
6. `tutor_profiles.headline_en/headline_bn/bio_en/bio_bn` with backfill from the legacy English
   columns; Bangla values are left NULL rather than copied from English.
7. `users.avatar_url` and `tutor_profiles.avatar_url` to match the already-mapped entities.

## 5. Dependencies on earlier phases

- **Phase 01 (auth/RBAC):** `AuthGuard`, `RolesGuard`, `ADMIN_ROLES`, auth user shape.
- **Phase 02 (verification dossier):** authoritative `verification_status` and expiry; discovery must
  continue to call `isDiscoveryEligible()`.
- **Bookings:** participant IDs and statuses are required for replacement eligibility. The complete
  booking/payment lifecycle is **not** implemented here; no escrow or refund execution is performed.
- **Notifications:** registry + gateway are reused; no second notification system is created.

## 6. Policy gap (recorded, not invented)

`docs/BUSINESS_RULES.md` §3 states:

- request must be filed within **48 hours** of the first trial/introductory session;
- operations offers up to **2** alternate verified tutors within **24 hours**;
- if no tutor is accepted, the guardian receives a 100% refund.

The Phase 03 brief refers to a “48-hour” replacement target. The repository policy is 24-hour
matching + 48-hour request window. Phase 03 implements the **repository** policy as configurable
constants and documents the discrepancy in `REPLACEMENT_WORKFLOW.md`. It does not invent a new
contractual promise. Environment override: `TUTOR_REPLACEMENT_MATCH_TARGET_HOURS`.

## 7. Geocoding limitation

No geocoding provider or map SDK is installed. Phase 03:

- accepts **explicit** latitude/longitude (browser geolocation or manual selection) for search;
- uses tutor-approved service-area coordinates;
- never derives coordinates from an address, never silently substitutes another location, and
  returns `distanceKm: null` when a tutor has no coordinates;
- keeps administrative district/upazila filters working without geocoding.
