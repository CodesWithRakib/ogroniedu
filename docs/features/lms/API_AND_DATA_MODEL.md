# LMS API & Data Model

All routes are under `/api/v1`, require `AuthGuard`, and return the platform
envelope `{ success, data, message?, meta: { requestId, pagination? } }`.
Errors use `{ success: false, error: { code, message, details? } }`.
Collections use offset pagination (`page`, `pageSize` ≤ 100, `meta.pagination`).

## 1. Data model

### Reused (no duplicate model)

| Concept          | Table                    | Note                                                   |
| ---------------- | ------------------------ | ------------------------------------------------------ |
| Learning session | `booking_sessions`       | Extended with `actual_started_at`, `idempotency_key`   |
| Attendance       | `session_attendance`     | Extended with `updated_at`, `correction_reason`        |
| Assignment       | `assignments`            | Extended with topic/subject/publication/attempt policy |
| Submission       | `assignment_submissions` | Extended with attempt metadata                         |
| Progress report  | `progress_reports`       | Unchanged schema                                       |
| File asset       | `file_assets`            | Reused as the registry for learning files              |
| Notification     | `notifications` + outbox | Reused; new registry events only                       |

### New

#### `lesson_plans`

| Column                     | Type                                                | Rules                                              |
| -------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `id`                       | uuid PK                                             |                                                    |
| `booking_id`               | uuid → `bookings(id)` ON DELETE RESTRICT            | required; ownership anchor                         |
| `session_id`               | uuid → `booking_sessions(id)` ON DELETE SET NULL    | optional, must belong to the booking               |
| `tutor_user_id`            | uuid → `tutor_profiles(user_id)` ON DELETE RESTRICT | owner                                              |
| `subject_id`               | uuid → `subjects(id)` ON DELETE SET NULL            | optional, must match booking subject when supplied |
| `title`                    | text                                                | 3–200 chars                                        |
| `description`              | text                                                | ≤ 5000                                             |
| `objectives`               | text[]                                              | ≤ 20 entries, each ≤ 300 chars                     |
| `steps`                    | jsonb                                               | `[{ title, durationMinutes?, notes? }]`, ≤ 20      |
| `status`                   | text                                                | `draft` · `published` · `archived`                 |
| `published_at`             | timestamptz                                         | set on first publish                               |
| `created_at`, `updated_at` | timestamptz                                         |                                                    |

Indexes: `(booking_id, created_at DESC)`, `(tutor_user_id, status)`.

#### `learning_materials`

| Column                     | Type                                   | Rules                                                      |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `id`                       | uuid PK                                |                                                            |
| `booking_id`               | uuid → `bookings(id)` RESTRICT         | required                                                   |
| `lesson_plan_id`           | uuid → `lesson_plans(id)` CASCADE      | optional (plan-owned content may be deleted with the plan) |
| `session_id`               | uuid → `booking_sessions(id)` SET NULL | optional                                                   |
| `assignment_id`            | uuid → `assignments(id)` CASCADE       | optional                                                   |
| `uploaded_by_user_id`      | uuid → `users(id)` SET NULL            | actor                                                      |
| `kind`                     | text                                   | `file` or `link`                                           |
| `file_asset_id`            | uuid → `file_assets(id)` RESTRICT      | exactly one of file/url                                    |
| `external_url`             | text                                   | `https://` only                                            |
| `title`                    | text                                   | 2–200                                                      |
| `description`              | text                                   | ≤ 2000                                                     |
| `status`                   | text                                   | `draft` · `published` · `archived`                         |
| `published_at`             | timestamptz                            |                                                            |
| `created_at`, `updated_at` | timestamptz                            |                                                            |

CHECK: exactly one of `file_asset_id` / `external_url`.
Indexes: `(lesson_plan_id)`, `(session_id, status)`, `(booking_id, status)`,
`(assignment_id)`.

#### `learning_goals`

| Column                     | Type                                      | Rules                                                              |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `id`                       | uuid PK                                   |                                                                    |
| `booking_id`               | uuid → `bookings(id)` RESTRICT            | required                                                           |
| `student_user_id`          | uuid → `users(id)` RESTRICT               | must equal booking student                                         |
| `tutor_user_id`            | uuid → `tutor_profiles(user_id)` RESTRICT | must equal booking tutor                                           |
| `title`                    | text                                      | 3–200                                                              |
| `description`              | text                                      | ≤ 5000                                                             |
| `target_date`              | date                                      | optional                                                           |
| `status`                   | text                                      | `open` · `in_progress` · `achieved` · `not_achieved` · `cancelled` |
| `evidence`                 | text                                      | required for achieved/not_achieved                                 |
| `created_by_user_id`       | uuid → `users(id)` SET NULL               |                                                                    |
| `achieved_at`              | timestamptz                               | set with terminal positive status                                  |
| `created_at`, `updated_at` | timestamptz                               |                                                                    |

Indexes: `(student_user_id, status)`, `(booking_id, created_at DESC)`.

#### `assignment_revisions` (immutable attempt history)

| Column                        | Type                                        |
| ----------------------------- | ------------------------------------------- |
| `id`                          | uuid PK                                     |
| `submission_id`               | uuid → `assignment_submissions(id)` CASCADE |
| `attempt_number`              | integer > 0                                 |
| `submission_text`             | text                                        |
| `asset_ids`                   | uuid[]                                      |
| `submitted_at`                | timestamptz                                 |
| `status`                      | text                                        |
| `score` / `max_score`         | numeric                                     |
| `tutor_feedback`              | text                                        |
| `reviewed_by` / `reviewed_at` | uuid / timestamptz                          |
| `return_reason`               | text                                        |
| `created_at`                  | timestamptz                                 |

Unique `(submission_id, attempt_number)`.

### Retention

- New learning tables never cascade from `users`, `tutor_profiles`, or
  `bookings`: account/tutor deactivation must not erase learning history.
- `lesson_plans` → materials cascade (plan content is a unit).
- `assignments.booking_id` still has `ON DELETE CASCADE` from migration `003`;
  changing it would rewrite migration history. Documented limitation: bookings
  are not deleted in normal operation, and the API never exposes booking
  deletion.
- `file_assets` are soft-deleted (`deleted_at`); learning material rows use
  `RESTRICT` to prevent dangling references.

## 2. Endpoints

### Sessions (Phase 04, extended)

| Method | Path                                                        | Notes                                |
| ------ | ----------------------------------------------------------- | ------------------------------------ |
| `POST` | `/sessions`                                                 | Now accepts `Idempotency-Key` header |
| `POST` | `/sessions/:id/start`                                       | Tutor/admin only                     |
| `POST` | `/sessions/:id/complete`                                    | Idempotent, durable event            |
| `GET`  | `/sessions`                                                 | Role-scoped list (unchanged)         |
| `GET`  | `/sessions/:id`                                             | Role-scoped detail (unchanged)       |
| `GET`  | `/sessions/calendar/ical[/file]`                            | Unchanged                            |
| `POST` | `/sessions/:id/cancel`, `/reschedule`, `PATCH /meeting-url` | Unchanged                            |

### Learning — attendance

| Method | Path                                       | Who                         |
| ------ | ------------------------------------------ | --------------------------- |
| `POST` | `/learning/attendance`                     | tutor/admin                 |
| `GET`  | `/learning/sessions/:sessionId/attendance` | participants/guardian/admin |
| `GET`  | `/learning/attendance/summary`             | self/guardian/tutor/admin   |
| `GET`  | `/learning/students/:studentId/attendance` | self/guardian/tutor/admin   |

### Learning — lesson plans & materials

| Method  | Path                                              | Who                                                   |
| ------- | ------------------------------------------------- | ----------------------------------------------------- |
| `POST`  | `/learning/lesson-plans`                          | tutor/admin                                           |
| `GET`   | `/learning/lesson-plans?bookingId=&status=&page=` | authorized (published only for non-owners)            |
| `GET`   | `/learning/lesson-plans/:id`                      | authorized                                            |
| `PATCH` | `/learning/lesson-plans/:id`                      | owner tutor/admin                                     |
| `POST`  | `/learning/lesson-plans/:id/publish`              | owner tutor/admin                                     |
| `POST`  | `/learning/lesson-plans/:id/archive`              | owner tutor/admin                                     |
| `POST`  | `/learning/lesson-plans/:id/materials`            | owner tutor/admin                                     |
| `POST`  | `/learning/materials/upload`                      | tutor/admin (multipart-free JSON base64)              |
| `PATCH` | `/learning/materials/:id`                         | uploader tutor/admin                                  |
| `POST`  | `/learning/materials/:id/publish`                 | uploader tutor/admin                                  |
| `POST`  | `/learning/materials/:id/archive`                 | uploader tutor/admin                                  |
| `GET`   | `/learning/materials/:id/download`                | authorized participants                               |
| `GET`   | `/learning/sessions/:sessionId/materials`         | authorized participants (published only unless owner) |
| `GET`   | `/learning/sessions/:sessionId/lesson-plan`       | authorized participants                               |

### Learning — homework

| Method | Path                                                        | Who                                |
| ------ | ----------------------------------------------------------- | ---------------------------------- |
| `POST` | `/learning/assignments`                                     | tutor/admin (draft by default)     |
| `GET`  | `/learning/assignments?bookingId=&studentId=&status=&page=` | role-scoped                        |
| `GET`  | `/learning/assignments/:id`                                 | role-scoped                        |
| `POST` | `/learning/assignments/:id/publish`                         | owner tutor/admin                  |
| `POST` | `/learning/assignments/:id/archive`                         | owner tutor/admin                  |
| `GET`  | `/learning/assignments/:id/submissions`                     | owner tutor/admin                  |
| `POST` | `/learning/assignments/:id/submissions`                     | assigned student                   |
| `GET`  | `/learning/submissions/:id`                                 | owner tutor/admin/student/guardian |
| `GET`  | `/learning/submissions/:id/revisions`                       | owner tutor/admin/student/guardian |
| `POST` | `/learning/submissions/:id/review`                          | owner tutor/admin                  |
| `POST` | `/learning/submissions/:id/return`                          | owner tutor/admin                  |

`POST /learning/submissions/:id/grade` is kept as an alias of `review` for the
existing web client and contracts.

### Learning — goals & progress

| Method  | Path                                                  | Who               |
| ------- | ----------------------------------------------------- | ----------------- |
| `POST`  | `/learning/goals`                                     | tutor/admin       |
| `GET`   | `/learning/goals?studentId=&bookingId=&status=&page=` | authorized        |
| `PATCH` | `/learning/goals/:id`                                 | owner tutor/admin |
| `POST`  | `/learning/progress-reports`                          | owner tutor/admin |
| `GET`   | `/learning/progress-reports/:id`                      | authorized        |
| `GET`   | `/learning/students/:studentId/progress`              | authorized        |
| `GET`   | `/learning/students/:studentId/summary`               | authorized (kept) |
| `GET`   | `/learning/bookings/:bookingId`                       | authorized (kept) |
| `GET`   | `/learning/admin/sessions`                            | admin/super_admin |

## 3. Validation & mapping rules

- DTOs use `class-validator`; the global pipe rejects unknown properties.
- Query DTOs extend `OffsetPaginationQueryDto`; sortable fields are
  whitelisted via `assertSortAllowed`.
- Entities are never returned raw for lists; mappers return stable view fields
  (no storage keys, no internal checksums, no meeting URL tokens in exports).
- 404 for missing/unreadable resources where existence itself is private, 403
  for known-but-forbidden operations, 409 for state/concurrency conflicts, 400
  for validation.
