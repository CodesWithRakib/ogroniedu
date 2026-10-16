# 04 — Product Requirements

Priorities: P0 release blocker; P1 MVP; P2 later; P3 exploration. Every requirement must link to data, API/UI, tests and status.

## Public and discovery

- FR-001 [P1] Visitors browse published tutor profiles without private learner/tutor evidence.
- FR-002 [P1] Filter tutors by locality, subject, level/curriculum, mode, budget and availability when known.
- FR-003 [P1] Profile shows verification scope, experience, teaching modes, pricing basis and update time.
- FR-004 [P1] Bangla/English experience is complete.
- FR-005 [P1] Policies are accessible before booking.
- FR-006 [P2] Safe SEO metadata, canonical URLs and sitemap.

## Identity/access

- FR-010 [P0] Secure registration, login, recovery, session revocation and contact verification.
- FR-011 [P0] Server enforces authentication, permission and resource ownership.
- FR-012 [P0] Guardian-child links use authorized consent/verification and audit.
- FR-013 [P1] Users can review/revoke sessions.
- FR-014 [P1] Suspension, export and deletion follow approved retention policy.

## Guardian/student

- FR-020 [P1] Guardian manages multiple linked children.
- FR-021 [P0] Guardian sees only linked children and permitted records.
- FR-022 [P1] Independent learners manage their own account subject to age policy.
- FR-023 [P1] Authorized users view bookings, attendance, payments and progress.
- FR-024 [P1] User can create and track support ticket.

## Tutor and verification

- FR-030 [P1] Tutor manages profile, subjects, classes, credentials, mode, area, pricing and availability.
- FR-031 [P0] Tutor cannot self-approve verification.
- FR-032 [P1] Authorized reviewer can approve/reject/request information/suspend with reason and audit.
- FR-033 [P1] Tutor can manage validated availability and pricing.

## Requests and booking

- FR-040 [P1] Search returns eligible published profiles only.
- FR-041 [P1] Ranking is documented and does not promise unverified outcomes.
- FR-042 [P1] Guardian/student sends a scoped tutor request.
- FR-043 [P1] Target tutor accepts/declines/asks clarification.
- FR-050 [P0] Booking follows explicit state machine.
- FR-051 [P0] Concurrent requests cannot confirm overlapping tutor sessions.
- FR-052 [P1] One-off and recurring sessions supported according to approved scope.
- FR-053 [P1] Reschedule/cancel stores actor, time, reason and policy result.
- FR-054 [P1] Session completion uses defined server-side workflow.
- FR-055 [P1] Attendance is attributable and auditable.

## Learning

- FR-060 [P1] Authorized tutors create homework.
- FR-061 [P1] Tutors record feedback/results/notes with privacy rules.
- FR-062 [P1] Learners/guardians see permitted reports.
- FR-063 [P2] Configurable assessment/rubric.

## Payments

- FR-070 [P0] Payment success is server/provider verified.
- FR-071 [P0] Webhooks are authenticated, idempotent and replay-safe.
- FR-072 [P1] Payment history and receipts available.
- FR-073 [P1] Refund, commission and payout actions audited.
- FR-074 [P0 if ledger enabled] Every journal balances per currency.

## Communication and operations

- FR-080 [P1] Notification preferences and delivery attempts recorded.
- FR-081 [P1] Retries are safe and deduplicated.
- FR-082 [P1] Eligible users create disputes with evidence.
- FR-083 [P1] Admin manages cases with least privilege and audit.
- FR-090 [P0] Admin operations are permission-gated and audited.
- FR-091 [P1] Reference catalogs are manageable.
- FR-092 [P0] Super-admin-only actions are server-enforced and tested.
- FR-093 [P3] Impersonation only if justified, time-limited, visible and audited.

## Non-functional requirements

- NFR-001 [P0] No cross-user/resource data leakage.
- NFR-002 [P0] Booking and financial changes are transaction-safe/idempotent.
- NFR-003 [P1] Responsive accessible UI.
- NFR-004 [P1] Complete Bangla/English localization.
- NFR-005 [P1] Structured logs redact PII/secrets.
- NFR-006 [P0 production] Backup/restore process tested.
- NFR-007 [P1] Performance targets derive from repeatable baselines.
- NFR-008 [P0] Secrets never enter source control/client bundles.
- NFR-009 [P1] Export/deletion/retention documented.
- NFR-010 [P0] Every feature maps to tests and docs.

A feature is complete only when implementation, authorization, automated tests, docs and verification evidence exist.
