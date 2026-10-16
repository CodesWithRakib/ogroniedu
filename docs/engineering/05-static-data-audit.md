# 05 — Static & Demo Data Audit (F-5)

Every row below was verified in source at commit `c58d026`; the S-1 incident additionally has live
E2E and browser/API evidence. Line references are exact, not paraphrased. The rule applied:
**if a number or identity is shown to a user as if it were real, it belongs in this register —
unless it is either wired to the API in that exact render path or explicitly labeled as an estimate.**

## S-1 — Curated fake tutors on `/tutors` (verified incident; static + dynamic evidence)

| Evidence type                                 | Detail                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static                                        | `CURATED_SAMPLE_TUTORS` constant (`tutors-page.tsx:30`) with fake IDs (`tutor-buet-1`), names, rates, ratings; fallback selection `resultSnapshot = items.length === 0 ? CURATED_SAMPLE_TUTORS : …` (`:360-407`) — which is also true **while the real search is still loading**; the catalog keeps `initialData` until the sync effect at `tutorSearchCatalog.tsx:81-83`.                               |
| Static                                        | Each curated card's "Request tutoring" opens the booking modal with the fake tutor id; submit posts it to `POST /api/v1/requests` (`:414-442`).                                                                                                                                                                                                                                                          |
| Dynamic (browser probe)                       | First card immediately after load: `tutor-card-tutor-buet-1`; after search settles: only `tutor-card-22222222-…` (Rashed Karim), counter "মোট ১ জন শিক্ষক".                                                                                                                                                                                                                                              |
| Dynamic (E2E)                                 | `journey.booking.spec.ts` "student files booking request" clicked inside the flash window → modal held "Tanvir Hasan" (curated) → `POST /api/v1/requests` **500** `invalid input syntax for type uuid: "tutor-buet-1"` (`bookings.service.ts:97`), full stack trace captured. This is the single E2E failure of the 45-test run (F-4).                                                                   |
| Dynamic (E2E re-run, fresh servers, same day) | Independent second run of the same spec produced the **other failure mode of the same race**: the click landed mid-swap and `booking-request-modal` never became visible (15s assertion); the settled page then showed only the real card ("মোট ১ জন শিক্ষক"). Two runs → two distinct outcomes of the same defect (modal-with-fake-tutor→500, or no modal), documented in `09-evidence-appendix.md` §3. |

Impact: real users can be shown, and can act on, tutors that do not exist; in dev the action
yields a 500; in a validating environment it would yield a 400 — either way it is broken UX on the
"find a tutor" happy path.

## S-2 — Complete register (user-visible fabrications and demo affordances)

| #   | Surface                                                                                                       | Static evidence (file:line)                                                                                                                                                                                           | Shown as                      | Live/runtime note                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Home hero trust pill "Trusted by 10,000+ Parents & Students" + "4.8/5 (2.5k+ reviews)"                        | `home-page.tsx:87,99-102`                                                                                                                                                                                             | real social proof             | static text; not wired to `/public/stats`                                                                                 |
| 2   | Home stats strip fallbacks "10,000+", "2,500+"                                                                | `home-page.tsx:193-195,210-212`                                                                                                                                                                                       | real platform metrics         | uses `stats` API when truthy, **falls back to fabricated numbers when the API is down/zero** (also named in Phase 24 WS8) |
| 3   | Home "95% Satisfaction Rate"                                                                                  | `home-page.tsx:227`                                                                                                                                                                                                   | real platform metric          | static, no API source at all                                                                                              |
| 4   | Student dashboard "Study Streak — 5 Days 🔥"                                                                  | `student-dashboard-page.tsx:107-108`                                                                                                                                                                                  | personal progress             | hardcoded in all locales                                                                                                  |
| 5   | Weekly Activity chart (all three role dashboards)                                                             | defaults `WeeklyActivityChart.tsx:24-38` (45/70/88/95/60/35/50 %, counts); rendered without `data` at `student-dashboard-page.tsx:120-128`, `tutor-dashboard-page.tsx:210-216`, `guardian-dashboard-page.tsx:157-165` | personal activity             | chart always shows the same fictional week                                                                                |
| 6   | Session reminder card fallbacks ("Physics & Higher Math Live Class", "Tutor: Rahat Mahmud", "Today 04:00 PM") | `SessionReminderCard.tsx:27-30`; fallbacks reachable when no upcoming session at `student-dashboard-page.tsx:133-139`, `tutor:221-235`, `guardian:170-176`                                                            | upcoming real class           | real values passed when available; otherwise fabricated tutor/class                                                       |
| 7   | Tutor details page: fabricated profile fields                                                                 | `FALLBACK_TUTORS_DETAILS` `tutor-details-page.tsx:40`; fallback merge `:338-386` (name, headline, rate, experience, subjects, qualifications, service areas; availability **always** from fallback `:386`)            | real tutor data               | triggers when API returns partial/absent data — i.e., degrades to fiction instead of empty state                          |
| 8   | Tutor details page: **reviews are always fabricated**                                                         | `:824-833` (`fallback.reviews.map`), fake review arrays at `:162,241,301`, hardcoded "48 Student & Parent Reviews" at `:562`                                                                                          | real verified-student reviews | the reviews API (real endpoint) is never used on this page                                                                |
| 9   | Auth shell: 1-click demo strip with plaintext password `OgroniDev#2026`                                       | `authShell.tsx:39-70`, rendered `:222-250`                                                                                                                                                                            | evaluator convenience         | **no environment gate** — renders in any build that includes the login page; visible to every visitor                     |
| 10  | Auth shell: fabricated testimonial "Dr. Tanvir Ahmed · BUET & DU Mentor                                       | Physics · 5.0 ★"                                                                                                                                                                                                      | `authShell.tsx:148-175`       | real testimonial                                                                                                          | static card on login/register |
| 11  | Login page: "Sign in with Google" button                                                                      | `LoginForm.tsx:161-187`                                                                                                                                                                                               | Google OAuth                  | **not OAuth** — it quick-fills the student demo credentials (`:164`)                                                      |
| 12  | Curated sample tutors (S-1)                                                                                   | `tutors-page.tsx:30,360-407`                                                                                                                                                                                          | search results                | clickable; 500 in dev (F-4)                                                                                               |

**Latent (defined, not currently rendered):** `ROLE_PRESETS[*].widget` copy — "Study Streak 🔥 /
Consistent learning tracker active", "🟢 Open for new bookings", "⚡ 99.99% uptime & secure"
(`navigation.ts:336-397`) — is never read by any component (no `.widget` consumer found). If it is
ever wired into the dashboard chrome, the uptime/streak claims become user-visible fabrications.

## S-3 — Taxonomy vs advertised coverage

- API `GET /api/v1/taxonomy/locations` returns **12 hardcoded districts**
  (`taxonomy.controller.ts:46-63`: dhaka, chittagong, sylhet, rajshahi, khulna, barishal, rangpur,
  mymensingh, comilla, gazipur, narayanganj, bogra).
- Web hero search has its own **10-item** fallback list (`HeroSearchBar.tsx:80-94`).
- `README.md:12` advertises "localized search across 64 districts and upazilas"; a prior audit doc
  repeats "64 districts". Neither matches the shipped list. No locations/upazila tables exist
  (`04-database.md` §5).

## What is genuinely real (to bound the finding)

- The stats **band** does consume `/api/v1/public/stats` when available (live 200 this session);
  the problem is the fabricated _fallback_, not an unwired feature.
- The pricing calculator's 8% platform fee matches the settlement/analytics code
  (`settlement.service.ts:75`, `analytics.service.ts:110`) — it is consistent, not invented.
- Reviews, bookings, tickets, and tutor search have real API paths (E2E-verified); the fake
  content above is fallback/decoration layered around them.

## Decision inputs (feed WS8 / Pre-Gate)

| Item            | Decision needed                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| 1,3,5,6,9,10,11 | Remove, gate to dev (`NODE_ENV`), or relabel as sample content — needs product sign-off (bn+en copy) |
| 2               | Phase 24 WS8 already asks: real-only with skeleton, or labeled estimates                             |
| 4,7,8           | Replace with empty/skeleton states; never render fabricated personal or tutor data                   |
| S-1 (12)        | Remove curated clickable path; keep skeleton until search resolves (F-4 fix)                         |
| S-3             | Either ship the real 64-district taxonomy or correct the README/audit claims                         |
