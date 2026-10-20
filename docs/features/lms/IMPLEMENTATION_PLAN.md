# Phase 06 — Implementation Plan

## Objective

Make the existing learning surface a complete, evidence-based LMS on top of the
already-shipped booking, payment, notification, and file infrastructure:
lesson plans and materials, assignment publication/submission/review with
history, per-participant attendance with reporting, learning goals, and
progress derived from real records — with server-side ownership on every
operation and no duplicate state machines.

## Non-goals

- Video conferencing integration. Meeting URLs remain tutor-supplied metadata;
  no provider is invented.
- Automatic financial release on session completion. Settlement stays the
  explicit Phase 05 financial action.
- Organization scoping (`organization_owner`/`organization_staff`): no
  organization data model exists and this phase does not invent one.
- A second availability engine or a second booking state machine.
- Phase 07 (notifications redesign, analytics expansion, etc.).

## Workstreams

### 1. Persistence — migration `023_learning_lms.sql`

Additive only; existing rows keep working.

- `lesson_plans` (booking, optional session, tutor, optional subject, title,
  description, objectives `text[]`, steps `jsonb`, status
  `draft|published|archived`, `published_at`, timestamps).
- `learning_materials` (optional plan/session/assignment, booking, uploader,
  `file_asset_id` or `external_url` — exactly one — title, description, kind
  `file|link`, status, `published_at`, timestamps, indexes).
- `learning_goals` (booking, student, tutor, title, description, target date,
  status `open|in_progress|achieved|not_achieved|cancelled`, evidence,
  `created_by_user_id`, `achieved_at`, timestamps).
- `assignment_revisions` (immutable attempt snapshots: submission, attempt
  number, text, asset ids, submitted/reviewed timestamps, status, score,
  feedback, review actor, return reason; unique `(submission_id, attempt_number)`).
- `assignments`: `subject_id`, `topic`, `published_at`,
  `resubmission_allowed`, `late_submission_allowed`, `max_attempts`.
- `assignment_submissions`: `attempt_count`, `returned_at`, `return_reason`,
  `updated_at`.
- `session_attendance`: `updated_at`, `correction_reason`, indexes.
- `booking_sessions`: `actual_started_at`, `idempotency_key` + partial unique
  index.
- Indexes for session/assignment/submission reporting queries.

All learning-history foreign keys use `RESTRICT`/`SET NULL` — never `CASCADE`
from `bookings`, `users`, or `tutors` — so deactivating a tutor or removing a
booking cannot erase learning history. Existing `assignments.booking_id` uses
`CASCADE`; it is left untouched (migration history is preserved) and documented
in the data-model doc.

### 2. Session lifecycle (narrow changes in `bookings` module)

- `startSession`: tutor or admin only; require booking `confirmed|in_progress`;
  set `actual_started_at` once; idempotent for `in_progress`.
- `completeSession`: idempotent for `completed`; reject completion before the
  actual start; store `completed_at`; emit durable outbox
  `session.completed` with `idempotency_key = session.completed:<id>`; notify
  student + active guardians via the worker. Remove the mislabelled
  `attendance.marked` dispatch.
- `scheduleSession`: accept optional `Idempotency-Key` header; persist it and
  return the existing session on replay; map unique violation to the existing
  row.
- Keep every existing transition, conflict, availability, and calendar rule.

### 3. Lesson plans & materials

- `LessonPlansService` (CRUD, publish/archive, session linkage, booking
  authorization, subject validation).
- `LearningMaterialsService`:
  - file upload (JSON base64, matching the existing evidence pattern) with
    size cap 10 MB, MIME allow-list, extension check, magic-byte check,
    filename sanitization, sha-256 checksum, and actual bytes written to
    `LEARNING_UPLOAD_DIR` (default `var/uploads/learning`, outside `public/`);
  - external links restricted to `https://` URLs;
  - publish/archive;
  - authorized byte streaming (`GET /learning/materials/:id/download`) that
    checks the viewer's relationship to the material's plan/session/assignment
    before touching the filesystem;
  - registration in `file_assets` (`purpose='learning_material'`,
    `visibility='private'`, `malware_scan_status='not_required'` — no scanner).
- Session material feed: published materials only for students/guardians;
  drafts visible to the owning tutor/admin.

### 4. Attendance

- Per-participant records (already unique). Add server rules:
  - only the assigned tutor or admin may write;
  - participant must be the session's student;
  - edits after the first record require `correctionReason`;
  - tutor edits are allowed until `endsAt + 72h`; afterwards admin only;
  - corrected records keep `recorded_by`/`recorded_at` as the latest write and
    are audit-logged with previous status/notes and the reason.
- Reporting: `GET /learning/attendance/summary` and
  `GET /learning/students/:id/attendance` using the documented formula
  (`present + late` over `present + late + absent`; `excused` and
  `not_recorded` excluded from the denominator; `null` rate when the
  denominator is zero).
- `not_recorded` is derived (no row) — never stored as present.

### 5. Homework

- `GET /learning/assignments` (role-scoped, filtered, offset-paginated).
- `POST /learning/assignments` gains instructions, due date, topic, subject,
  optional session, and `publishNow` (default false → `draft`), preserving the
  existing default `published` for backwards compatibility? **No** — the
  endpoint now defaults to draft and requires an explicit publish action; the
  existing UI is updated in the same change. (Decision requires product
  approval; documented in the report.)
- `POST /learning/assignments/:id/publish`, `/archive`.
- `GET /learning/assignments/:id/submissions` (tutor/admin review queue).
- Submission: ownership check, assignment published check, due-date rule
  (`late_submission_allowed`), attempt limit, resubmission window, and
  immutable `assignment_revisions` snapshot before each overwrite.
- Review: tutor/admin only; score ≤ `max_score`; return-for-revision sets
  `returned` + reason and allows the next attempt; grade revisions keep the
  existing mandatory reason.
- Attachments: every `assetId` must exist, be owned by the submitter
  (`file_assets.owner_user_id`), and have a learning purpose
  (`assignment_submission`); otherwise 400.

### 6. Learning goals & progress

- `LearningGoalsService`: tutor creates/updates goals for their own booking's
  student; student and active guardian read; only tutor/admin write status;
  status transitions validated; `achieved` requires evidence text; audit +
  durable notification on status change.
- `LearningReportsService`:
  - `GET /learning/students/:id/progress` — sessions completed/upcoming,
    attendance counts/rate, assignment completion (published assignments only),
    average normalized score of reviewed submissions, attendance trend by
    month, goals, recent tutor feedback, last progress report;
  - bounded queries (explicit `take`), no unbounded eager relations;
  - report generation emits the existing `progress.published` event.

### 7. Notifications

- Register `session.started`, `session.completed`, `assignment.published`,
  `learning_goal.updated`, `learning_material.published` in
  `@ogroniedu/contracts` + registry (EN/BN templates, roles, navigation).
- Map them in `OutboxWorkerService`; route learning side effects through the
  outbox with idempotency keys instead of direct dispatch.
- Reminder job already rechecks `status='scheduled'` and
  `reminder_sent_at IS NULL`, so cancelled/rescheduled sessions cannot send
  stale reminders (reschedule clears the reminder flag — verify and cover with
  a test).

### 8. Frontend

- Session detail: start/complete actions (tutor/admin), attendance with
  correction reason, published materials, linked assignments, lesson plan
  summary; no fabricated classroom features added.
- Tutor: lesson planner (create/publish plan, attach material upload/link),
  assignment composer (draft/publish/due date), review queue.
- Student: homework list, submission with attempt/resubmission state, feedback,
  attendance summary, goals.
- Guardian: child selector wired into learning queries (server revalidated),
  child attendance/assignment views.
- Admin: LMS oversight page (session search + attendance/assignment summary)
  using real endpoints, not decorative metrics.
- All new copy added to `messages/en.json` + `messages/bn.json` with matching
  keys; loading/empty/error states; existing UI primitives only.

### 9. Verification

1. `pnpm --filter @ogroniedu/api test`
2. `pnpm --filter @ogroniedu/web test`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm build`
6. Migration apply: **blocked locally** (no database). SQL is reviewed and
   documented as unapplied; the runner applies files automatically in CI/dev.
7. E2E: Playwright requires a running API + DB; record as not executable if the
   environment remains unavailable.

## Order of work

Repository audit → documentation → schema/entities → session lifecycle →
materials/plans → attendance → homework → goals/progress → notifications →
frontend → tests → validation → report.
