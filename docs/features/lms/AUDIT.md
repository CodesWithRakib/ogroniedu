# Phase 06 — LMS, Sessions, Attendance, Homework & Progress Audit

> Scope: learning sessions, timetable, attendance, lesson plans/materials,
> homework, submissions/review, learning goals/progress, reminders, file
> storage, and the booking/payment boundary.
>
> Audited against the working tree (branch `main`, 102 commits) and the SQL
> migration history in `packages/database/src/migrations` (22 migrations).
> The local PostgreSQL instance was **not reachable** during this audit
> (`password authentication failed for user "postgres"`, no Docker daemon), so
> all database statements below come from reading the migrations, not from
> querying live data. This limitation is carried into the test plan and report.

## 1. Repository shape

| Layer     | Technology                                              | Notes                                                                                                                                |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| API       | NestJS 12, TypeORM 1.1 (`apps/api`)                     | CommonJS, feature modules, global validation pipe (`whitelist`, `forbidNonWhitelisted`), global response envelope + exception filter |
| Web       | Next.js 16 App Router, React 19, RTK Query (`apps/web`) | `[locale]` segment, role dashboards, shared `components/ui` design system                                                            |
| Database  | Raw SQL migrations (`packages/database/src/migrations`) | Applied by `MigrationRunner`; no TypeORM synchronization                                                                             |
| Contracts | Zod schemas (`packages/contracts/src`)                  | `learning.ts` mirrors the existing learning DTOs                                                                                     |
| Tests     | Vitest (API + web), Playwright (web `e2e/`)             | API tests are unit/controller-level with mock repositories; there is no database-backed integration harness                          |

## 2. What already exists

| Area                                | Implementation                                                                                                                             | Verdict                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning session model              | `booking_sessions` + `BookingSessionEntity` (`scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`, `reschedule_pending`)        | **Exists and is authoritative.** No separate `LearningSession` table exists; creating one would duplicate it.                                                                                                                                                  |
| Session creation                    | `SessionSchedulingService.scheduleSession` / `scheduleRecurringSessions`                                                                   | Validates booking status, availability, tutor overlap, GiST exclusion constraint; recurring series are idempotent. One-off creation has **no idempotency key**.                                                                                                |
| Session start/complete              | `SessionReschedulingService.startSession` / `completeSession`                                                                              | Exists. `startSession` currently allows the **student** to start; completion is tutor/admin. Completion sends a mislabelled `attendance.marked` notification and no durable event.                                                                             |
| Session cancellation/reschedule     | `SessionReschedulingService`, `session-series.service.ts`                                                                                  | Exists with policy assessment, history preservation, reminder reset.                                                                                                                                                                                           |
| Calendar/timetable                  | `GET /sessions`, `GET /sessions/calendar/ical`, `GET /sessions/calendar/ical/file`, tutor public calendar                                  | Exists. ICS export is RFC 5545-shaped and omits join URLs.                                                                                                                                                                                                     |
| Reminders                           | `SessionReminderService` + `SessionReminderScheduler`                                                                                      | 30-minute window, outbox idempotency key `session.reminder:<id>`, advisory lock. Durable.                                                                                                                                                                      |
| Attendance                          | `session_attendance` table, `LearningAttendanceService`, `POST/GET /learning/.../attendance`                                               | Exists, unique per (session, participant). No edit window, no correction reason, no summary/reporting endpoint.                                                                                                                                                |
| Assignments                         | `assignments`, `assignment_submissions`, `LearningAssignmentsService`                                                                      | Exists. `status` exists (`draft/published/archived`) but **every assignment is created `published`**; no list, publish, return-for-revision, or submission-queue endpoint. Attachments (`asset_ids`) are stored as raw UUIDs with **no ownership validation**. |
| Progress reports                    | `progress_reports`, `LearningProgressService`, `GET /learning/students/:id/summary`                                                        | Exists. `progress.published` notification is registered but never emitted.                                                                                                                                                                                     |
| Lesson plans                        | —                                                                                                                                          | **Missing.**                                                                                                                                                                                                                                                   |
| Learning materials / secure uploads | `file_assets`, `FilesService` (evidence only, metadata-only, no bytes written, no download endpoint)                                       | **Not usable for learning materials.**                                                                                                                                                                                                                         |
| Learning goals                      | —                                                                                                                                          | **Missing.**                                                                                                                                                                                                                                                   |
| Session notes                       | —                                                                                                                                          | Not modelled; completion notes are passed to `completeSession` but not stored (only audited).                                                                                                                                                                  |
| Assessments                         | Submission `score`/`max_score`                                                                                                             | Sufficient; a separate assessment entity would duplicate it.                                                                                                                                                                                                   |
| Student/guardian calendars          | `apps/web/src/features/bookings/pages/sessions-page.tsx`, `SessionScheduleCalendar`, `ChildScopeSelect`                                    | Exists and is API-driven; guardian child scope revalidated server-side.                                                                                                                                                                                        |
| Learning UI                         | `apps/web/src/features/learning/*`, `learning-api.ts`, `/learning`, `/assignments/[id]`, `/assignments/[id]/submissions`, `/progress/[id]` | Exists for attendance/homework/reports.                                                                                                                                                                                                                        |
| Session detail UI                   | `/sessions/[id]`                                                                                                                           | Renders details + attendance form, but has **no start/complete controls**, no materials, no assignments.                                                                                                                                                       |
| Role dashboards                     | `dashboard/{tutor,student,guardian,admin}/...`                                                                                             | Tutor/student/guardian session + learning routes are 11-line wrappers over shared pages. No admin LMS route.                                                                                                                                                   |
| Notifications                       | `NOTIFICATION_REGISTRY` (40 events), `NotificationService`, outbox worker, Socket.IO gateway                                               | Exists. `session.started`, `session.completed`, `assignment.published`, `learning_goal.updated`, material events are **not registered**.                                                                                                                       |
| Payments                            | `payment_orders`, `escrow_holds`, `session_settlements`, `PayoutEntity`, `SettlementService.settleMilestone`                               | Session completion **does not** release funds. Settlement is an explicit financial action (`POST /admin/finance/...`, participant/admin authorised) with a per-session unique settlement and ledger idempotency key.                                           |
| File storage                        | `file_assets` (`local_secure`), magic-byte validation, HMAC signed URL generator                                                           | Metadata only. The generated `/api/v1/files/:id/download` route **does not exist**, so no bytes can be retrieved.                                                                                                                                              |

## 3. Findings (severity ordered)

### P0 — Session start authority is too loose

`startSession` permits the assigned student (and admin). A learning session is
tutor-delivered; a student starting it can set `in_progress` and unlock the
completion path's preconditions. Completion itself correctly rejects students.

### P0 — Duplicate sessions are possible on retry

One-off `POST /sessions` has no idempotency key. A retried request (proxy
retry, double submit, job retry) creates a second session row. Recurring
series are protected by `uq_series_booking_idempotency`; one-off sessions are
not.

### P0 — Assignment attachments trust client-supplied UUIDs

`SubmitAssignmentDto.assetIds` accepts any UUIDs and is persisted without
verifying that the assets exist, are owned by the submitting student, or are
intended for learning. A student can reference another user's private asset
ID, and the assignment detail page will render it.

### P1 — Assignment lifecycle is incomplete

- No `GET /learning/assignments` (list) or review queue.
- No publish/unpublish/archive actions although the column and CHECK exist.
- No "return for revision"; `status='returned'` is writable only implicitly
  and there is no endpoint.
- Resubmission overwrites the only submission row — history is lost. The
  CHECK constraint also forbids `draft`.
- Late submissions are always accepted; `late` is a status, not a rule.

### P1 — Attendance has no correction/audit contract

Any mutation overwrites `recorded_at` and `recorded_by`. Only the generic audit
log records the change; there is no correction reason, no `updated_at`, no
edit-window rule, and no attendance report. `attendanceRate` defaults to
`100` when there are zero records (silently optimistic) and counts excused
sessions as absences in the denominator.

### P1 — Progress metrics are not fully evidence-defined

- `assignmentsAssigned` counts `draft` and `archived` assignments.
- `assignmentsCompleted` counts any submission regardless of the assignment
  being published.
- The summary loads every attendance/submission/report row for the student with
  no bound (unbounded history; N+1 on `relations`).
- No sessions-completed/upcoming counts, no goals, no attendance trend.

### P1 — The learning module bypasses the durable outbox

Attendance, assignment, and grading notifications call
`NotificationService.dispatch` inline (fire-and-forget with a warning log).
A process crash loses the notification; retries can duplicate it. Session
completion reuses `attendance.marked` with a free-text `message` that is not a
registry variable, producing a misleading notification.

### P1 — No lesson plans, materials, or goals

There is no way for a tutor to prepare a lesson or share a resource, and no
evidence-based goal tracking. The session detail page cannot show what the
lesson is about.

### P1 — File storage cannot deliver learning materials

`FilesService.uploadEvidence` validates content but writes no bytes, and no
download route is implemented. `getFileAccess` only grants the owner or an
admin, which is the correct default for evidence but wrong for a student who
must read a tutor-published material. There is no malware scanner; the entity
hard-codes `malware_scan_status='clean'`.

### P2 — Admin/organization scoping is coarse

`isAdminRole` grants platform-wide read access to learning records. There is no
organization entity, membership table, or org-scoped query, so
`organization_owner`/`organization_staff` have no structural scope. This phase
must not invent one; the matrix documents "not granted".

### P2 — Timezone handling

Sessions store an IANA `timezone` (default `Asia/Dhaka`) and the reminder
service formats local time with `formatZonedDateTime`. Attendance/progress
period boundaries are passed as `date` strings and compared against
`timestamptz` columns, which is timezone-sensitive at midnight boundaries.

## 4. Dependency checks against earlier phases

| Dependency                   | Status                                              | Consequence for Phase 06                                                                          |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Phase 01 auth/roles          | Working (`AuthGuard`, `roles`, `isAdminRole`)       | Reused; no changes                                                                                |
| Phase 02 tutor verification  | Working                                             | Reused for tutor identity; no LMS coupling                                                        |
| Phase 03 discovery           | Working                                             | Reused for booking eligibility                                                                    |
| Phase 04 bookings/sessions   | Working, with the gaps above                        | Extended narrowly (idempotency, start authority, durable completion event)                        |
| Phase 05 escrow/settlement   | Working; settlement is an explicit financial action | Session completion emits a durable `session.completed` event; it never calls the ledger           |
| Notification registry/outbox | Working                                             | New events added to the registry + worker mapping                                                 |
| File storage                 | Evidence metadata only                              | New local private store for learning materials implemented in this phase; evidence flow untouched |

## 5. Decisions taken (and why)

1. **`booking_sessions` is the learning session.** A new table would fork the
   state machine, conflict checks, reminders, and calendar export. LMS adds
   `actual_started_at` and an idempotency key only.
2. **`no_show` is the missed-session state.** No `ready`/`missed` aliases are
   added; `ready` would be a derived UI label, not a stored state.
3. **No `SessionParticipant` table.** Every booking session is one tutor + one
   student (`booking_sessions.student_user_id`), and attendance is already
   unique per (session, participant). Group sessions do not exist in the
   booking model.
4. **No `SessionNote` table.** Completion notes are audited; tutor-authored
   private notes are represented by draft lesson-plan content, which is never
   exposed to students/guardians until published.
5. **No separate assessment entity.** `assignment_submissions.score` +
   `max_score` is the grading record; `progress_reports` is the tutor-authored
   narrative.
6. **Lesson plan ≠ session record.** `lesson_plans` is reusable (booking-level,
   optionally linked to one session); `learning_materials` attach to a plan,
   a session, an assignment, or a booking.
7. **Uploads are local-private files** under a configurable
   `LEARNING_UPLOAD_DIR`, registered in `file_assets` with
   `purpose='learning_material'`, validated by magic bytes and size, and
   streamed only through an authorization-checked route. No malware scanning is
   implemented and this is documented rather than claimed.
8. **Financial release stays manual.** `settleMilestone` is not called from a
   session endpoint. Completion writes a durable outbox event once, guarded by
   `session.completed:<sessionId>`.
