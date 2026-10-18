# Tutor Discovery — Test Plan (Phase 03)

The plan maps every acceptance area to an automated test. Commands are recorded in
`IMPLEMENTATION_REPORT.md` with actual results.

## 1. Backend — discovery and search

| #    | Test                                                                      | Type               |
| ---- | ------------------------------------------------------------------------- | ------------------ |
| S-1  | Only published + approved + unexpired + active accounts are returned      | unit               |
| S-2  | Filter by subject                                                         | unit / integration |
| S-3  | Filter by education level                                                 | unit               |
| S-4  | Filter by curriculum                                                      | unit               |
| S-5  | Fee range (min/max, NULL fee excluded)                                    | unit               |
| S-6  | Teaching mode (`in_person`, `online`, `hybrid`)                           | unit               |
| S-7  | Minimum experience                                                        | unit               |
| S-8  | Availability weekday (active + date-effective only)                       | unit               |
| S-9  | Combined filters are ANDed, not ORed                                      | unit               |
| S-10 | Invalid filter values rejected by DTO validation                          | unit / e2e         |
| S-11 | Empty result set returns `total=0`, empty page                            | unit               |
| S-12 | Stable pagination with deterministic tie-break                            | unit               |
| S-13 | Price/experience/rating sorting and tie-break                             | unit               |
| S-14 | Private fields (email, phone, password hash, NID assets) never serialized | unit               |
| S-15 | Department filter (`districtCode`, `upazilaCode`)                         | unit               |
| S-16 | Keyword `q` matches name/headline/subject/area without SQL injection      | unit               |

## 2. Location

| #   | Test                                                               | Type              |
| --- | ------------------------------------------------------------------ | ----------------- |
| L-1 | Valid lat/lng/radius accepted                                      | unit              |
| L-2 | Out-of-range lat/lng rejected                                      | unit              |
| L-3 | Radius below/above bound rejected                                  | unit              |
| L-4 | `sort=nearest` without coordinates rejected                        | unit              |
| L-5 | Distance ordering is ascending                                     | unit              |
| L-6 | Tutors without coordinates excluded from a radius query            | unit              |
| L-7 | No artificial marker offsets; overlapping areas remain visible     | unit              |
| L-8 | No home address/precise pupil location in public payloads          | unit              |
| L-9 | Browser geolocation denial falls back to manual district selection | web test / manual |

## 3. Authorization

| #   | Test                                                                            | Type                |
| --- | ------------------------------------------------------------------------------- | ------------------- |
| A-1 | Public search is accessible unauthenticated                                     | e2e                 |
| A-2 | Private profile editing requires the owner                                      | existing auth tests |
| A-3 | Saved-tutor list is scoped to the caller                                        | unit                |
| A-4 | Save/unsave a tutor owned by another user is idempotent and harmless            | unit                |
| A-5 | Replacement case owner/student/guardian/admin can read; unrelated user gets 403 | unit                |
| A-6 | Staff-only transitions reject participant calls                                 | unit                |
| A-7 | Participant accept/decline rejects unrelated user                               | unit                |
| A-8 | Internal notes are never returned to participants                               | unit                |

## 4. Replacement workflow

| #    | Test                                                              | Type                   |
| ---- | ----------------------------------------------------------------- | ---------------------- |
| R-1  | Eligible trial-dissatisfaction submission within 48 h             | unit                   |
| R-2  | Submission outside 48 h rejected                                  | unit                   |
| R-3  | Ineligible booking status rejected                                | unit                   |
| R-4  | Reason-specific evidence required (`no_show`, cancellations)      | unit                   |
| R-5  | Duplicate active case prevented (service + DB index)              | unit + migration check |
| R-6  | Invalid status transition rejected                                | unit                   |
| R-7  | Deadline = requested_at + configured target                       | unit                   |
| R-8  | Overdue sweep is idempotent and does not move deadlines           | unit                   |
| R-9  | Offer requires a verified, published, eligible tutor              | unit                   |
| R-10 | Participant accept rebinds booking and resolves case              | unit                   |
| R-11 | Participant decline returns case to matching                      | unit                   |
| R-12 | Staff cannot force `accepted`                                     | unit                   |
| R-13 | Refund eligibility recorded, no refund execution                  | unit                   |
| R-14 | Concurrent updates respect optimistic version                     | unit                   |
| R-15 | Notification dispatched after commit with authorized case link    | unit                   |
| R-16 | History event appended for every transition; internal note hidden | unit                   |

## 5. Frontend

| #    | Test                                                                        | Type                |
| ---- | --------------------------------------------------------------------------- | ------------------- |
| W-1  | Filters render from taxonomy and submit expected query params               | vitest              |
| W-2  | URL state round-trips (back/forward)                                        | vitest / Playwright |
| W-3  | Debounced text search (no request per keystroke)                            | vitest              |
| W-4  | Loading, error, empty and retry states                                      | vitest              |
| W-5  | Tutor card shows real rating only when reviews exist                        | vitest              |
| W-6  | Public profile page renders API data and 404/error states without fallbacks | vitest              |
| W-7  | Save/unsave updates and invalidates the list                                | vitest              |
| W-8  | Replacement form failure shows an error, never fake success                 | vitest              |
| W-9  | Accept/decline only visible to participants and calls participant endpoint  | vitest              |
| W-10 | Mobile/desktop layouts (responsive matrix)                                  | Playwright          |

## 6. Validation commands

```
pnpm --filter @ogroniedu/database db:migrate
pnpm --filter @ogroniedu/api typecheck
pnpm --filter @ogroniedu/api lint
pnpm --filter @ogroniedu/api test
pnpm --filter @ogroniedu/api build
pnpm --filter @ogroniedu/web typecheck
pnpm --filter @ogroniedu/web lint
pnpm --filter @ogroniedu/web test
pnpm --filter @ogroniedu/web build
pnpm --filter @ogroniedu/web e2e   # requires running API + web
```

External services (SSLCommerz, SMS/email) are **not** exercised by this plan.
