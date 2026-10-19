# Tutor Discovery, Location Matching & Replacement Guarantee — Implementation Report (Phase 03)

**Date:** 2026-10-19
**Scope:** public tutor discovery, advanced search/filtering, location matching, public tutor
profiles, bilingual tutor copy, saved tutors, and the tutor replacement guarantee workflow.
**Evidence:** each result below was produced by running the command shown against this repository and
the local PostgreSQL database in this session. No result is inferred from code inspection alone.

Legend: **implemented** · **automated-tested** · **manually-verified** (running API + real
PostgreSQL) · **externally-verified** (third-party provider confirmed) · **unverified**.

---

## 1. Audit findings (summary)

Full detail is in `AUDIT.md`. The highest-impact findings were:

| ID   | Finding                                                                                                                         | Resolution                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| F-1  | Public profile returned fabricated rating/review/session counts                                                                 | **Fixed** — real published-review and completed-session aggregates; `null` when no data |
| F-2  | Profile page fell back to hardcoded fake tutors on API failure                                                                  | **Fixed** — explicit loading, error and unavailable states; no fallback profiles        |
| F-3  | Tutor card always showed “4.9 / 48 reviews”                                                                                     | **Fixed** — rating rendered only when published reviews exist                           |
| F-4  | Search loaded every profile and filtered/sorted/paginated in memory                                                             | **Fixed** — DB-level eligibility, filters, ordering, `LIMIT/OFFSET`, bounded `COUNT`    |
| F-5  | No location matching or coordinates                                                                                             | **Fixed** — nullable service-area coordinates, bounding box + haversine, 1–100 km bound |
| F-6  | Search/profile responses lacked distance, availability, rating                                                                  | **Fixed** — added to the public response DTOs                                           |
| F-7  | Nondeterministic ordering                                                                                                       | **Fixed** — `user_id` tie-break on every sort                                           |
| F-8  | `verified_academic` badge never rendered                                                                                        | **Fixed** — card accepts the real badge key                                             |
| F-9  | Saved tutors did not exist                                                                                                      | **Fixed** — table, endpoints, cache tags, dashboard page                                |
| F-10 | No replacement state validation, deadline, history or concurrency guard                                                         | **Fixed** — transition map, optimistic `version`, deadline, append-only event history   |
| F-11 | Participant consent bypassable through admin `PATCH`                                                                            | **Fixed** — participant `accept`/`decline` endpoints; staff cannot force `accepted`     |
| F-12 | Duplicate active cases check-then-write race                                                                                    | **Fixed** — transaction + service check + partial unique index                          |
| F-13 | Case detail leaked `outcomeNotes`                                                                                               | **Fixed** — applicant-facing notes separated from internal notes                        |
| F-19 | Tutor copy was single-language; no tutor screen to enter Bangla and English                                                     | **Fixed** — bilingual columns, API fields, locale resolver, tutor profile editor, tests |
| F-20 | `users.avatar_url` / `tutor_profiles.avatar_url` were mapped but missing in the database; every public search returned HTTP 500 | **Fixed** — migration `018_profile_avatar_urls.sql`; verified by a live search request  |

## 2. Files created / modified

**Created**

- `packages/database/src/migrations/017_tutor_profile_localization.sql`
- `packages/database/src/migrations/018_profile_avatar_urls.sql`
- `apps/web/src/features/tutor-discovery/utils/localized-tutor-text.ts`
- `apps/web/src/features/tutors/pages/tutor-profile-settings-page.tsx`
- `apps/web/src/app/[locale]/dashboard/tutor/profile/page.tsx`
- `apps/web/test/tutor-localization.spec.ts`
- `apps/api/test/onboarding-validators.spec.ts`
- `apps/web/e2e/tutor.localization.spec.ts`
- `docs/features/tutor-discovery/IMPLEMENTATION_REPORT.md` (this file)

**Modified — API / contracts / database**

- `apps/api/src/modules/tutors/entities/tutor-profile.entity.ts`
- `apps/api/src/modules/tutors/dto/update-tutor-profile.dto.ts`
- `apps/api/src/modules/tutors/dto/search-tutors-response.dto.ts`
- `apps/api/src/modules/tutors/dto/tutor-public-profile.dto.ts`
- `apps/api/src/modules/tutors/services/tutor-profile.service.ts`
- `apps/api/src/modules/tutors/services/tutor-search.service.ts`
- `apps/api/src/modules/tutors/services/tutor-dossier.service.ts`
- `apps/api/src/modules/onboarding/onboarding-validators.ts`
- `packages/contracts/src/tutors.ts`
- `packages/database/src/seeds/initial_seed.ts`
- `packages/database/test/bcdr-recovery.spec.ts`
- `apps/api/test/tutors.service.spec.ts`

**Modified — web**

- `apps/web/src/features/tutor-discovery/{types/tutor-discovery.types.ts,index.ts}`
- `apps/web/src/features/tutor-discovery/components/tutorCard.tsx`
- `apps/web/src/features/tutor-discovery/pages/tutors-page.tsx`
- `apps/web/src/features/tutor-discovery/utils/catalog-filter.ts`
- `apps/web/src/features/tutors/pages/tutor-details-page.tsx`
- `apps/web/src/features/tutors/index.ts`
- `apps/web/src/features/onboarding/step-forms.ts`
- `apps/web/src/features/public/pages/home-page.tsx`
- `apps/web/src/app/[locale]/(dashboard)/saved-tutors/page.tsx`
- `apps/web/src/lib/navigation.ts`
- `apps/web/src/store/services/tutors-api.ts`
- `apps/web/test/auth-session-storage.spec.ts`

**Removed:** none.

## 3. Implemented routes and endpoints

### Public API

| Method | Route                        | Behaviour                                                                                    |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/tutors/search`      | Eligibility gate, filters, deterministic sort, pagination, bilingual copy, distance, ratings |
| GET    | `/api/v1/tutors/public/:id`  | Same eligibility gate as search; whitelisted public DTO; bilingual copy; real aggregates     |
| GET    | `/api/v1/reviews/tutors/:id` | Published reviews only                                                                       |
| GET    | `/api/v1/public/stats`       | Platform metrics                                                                             |

### Tutor-owned API

| Method | Route                               | Behaviour                                             |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| GET    | `/api/v1/tutors/me`                 | Own profile, including bilingual fields               |
| PUT    | `/api/v1/tutors/me/profile`         | Update bilingual headline/bio, experience, modes, fee |
| GET    | `/api/v1/saved-tutors`              | Caller-scoped shortlist                               |
| POST   | `/api/v1/saved-tutors/:tutorUserId` | Idempotent save; self-save rejected                   |
| DELETE | `/api/v1/saved-tutors/:tutorUserId` | Idempotent unsave                                     |

### Replacement API

`POST /api/v1/tutor-replacements`, `GET /eligible-bookings`, `GET /`, `GET /:id`,
`GET /:id/candidates`, `POST /:id/accept`, `POST /:id/decline`, `POST /:id/cancel`,
`PATCH /:id` (staff), `PATCH /:id/deadline` (staff), `POST /ops/sweep-overdue` (staff).

### Web routes

- `/{locale}/tutors` — discovery, filters, URL state, save action, booking entry.
- `/{locale}/tutors/[id]` — public profile, reviews, save, booking request entry.
- `/{locale}/saved-tutors` — caller-scoped shortlist.
- `/{locale}/tutor-replacements`, `/new`, `/[id]` — participant replacement workflow.
- `/{locale}/dashboard/tutor/profile` — **new** bilingual tutor profile editor (Bangla + English).
- `/{locale}/dashboard/admin/replacements` and `/[id]` — staff queue and case review.

## 4. Search filters and data sources

| Filter              | Data source                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`                 | `users.display_name`, legacy `headline/bio`, `headline_en/bn`, `bio_en/bn`, approved qualifications, subject names (en/bn), service-area codes/locality |
| `subjectId`         | `tutor_subjects`                                                                                                                                        |
| `educationLevelId`  | `tutor_subjects`                                                                                                                                        |
| `curriculumId`      | `tutor_subjects`                                                                                                                                        |
| `mode`              | `tutor_profiles.teaching_modes`                                                                                                                         |
| `minPrice/maxPrice` | `tutor_profiles.hourly_rate_minor` (poisha)                                                                                                             |
| `minExperience`     | `tutor_profiles.years_experience`                                                                                                                       |
| `districtCode`      | `tutor_service_areas`                                                                                                                                   |
| `upazilaCode`       | `tutor_service_areas`                                                                                                                                   |
| `lat/lng/radiusKm`  | `tutor_service_areas.latitude/longitude` + haversine                                                                                                    |
| `availableWeekday`  | `tutor_availability` (active, date-effective)                                                                                                           |

All identifiers are UUID/range validated by the query DTO; sort values are a closed enum; every value
is bound as a SQL parameter. The full matrix is in `SEARCH_FILTER_MATRIX.md`.

## 5. Bilingual tutor copy

- `017_tutor_profile_localization.sql` adds `headline_en`, `headline_bn`, `bio_en`, `bio_bn`.
  Existing `headline`/`bio` are backfilled into the English columns and remain synchronized for
  older clients.
- The API serializes both languages plus the legacy English fields. Bangla stays `NULL` when the tutor
  has not written it — it is never machine-translated.
- `localizedTutorText()` / `localizedTutorFields()` resolve copy by route locale (`bn` prefers Bangla,
  `en` prefers English, both fall back to the other language).
- Discovery cards, profile page, saved tutors and the home page use the resolver.
- Onboarding collects separate English (`headline`, `bio`) and Bangla (`headlineBn`, `bioBn`) fields;
  both languages are required by the client form and the server validator.
- `/dashboard/tutor/profile` is a tutor-owned editor with side-by-side Bangla/English headline and
  biography, teaching modes, experience and hourly fee. It requires both languages (English/Bangla
  headline ≥ 5 characters, biography ≥ 20 characters) and saves through `PUT /tutors/me/profile`.
- Keyword search matches both languages.
- Seed data now gives the demo tutor real English and Bangla copy (no translated fallback).

## 6. Ranking, distance and pagination

**Hard constraints first:** `publication_status='published'`, `verification_status='approved'`,
`verification_expires_at` null or future, `users.status='active'`, `users.deleted_at IS NULL`.
Filters are then ANDed and cannot be outranked.

`matchScore = 100 + 20·(approved identity credential) + 20·(approved academic credential)

- min(yearsExperience·5, 50) + 10·(response_time_minutes ≤ 60)`.

Sorting: `recommended` = `matchScore DESC, user_id ASC`; `price_asc/desc` and
`experience_desc` place NULLs last and tie-break on `user_id`; `nearest` requires coordinates and
orders by haversine distance; `rating_desc` uses published reviews only and ties on `user_id`.

Distance uses a bounding-box prefilter and haversine with a 6371 km earth radius. Units are kilometres,
rounded to two decimals. Missing coordinates yield `distanceKm: null` and are excluded only from an
explicit radius query. No marker offsets or overlap hiding exist; there is no map component.

Pagination is offset-based, page size 1–50, with a separate bounded `COUNT`; pagination metadata is
returned in `meta.pagination` plus legacy top-level fields.

## 7. Database migrations and indexes

| Migration                                          | Purpose                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `016_tutor_discovery_and_replacement_workflow.sql` | service-area coordinates, saved tutors, case deadline/version/history |
| `017_tutor_profile_localization.sql`               | bilingual headline/bio, backfill, length constraints                  |
| `018_profile_avatar_urls.sql`                      | missing `users.avatar_url` and `tutor_profiles.avatar_url`            |

Indexes include the partial geo index on service-area coordinates, saved-tutor owner index, replacement
case booking/status/deadline indexes, event history index, and the partial unique index preventing
two active cases per booking.

## 8. Privacy and authorization controls

- Public DTOs are explicit whitelists. They contain no email, phone, NID/document assets, reviewer
  notes, internal case notes or precise home addresses.
- Service-area coordinates are tutor-approved coarse points; no address geocoding is performed.
- Search location is transient and is not persisted.
- Saved lists are scoped to the authenticated caller by `user_id`; self-save is rejected and the
  primary key prevents duplicates.
- Replacement reads are restricted to requester/student/guardian/staff; participant accept/decline
  are separate from staff review; only staff can change status or extend a deadline.
- Internal notes are stored separately and never serialized to participants.
- The search and profile rules are one shared eligibility predicate; a profile cannot be public while
  its search row is hidden, or vice versa.

## 9. Replacement workflow and deadline policy

Policy is read from `docs/BUSINESS_RULES.md` and encoded in
`apps/api/src/modules/trust/constants/replacement-policy.constants.ts` (version
`v1.1-tutor-replacement-guarantee`):

- request window: **48 hours** after the first completed trial session;
- alternate-tutor matching target: **24 hours** by default, configurable up to **48 hours** via
  `TUTOR_REPLACEMENT_MATCH_TARGET_HOURS`;
- max two offers per case;
- refund **eligibility** is recorded; the refund/ledger execution belongs to the payments system and
  is not triggered here.

Statuses: `requested → under_review → matching → offered → accepted/declined → resolved`, with
`refund_eligible`, `rejected`, and `cancelled` terminal/exception states. Every transition is validated
on the server, written with optimistic `version`, appended to `tutor_replacement_case_events`, and
notified after the transaction commits.

The Phase 03 brief mentioned a 48-hour target; the repository’s contractual policy is a 48-hour
request window plus a 24-hour matching target. The repository policy is implemented and the
discrepancy is documented rather than inventing a new promise.

## 10. Notification integration

Existing registry entry `tutor.replacement` is reused; no second notification system was added.
Workflow events (`replacement.requested`, `replacement.offered`, `replacement.accepted`, etc.) are written
to the outbox inside the business transaction and dispatched after commit. Recipient dispatch uses the
single centralized `tutor.replacement` event through `TutorReplacementNotifier`, targeting the owner,
assigned staff, replacement tutor and operations escalation as appropriate. Links resolve to authorized
case pages; payloads exclude private addresses, payment credentials and internal notes.

## 11. Tests executed and actual results

### Commands run in this session

| Command                                                                                    | Result                                                                                                                |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ogroniedu/database build`                                                  | pass                                                                                                                  |
| `pnpm --filter @ogroniedu/database db:migrate`                                             | applied `017_tutor_profile_localization.sql`, `018_profile_avatar_urls.sql`                                           |
| `pnpm --filter @ogroniedu/database db:seed`                                                | pass                                                                                                                  |
| `pnpm --filter @ogroniedu/database test`                                                   | **31 passed / 31** (4 files)                                                                                          |
| `pnpm --filter @ogroniedu/api typecheck`                                                   | pass                                                                                                                  |
| `pnpm --filter @ogroniedu/api lint`                                                        | 0 warnings, 0 errors (378 files)                                                                                      |     | `pnpm --filter @ogroniedu/api test` | **649 passed / 649** (65 files) |
| `pnpm --filter @ogroniedu/api build`                                                       | pass                                                                                                                  |
| `pnpm --filter @ogroniedu/web typecheck`                                                   | pass                                                                                                                  |
| `pnpm --filter @ogroniedu/web lint`                                                        | 0 warnings, 0 errors (451 files)                                                                                      |
| `pnpm --filter @ogroniedu/web test`                                                        | **207 passed / 207** (33 files)                                                                                       |
| `pnpm --filter @ogroniedu/web build`                                                       | pass; `/[locale]/dashboard/tutor/profile` present in the route manifest                                               |
| Playwright `e2e/tutor.localization.spec.ts` (credentials supplied)                         | **4 passed / 4**                                                                                                      |
| Playwright `e2e/journey.booking.spec.ts` (student + tutor credentials)                     | **2 passed / 2**                                                                                                      |
| Playwright `e2e/tutor.discovery.spec.ts`                                                   | **6 passed, 1 skipped** (subject-filter test skipped: taxonomy seed has no subjects)                                  |
| Playwright `e2e/smoke.public.spec.ts`, `auth.guards.spec.ts`, `tutor.verification.spec.ts` | 17 passed; 1 failed on login rate-limit during parallel run, rerun of `tutor.verification.spec.ts` → **2 passed / 2** |

### New automated coverage

- API: bilingual update stores each language independently, keeps legacy English synchronized, clears
  blank copy to `NULL`, and verification submission accepts either language.
- API: the tutor onboarding validator rejects a profile with English-only copy and accepts both
  languages (including the explicit `headlineEn` field).
- Web: locale resolver prefers Bangla on `bn`, English on `en`, falls back without fabricating text;
  client keyword filter matches Bangla and English headline/bio.
- Onboarding: tutor step exposes `headlineBn` and `bioBn` and marks both languages required.
- E2E: Bangla profile page and cards show Bangla copy; English routes show English copy; the tutor
  editor loads saved values from `/tutors/me`.

## 12. Manual verification (running API + real PostgreSQL)

1. `GET /api/v1/tutors/search?pageSize=3` returned `success: true`, `total: 1`, with `headlineEn`,
   `headlineBn`, `bioEn`, `bioBn`.
2. `GET /api/v1/tutors/search?q=<Bangla subject word>` returned the seeded tutor; `q=Physics` did too;
   an unrelated term returned `total: 0`.
3. `GET /api/v1/tutors/public/:id` returned the same bilingual fields and no private fields.
4. Tutor login → `GET /tutors/me` exposed both languages → `PUT /tutors/me/profile` changed both →
   public profile immediately reflected the change → seeded copy restored. The same round trip is now
   covered by `e2e/tutor.localization.spec.ts` (save → public search → `/bn` and `/en` rendering →
   restore).
5. Disposable tutor registration → `POST /onboarding/steps/profile` with both languages completed the
   step; the same request with English only returned HTTP 400 (`a Bangla headline ... is required`).
   `PUT /tutors/me/profile` then persisted both languages and `GET /tutors/me` returned them unchanged.
6. Replacement flow as the demo student: eligible bookings returned one booking, `POST` created a case
   in `requested` with a deadline, a duplicate `POST` was rejected, detail returned one history event,
   and `POST /:id/cancel` moved the case to `cancelled`.
7. Guest replacement routes redirect to `/bn/login`; saved-tutor, replacement list and eligible-booking
   endpoints returned only caller-scoped data.

## 13. Acceptance status

| Criterion                                               | Status                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Public discovery uses real backend data                 | **Implemented · automated-tested · manually-verified**      |
| Filters combine correctly                               | **Implemented · automated-tested**                          |
| Pagination/sorting stable                               | **Implemented · automated-tested**                          |
| Location matching uses real coordinates, no offsets     | **Implemented · automated-tested** (no seeded geo rows)     |
| Private tutor data protected                            | **Implemented · automated-tested**                          |
| Verification eligibility enforced server-side           | **Implemented · automated-tested**                          |
| Public profile accurate                                 | **Implemented · automated-tested · manually-verified**      |
| Saved tutors                                            | **Implemented · automated-tested · manually-verified**      |
| Replacement requests persistent                         | **Implemented · automated-tested · manually-verified**      |
| Eligibility/transitions/deadlines validated server-side | **Implemented · automated-tested**                          |
| 48-hour policy only per documented rules                | **Implemented** — 48 h request window, 24 h matching target |
| Refund eligibility distinguished from execution         | **Implemented**                                             |
| Notifications integrated without duplication            | **Implemented · automated-tested**                          |
| Critical authorization/business rules tested            | **Implemented · automated-tested**                          |
| Typecheck, lint, builds recorded                        | **Pass** (see §11)                                          |
| Bilingual Bangla + English tutor copy                   | **Implemented · automated-tested · manually-verified**      |
| Tutor editor for both languages                         | **Implemented · automated-tested · manually-verified**      |

## 14. Known limitations / blocked dependencies

- **Bangla seed coverage:** only the demo tutor has Bangla copy after seeding. Other existing profiles
  legitimately fall back to English until tutors fill the new editor; no translation is fabricated.
- **Avatar upload:** columns now exist and the UI renders `avatarUrl`/initials, but this phase does not
  add an avatar upload flow.
- **Geocoding/maps:** no provider is installed. Coordinates must be supplied by an explicit location
  picker or browser geolocation; address→coordinate conversion is not claimed.
- **Keyword index:** `ILIKE '%term%'` cannot use a B-tree index and `pg_trgm` is not installed. Search is
  database-filtered but not trigram-indexed; measure before adding a full-text index.
- **Taxonomy seed:** the subject-filter Playwright test is skipped because the local taxonomy seed has no
  subjects. The filter itself is covered by unit tests.
- **Login rate limit:** parallel E2E specs share one demo account; the 5/min limit can fail one spec,
  which passes when rerun serially. This is test-harness friction, not an application defect.
- **Onboarding persistence:** the tutor onboarding step validates and stores bilingual payload in
  `user_onboarding.step_data`; it does not write `tutor_profiles` directly. The profile editor is the
  authoritative write path for public playback, and it enforces both languages at save time.
- **Replacement vs payments:** a case can record `refund_eligible`, but no refund is executed. Booking,
  escrow and payout lifecycles remain out of scope for Phase 03.
- **Candidate auto-assignment:** never automatic; staff/user consent is required. If no eligible
  candidate exists, the case remains open for staff review.

## 15. Manual verification instructions

```bash
# 1. Apply schema + seed
set -a && . ./.env && set +a
pnpm --filter @ogroniedu/database build
pnpm --filter @ogroniedu/database db:migrate
pnpm --filter @ogroniedu/database db:seed

# 2. Start the API and web app (two terminals)
pnpm --filter @ogroniedu/api dev
pnpm --filter @ogroniedu/web dev

# 3. Public bilingual discovery
#    /bn/tutors and /en/tutors should show different headline/bio language.
#    Open /bn/tutors/<tutor-id> and /en/tutors/<tutor-id>.

# 4. Tutor editor
#    Log in as tutor.demo@ogroniedu.com / OgroniDev#2026, open
#    /en/dashboard/tutor/profile, edit both languages, save, then reopen the public profile.

# 5. Replacement flow
#    Log in as student.demo@ogroniedu.com, open /bn/tutor-replacements/new,
#    submit an eligible request, verify the case ID/detail page, then cancel it if desired.
```

Do not run `db:seed` against production; the seed runner refuses demo data in production.
