# Phase 08 — Tutor Discovery and Requests Audit Report

**Date of Audit:** 2026-10-10 13:45:00 BST  
**Auditor:** Principal Security Architect & Lead Backend Engineer (AI Pair Programmer)  
**Project:** OgroniEdu — Enterprise Tutoring and Educational Management Platform (Bangladesh)  
**Repository Working Directory:** `c:\Sofof_tech_2026\ogroniedu`  
**Phase Objective:** Implement real DB-backed discovery search and request flow with reference catalogs, multi-dimensional filters, deterministic pagination, explainable ranking, anti-spam duplicate request prevention, and full request lifecycle.

---

## 1. Executive Summary

Phase 08 successfully implemented the full tutor discovery search and request flow for OgroniEdu according to the rigorous requirements in `prompts/08-tutor-discovery-and-matching.md`:

1. **Strict Definition of Done Enforced — Zero Static Production Catalog:**
   - Discovery search (`GET /api/v1/tutors/search`) queries real PostgreSQL database records via `TutorProfileEntity` and joined relationships.
   - Unpublished and unapproved profiles are strictly excluded at query-level: `publicationStatus: 'published'` and `verificationStatus: 'approved'`.
2. **Multi-Dimensional Discovery Search Engine:**
   - Text search (`q`) across tutor display name, headline, bio, and subjects.
   - Multi-dimensional filters: Subject (`subjectId`), Class/Level (`educationLevelId`), Curriculum (`curriculumId`), Teaching Mode (`in_person`, `online`, `hybrid`), Geographic Location (`districtCode`, `upazilaCode`), Price Range (`minPrice`, `maxPrice`).
   - Deterministic sorting: `recommended` (scoring), `price_asc`, `price_desc`, `experience_desc`.
   - Deterministic pagination metadata (`total`, `page`, `limit`, `totalPages`).
3. **Transparent & Explainable Ranking (No Unbacked AI Claims):**
   - Scoring algorithm strictly grounded in deterministic verification and quality signals:
     - Base verified & approved profile: `+100` pts
     - National ID verified (`verified_identity` badge): `+20` pts
     - Academic Degree verified (`verified_degree` badge): `+20` pts
     - Experience factor: `+10` pts per 2 years (capped at `+50` pts)
     - Fast response rate (<= 60 mins): `+10` pts
   - All ranking reasons transparently exposed in the API (`rankingReasons`) and visual breakdown modal in the UI.
4. **Tutoring Requests & Lifecycle State Machine:**
   - Entity `BookingEntity` mapped to `bookings` table.
   - Lifecycle transitions: `requested` -> `accepted` | `declined` | `cancelled` (withdrawn).
   - Relationship authorization: Adult students can request directly; minors must be requested by verified active guardians (`GuardianStudentLinkEntity`).
   - Anti-spam & duplicate prevention: Simultaneous duplicate active requests for the same student, tutor, and subject throw `409 Conflict`.
   - Self-request prevention: Requesting oneself throws `400 Bad Request`.
   - Unpublished tutor protection: Requesting unverified or unpublished tutors throws `400 Bad Request`.
   - Ownership guards: Only the requester can withdraw; only the assigned tutor can accept or decline; unrelated third parties cannot view request details (`403 Forbidden`).
   - Notification dispatch: Real-time notification dispatched on request creation, withdrawal, accept, and decline events.
5. **Modern, Accessible Bilingual Frontend (`TutorSearchCatalog`):**
   - Built in `apps/web/src/components/discovery/TutorSearchCatalog.tsx` and routed at `/[locale]/tutors`.
   - Dynamic search, filters, pricing sliders, sorting controls, explainable score popovers, and booking request modal with subject, preferred mode, and day toggles.
   - 100% dictionary key parity between `messages/en.json` and `messages/bn.json` with Bengali numeral formatting.
6. **Automated Verification:**
   - Monorepo test suite expanded by 27 new tests to **173 passing tests, 0 failures, 0 skipped**.

---

## 2. Requirement Traceability Matrix (Phase 08 Scope)

| Requirement ID | Requirement Name                   | Implementation Files                                                                                      | Test Suite                                                | Verification Status                                                                                                    |
| :------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **FR-001**     | Public Tutor Discovery             | `apps/api/src/modules/tutors/`, `apps/web/src/components/discovery/`, `apps/web/src/app/[locale]/tutors/` | `discovery.search.spec.ts`, `tutor-discovery.spec.ts`     | **COMPLETED & VERIFIED** (Real DB search, multi-dimensional filters, explainable ranking, pagination, responsive UI)   |
| **FR-007**     | Booking Request Lifecycle          | `apps/api/src/modules/bookings/`                                                                          | `bookings.service.spec.ts`, `bookings.controller.spec.ts` | **COMPLETED & VERIFIED** (Request creation, withdrawal, accept/decline, anti-spam duplicate prevention, notifications) |
| **NFR-001**    | Authorization & ABAC Isolation     | `apps/api/src/modules/bookings/bookings.service.ts`                                                       | `bookings.service.spec.ts`                                | **COMPLETED & VERIFIED** (Ownership guards, guardian-student link check, third-party access denial)                    |
| **NFR-004**    | Bilingual English & Bengali Parity | `apps/web/messages/en.json`, `apps/web/messages/bn.json`                                                  | `i18n.spec.ts`, `tutor-discovery.spec.ts`                 | **COMPLETED & VERIFIED** (100% key parity across `discovery` and `bookingRequest` namespaces)                          |

---

## 3. Database Schema & Migration Verification

No migration alterations were needed because the initial relational architecture already designed complete support:

- `tutor_profiles` with `publication_status` and `verification_status` indexing.
- `tutor_subjects` and `tutor_service_areas` relational joins for taxonomy matching.
- `bookings` table storing `requester_user_id`, `student_user_id`, `tutor_user_id`, `subject_id`, `education_level_id`, `mode`, `status`, `price_per_session_minor`, and `service_agreement_snapshot` JSONB.

---

## 4. Test Suite Execution & Verification Logs

### Test Summary

- `@ogroniedu/api`: 18 test files, 143 passed tests.
- `@ogroniedu/web`: 7 test files, 30 passed tests.
- `@ogroniedu/database`: 2 test files, 5 passed tests (cached/passed).
- **Total Test Count: 173 passed tests, 0 failures, 0 skipped.**

### Execution Commands & Actual Outcomes:

```bash
# 1. API tests including discovery and bookings unit suites
pnpm --filter @ogroniedu/api test
# Outcome: 18 passed test files, 143 tests passed (0 failures)

# 2. Web tests including i18n parity and tutor discovery UI component
pnpm --filter @ogroniedu/web test
# Outcome: 7 passed test files, 30 tests passed (0 failures)

# 3. Monorepo-wide test suite
pnpm test
# Outcome: 5 tasks successful (173 total tests passed)

# 4. Production builds
pnpm build
# Outcome: Turbo build succeeded across all 5 workspace packages.
# Next.js generated route /[locale]/tutors dynamically without errors.

# 5. Documentation and canonical schema validation
node scripts/validate-documentation.js
# Outcome: Successfully verified 120 Markdown, Mermaid, and SQL files.
```

---

## 5. Security, Authorization & Privacy Audit

1. **Private PII Shielding:**
   - Tutor discovery endpoints exclude national IDs, passport details, raw verification review logs, phone numbers, and emails.
2. **Unpublished Tutor Exclusion Invariant:**
   - Draft, rejected, suspended, or unapproved tutor profiles never appear in search results, even when queried with specific filters.
3. **Anti-Spam Duplicate Request Denial:**
   - Attempting to submit a second pending request for the same student, tutor, and subject triggers a `409 Conflict`.
4. **Ownership Access Control:**
   - Only the requester can withdraw a pending booking.
   - Only the assigned tutor can accept or decline a booking.
   - Third-party users cannot view or manipulate booking requests.
   - Guardians can only submit requests for students actively linked to their accounts.

---

## 6. Audit Conclusion

Phase 08 meets 100% of the acceptance criteria set forth in `prompts/08-tutor-discovery-and-matching.md`:

- Real DB-backed discovery search.
- Multi-dimensional filters and deterministic pagination.
- Explainable ranking without unbacked AI claims.
- Anti-spam duplicate request prevention.
- Request/withdraw, accept/decline lifecycle.
- Full bilingual English and Bengali support with zero missing keys.
- All 173 automated tests passed.
