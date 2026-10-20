# Homework & Assessment

## 1. Assignment lifecycle

```
draft ──publish──▶ published ──archive──▶ archived
  ▲                   │
  └──────archive──────┘
```

| State | Visible to students/guardians | Submittable |
| --- | --- | --- |
| `draft` | no | no |
| `published` | yes | yes (if due rules allow) |
| `archived` | no new work; existing submissions readable by tutor/admin | no |

Rules:

- Created as `draft` unless the tutor publishes immediately.
- Only the owning tutor or admin/super_admin may publish/archive.
- `published_at` is set on first publish and never cleared.
- Archiving is not deletion: submissions, revisions, and scores remain.
- An assignment always belongs to a booking and therefore to exactly one
  tutor and one student. Student-specific targeting is inherent; arbitrary
  student IDs are never accepted.
- Optional `session_id` must belong to the same booking.
- `max_score` is 1–1000; the submission score must be `0 ≤ score ≤ max_score`.

## 2. Submission lifecycle

```
(none) ──submit──▶ submitted ──start review──▶ under_review*
   │                    │                          │
   │                    ├──review────▶ reviewed ────┘
   │                    └──return───▶ returned ──resubmit──▶ submitted
   └── late submission ─▶ late ── (same review path)
```

`under_review` is an API/UI projection: the stored status becomes `reviewed`
when a score/feedback is recorded. A `returned` submission can be resubmitted
until the attempt limit is exhausted.

Stored statuses: `submitted`, `late`, `reviewed`, `returned`. `draft` is
deliberately not stored — a student either submits or does not, and a stored
draft would require server-side partial-work storage with no product
requirement.

### Submission rules

| Rule | Behaviour |
| --- | --- |
| Ownership | Only `student_user_id === assignment.student_user_id` may submit. Guardians cannot submit for a child. |
| Assignment state | Must be `published`; drafts/archived → 400. |
| Due date | After `due_at`: allowed only when `late_submission_allowed`; status becomes `late`. |
| Attempts | `attempt_count` increments on each submission; capped by `max_attempts` (default 3). |
| Resubmission | Allowed when `resubmission_allowed` and the previous state is `returned` or `submitted`/`late` before review; not allowed after `reviewed` unless the tutor returned it. |
| History | The previous attempt is copied to `assignment_revisions` before the live row is overwritten. Revisions are immutable. |
| Attachments | Every `assetId` must exist, be owned by the submitting student, and have a learning purpose (`assignment_submission`). Otherwise 400. |
| Concurrency | The live submission row is written in a transaction with a `pessimistic_write` lock; two racing submissions serialize and the second becomes the next attempt. |

## 3. Review lifecycle

- Only the owning tutor or admin/super_admin may review.
- A review requires a score (`0 ≤ score ≤ max_score`). Feedback is optional but
  recommended.
- Changing an existing score requires `revisionReason` (existing rule, kept).
- Review timestamps/actor are stored; every review is audited.
- `return-for-revision` requires a reason, sets `returned`, `returned_at`,
  `return_reason`, and notifies the student. It does not delete the attempt.
- Returning does not change the assignment state.

## 4. Attachments

- Tutor-side attachments are `learning_materials` rows with
  `assignment_id` set and `kind='file'` (bytes in the private learning store)
  or `kind='link'` (`https://` only). Arbitrary remote URLs are not trusted
  content; links are rendered as links and never fetched by the server.
- Student-side attachments are `file_assets` referenced by
  `assignment_submissions.asset_ids`; the server validates existence, ownership,
  and purpose.
- Malware scanning is **not implemented**. `file_assets.malware_scan_status`
  is set to `not_required` for learning files so the platform never claims a
  scan it did not perform.
- Allowed types: PDF, JPEG, PNG, WEBP. Limit: 10 MB per file. Names are
  sanitized; storage keys are generated.

## 5. Grading scheme

There is no rubric entity. A submission stores `score` and `max_score`
(percentage is derived for reporting). This is the assessment record; a separate
`Assessment` table would duplicate it. Rubric-based grading is a documented
future extension, not implemented.

## 6. Statistics formulas

- **Assignment completion %** = submissions with status in
  (`submitted`, `late`, `reviewed`, `returned`) ÷ published assignments that
  were issued to the student in the period. Draft and archived assignments are
  excluded from both numerator and denominator. Cancelled bookings are not
  relevant (assignments belong to a live booking).
- **Average score %** = mean of `score / max_score * 100` over **reviewed**
  submissions only. Unreviewed, returned, and unscored submissions are
  excluded. `null` when there are none.
- Attendance uses the formula in `ATTENDANCE_RULES.md`.
