# OgroniEdu — MVP Scope and Launch Requirements

**Status:** APPROVED  
**Date:** 2026-10-24  
**Owner:** Release Manager

---

## 1. MVP Definition

The OgroniEdu MVP is a **tutoring marketplace platform for Bangladesh** covering the complete end-to-end journey:

> **Student/Guardian → Tutor Discovery → Booking Request → Tutor Response → Escrow Payment → Session → LMS (attendance/assignments/grading) → Progress Report → Review → Payout.**

The MVP must allow every user role to complete their core workflow end-to-end, securely, with tests.

---

## 2. In-Scope MVP Features

| Area                  | In Scope                                                                                                                         | Evidence / Tests                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication        | Register, login, refresh, logout, OTP, magic link, password reset, email verification                                            | `auth.*` specs (10 tests), `auth-authorization.spec.ts`, `auth-bypass-guard.spec.ts`, `auth-hardening.utils.spec.ts`, `auth-tokens.spec.ts`, `auth.controller.spec.ts`, `auth.magic-link.spec.ts`, `auth-guard-account-status.spec.ts`, `otp-delivery.spec.ts` |
| Authorization         | RBAC/ABAC enforcement per resource ownership                                                                                     | `safeguarding-security-authorization.spec.ts`, `security-isolation-performance-phase12.spec.ts`, `tenant-isolation-idor.spec.ts`, `guardian-access.spec.ts`, `notification.authorization.spec.ts`, `finance-rbac.spec.ts`, `auth.authorization.spec.ts`        |
| Roles                 | student, guardian, tutor, admin, super_admin, support_agent, compliance_reviewer, organization_owner, organization_staff         | `phase11-canonical-roles-matrix.spec.ts`, navigation.ts role matrix                                                                                                                                                                                            |
| Tutor Discovery       | Public tutor catalog, search, filters, public profile view                                                                       | `discovery.search.spec.ts`, `tutors.service.spec.ts`, `tutors.controller.spec.ts`, `taxonomy.controller.spec.ts`                                                                                                                                               |
| Booking Requests      | Create, respond (accept/decline), withdraw, status history                                                                       | `bookings.service.spec.ts`, `booking-phase04.spec.ts`, `bookings.controller.spec.ts`                                                                                                                                                                           |
| Booking Lifecycle     | State machine: requested → accepted → confirmed → in_progress → completed; expiry sweeps (48h/24h); conflict prevention; no-show | `booking-lifecycle-phase07.spec.ts`, `scheduling.service.spec.ts`, `sessions.controller.spec.ts`                                                                                                                                                               |
| Session Scheduling    | Calendar, iCal export, reschedule, cancel, meeting URL                                                                           | `scheduling.service.spec.ts`                                                                                                                                                                                                                                   |
| Escrow Payments       | Payment orders, sandbox adapter (SSLCommerz/bKash/Nagad), webhook idempotency, receipts/invoices                                 | `payments.service.spec.ts`, `financial-escrow-phase10.spec.ts`, `sslcommerz.adapter.spec.ts`, `bkash.adapter.spec.ts`, `idempotency.spec.ts`, `payments.controller.spec.ts`                                                                                    |
| Ledger & Finance      | Double-entry journal, balance invariant, commission policy, payout requests/approvals                                            | `ledger.service.spec.ts`, `payouts.service.spec.ts`, `commission-policy.service.spec.ts`, `finance-rbac.spec.ts`, `refunds.service.spec.ts`                                                                                                                    |
| Tutors                | Profile, qualifications, subjects, service areas, availability/blocked periods, publication                                      | `tutors.service.spec.ts`, `tutors.controller.spec.ts`                                                                                                                                                                                                          |
| Tutor Verification    | 3-tier dossier, document upload, admin review queue, level decisions                                                             | `tutor-verification-dossier.spec.ts`, `tutor-qualification-evidence.spec.ts`                                                                                                                                                                                   |
| Learning / LMS        | Attendance, assignments, submissions, grading, lesson plans, materials                                                           | `learning.service.spec.ts`, `learning-phase06.spec.ts`, `learning.controller.spec.ts`, `lesson-content.controller.spec.ts`                                                                                                                                     |
| Messaging             | Booking-scoped chat, content safety redaction (phone/payment/link), read receipts, typing                                        | `booking-messages.spec.ts`, `content-safety.util.spec.ts`, `booking-messages.controller.spec.ts`, `conversations.controller.spec.ts`                                                                                                                           |
| Notifications         | In-app bell/list/preferences, real-time socket dispatch, unread count                                                            | `notification.service.spec.ts`, `notification.socket.spec.ts`, `notification.dto.spec.ts`, `notification-preferences.spec.ts`, `communication-notifications-phase09.spec.ts`                                                                                   |
| Safety & Trust        | Safety reports, protective holds, dispute resolution, content moderation                                                         | `safety-phase07.spec.ts`, `safeguarding-security-authorization.spec.ts`, `disputes.spec.ts`                                                                                                                                                                    |
| Replacement Guarantee | Replacement cases, candidates, accept/decline, deadlines                                                                         | `tutor-replacement.service.spec.ts`                                                                                                                                                                                                                            |
| Admin & Governance    | User directory, suspend/reactivate, roles, settings, feature flags, impersonation (audited, 15m), audit logs                     | `admin-governance-phase08.spec.ts`, `admin-operations.spec.ts`                                                                                                                                                                                                 |
| Analytics             | Operational overview, funnel, retention, financials, tutor leaderboard (ABAC scoped)                                             | `product-analytics-retention-phase14.spec.ts`, `analytics.service.spec.ts`, `analytics.controller.spec.ts`                                                                                                                                                     |
| Onboarding            | Step-based onboarding, completion status                                                                                         | `onboarding.service.spec.ts`, `onboarding-validators.spec.ts`                                                                                                                                                                                                  |
| Users & Guardians     | Profile CRUD, child linking, guardian-student ABAC guard                                                                         | `users.service.spec.ts`, `guardians.service.spec.ts`, `guardians.controller.spec.ts`, `guardian-access.spec.ts`                                                                                                                                                |
| Files                 | Evidence upload, access control                                                                                                  | `files.service.spec.ts`                                                                                                                                                                                                                                        |
| Support               | Ticket creation, admin triage                                                                                                    | `support-tickets.spec.ts`                                                                                                                                                                                                                                      |
| Public                | Platform stats                                                                                                                   | `public-stats.spec.ts`                                                                                                                                                                                                                                         |
| Health                | Liveness/readiness probes                                                                                                        | `health.spec.ts`                                                                                                                                                                                                                                               |

---

## 3. Exclusions (Out of MVP Scope)

The following are explicitly **out of scope** for the MVP launch and will be deferred to post-MVP:

| Excluded                                          | Reason                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Live production payment gateway credentials       | Blocked by external provisioning (KNOWN_ISSUES ISSUE-01). Sandbox adapters remain with fail-closed webhook verification. |
| Production SMS / email gateway integration        | Outbox events exist; delivery adapters intentionally mocked per KNOWN_LIMITATIONS.md.                                    |
| Collaborative real-time whiteboard                | Not implemented in code (RLD-003). Classroom is local canvas + Google Meet link.                                         |
| Production multi-tenancy polish for organizations | 2 pages + APIs exist; institutional onboarding partial.                                                                  |
| Guardian multi-child scope switching              | Partial UI coverage; not a P0 blocker.                                                                                   |
| White-label / SaaS tiering                        | Not part of MVP.                                                                                                         |
| Video/WebRTC live streaming                       | Google Meet link alternative in place.                                                                                   |
| Live image antivirus / magic-number validation    | Extension check exists; deeper scan deferred.                                                                            |

---

## 4. Launch Criteria (Go/No-Go)

| Criterion                            | Required Evidence                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| All P0 issues resolved               | Zero open P0 tasks in `11-MASTER-TASK-REGISTER.md`                                                        |
| All P1 issues resolved               | RLD-001, RLD-002 implemented, tested, verified                                                            |
| TypeScript typecheck clean           | 0 errors across all workspaces                                                                            |
| Lint clean                           | 0 warnings/errors                                                                                         |
| Full test suite green                | 1,367+ tests passing (API + web + database)                                                               |
| Critical E2E workflows pass          | Registration → discovery → booking → payment sandbox → session → payout (as documented browser scenarios) |
| Production build passes              | `pnpm build` succeeds for all packages                                                                    |
| Environment config validated         | `.env.example` complete; no secrets committed                                                             |
| Migrations verified                  | Safe versioned migrations run against non-production DB                                                   |
| Release readiness checklist complete | `14-RELEASE-READINESS-CHECKLIST.md` all green                                                             |

---

## 5. Deferred Items Register

Deferred items are documented per phase and tracked with status `DEFERRED` in `11-MASTER-TASK-REGISTER.md`. Deferral requires a documented rationale and release-impact statement.

---

## 6. Priority Classification (Reference)

- **P0** — Authentication bypass, broken authorization/data isolation, data corruption/loss, critical booking/payment integrity bugs, secrets exposed, critical journey incompletable, deployment/startup failure.
- **P1** — Incomplete core workflows, backend/frontend integration gaps, incorrect permissions, missing required validation, critical UI/responsive failures, unreliable transaction/event behavior, missing essential regression tests.
- **P2** — Oversized files causing real maintenance problems, significant duplicated logic, poorly isolated services, inconsistent components, non-critical accessibility/performance issues.
- **P3** — Nonessential visual polish, optional integrations, major architectural migrations not needed for launch, features outside MVP scope.

---

_End of `01-SCOPE-AND-MVP-REQUIREMENTS.md`._
