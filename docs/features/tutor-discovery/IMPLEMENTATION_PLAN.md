# Tutor Discovery — Implementation Plan (Phase 03)

**Date:** 2026-10-18 · **Status:** implemented in this phase (booking/payment lifecycle excluded).

## 1. Design principles

- One authoritative eligibility rule: `isDiscoveryEligible()` is reused by search and public profile.
- All filtering, sorting, counting and pagination happen in PostgreSQL; no full-table loads.
- Public DTOs are explicit whitelists; raw entities are never returned by public endpoints.
- Missing data is returned as `null`, never replaced with invented values.
- Replacement state changes validate a transition table, run in a transaction, and append history.
- Notification dispatch happens **after** the transaction commits and reuses the existing registry.

## 2. Backend changes

| Area            | Change                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Migration `016` | Service-area coordinates, `saved_tutors`, replacement metadata/statuses/events                                                                                           |
| Search DTO      | Add `minExperience`, `lat`, `lng`, `radiusKm`, `availableWeekday`, `sort=nearest                                                                                         | rating_desc`; keep existing params |
| Search service  | Two-step DB query: ranked IDs (LIMIT/OFFSET) then hydrate relations; correlated rating aggregates; haversine distance with bounding-box prefilter                        |
| Public profile  | Real review aggregates, completed-session count, availability, district names, distance-free public service areas                                                        |
| Saved tutors    | `SavedTutorEntity`, `/api/v1/saved-tutors` list/add/delete, authorization scoped to `user.id`                                                                            |
| Replacement     | Policy constants, transition map, DTO validation, case serializers, candidate suggestions, participant accept/decline, staff queue, overdue sweep, history/notifications |
| Taxonomy fix    | Honour `?all=true` correctly for subjects/levels/curricula/streams                                                                                                       |

## 3. Frontend changes

| Area             | Change                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search types/API | New filters and result fields (`distanceKm`, `ratingAverage`, `totalReviews`, `nextAvailableWeekday`)                                                                        |
| Filter form      | Subject/level/curriculum selects from taxonomy, mode, fee range, experience, radius, sort, clear; active-filter chips                                                        |
| Discovery page   | URL-synchronised filters, 350 ms debounce, page reset on filter change, real count/pagination, save/unsave                                                                   |
| Tutor card       | Real rating only when reviews exist; correct academic badge; distance; save button                                                                                           |
| Public profile   | Complete rewrite without any fallback data; loading/404/error states; real qualifications, availability, fee, service areas, badges, review aggregate; authenticated actions |
| Saved tutors     | `/dashboard/saved-tutors` page + RTK Query cache tags                                                                                                                        |
| Replacement      | Participant case list with deadline/refund eligibility, accept/decline; staff queue at `/dashboard/admin/replacements` with filters, transitions, notes, candidates          |
| Notifications    | Reuse `tutor.replacement`; update navigation target to the authorized case page                                                                                              |

## 4. Out of scope (explicit)

- Full booking lifecycle, escrow payment execution, refund disbursement.
- Geocoding provider, PostGIS, external matching provider.
- LMS, Phase 04 features.
- Tutor comparison (not present in existing product requirements).

## 5. Validation strategy

- Unit/integration tests in `apps/api/test` with mocked repositories for logic and real DB checks in
  the migration validation step.
- Web unit tests in `apps/web/test` plus Playwright specs for discovery/profile/replacement journeys.
- Typecheck, lint, API build, web production build.
- Manual API smoke test against the running PostgreSQL database.
