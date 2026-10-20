# Learning Progress & Goals

## 1. Principle

Progress is **derived from stored learning records** and tutor-authored
observations. There are no fabricated percentages, no hard-coded charts, and no
automatic mastery inference. When there is no evidence, the API returns `null`
metrics and the UI shows an honest empty state.

Two data classes are kept visibly separate:

| Class | Source | Examples |
| --- | --- | --- |
| Calculated | Queries over sessions/attendance/submissions/reviews | attendance rate, completion %, average score, session counts |
| Authored | Tutor-entered text | progress report narrative, goal description, goal evidence |

The API returns authored content under `authored` keys and calculated content
under `metrics` keys so a client cannot confuse them.

## 2. Learning goals

`learning_goals` rows belong to a booking (tutor ↔ student).

| Field | Rule |
| --- | --- |
| `title` | 3–200 chars, required |
| `description` | optional, ≤ 5000 chars |
| `target_date` | optional date |
| `status` | `open`, `in_progress`, `achieved`, `not_achieved`, `cancelled` |
| `evidence` | required when moving to `achieved` or `not_achieved` |

Transitions: `open ↔ in_progress`, `→ achieved`, `→ not_achieved`, `→ cancelled`;
terminal states cannot return to `open` (create a new goal instead).

Who can:

- create: owning tutor, admin/super_admin;
- update status/evidence: owning tutor, admin/super_admin;
- read: the student, active guardians, owning tutor, admin/super_admin.

A goal is never marked achieved by attendance alone; the tutor must record
evidence.

## 3. Progress summary

`GET /api/v1/learning/students/:studentId/progress?bookingId=&from=&to=`

| Metric | Definition | Empty case |
| --- | --- | --- |
| `sessions.completed` | sessions with `status='completed'` in period | `0` |
| `sessions.upcoming` | `status IN (scheduled, in_progress)` starting after now | `0` |
| `sessions.cancelled` | `status='cancelled'` in period | `0` |
| `attendance` | counts + rate + coverage (`ATTENDANCE_RULES.md`) | rate `null` |
| `assignments.published` | published assignments in period | `0` |
| `assignments.submitted` | live submissions (incl. late) | `0` |
| `assignments.reviewed` | reviewed submissions | `0` |
| `assignments.completionRate` | submitted ÷ published | `null` |
| `assignments.averageScore` | mean percentage of reviewed submissions | `null` |
| `goals` | active/achieved goal counts and rows | `[]` |
| `recentFeedback` | last 5 reviewed submissions with feedback (text + score + date) | `[]` |
| `attendanceTrend` | monthly counts/rate for the last 6 months with any sessions | `[]` |
| `latestReport` | most recent `progress_reports` row | `null` |

All queries are bounded (`take` on feedback/trend, offset pagination on
history). Progress never loads the platform's full history.

## 4. Progress reports (authored)

`POST /learning/progress-reports` stays tutor-only (owning tutor) or admin.

- Period is validated (`periodEnd >= periodStart`).
- Metrics embedded in the report (attendance rate, completed assignments,
  average score) are recomputed from records using the formulas above at
  generation time; the stored values are a snapshot.
- `observableProgress` is required (≥ 5 chars), `areasForGrowth` and
  `tutorRemarks` are optional.
- Publishing dispatches `progress.published` to the student and active
  guardians through the outbox.
- Reports are readable by the student, active guardians, the owning tutor, and
  admins. Draft tutor notes are not part of a report; only submitted text is
  exposed.

## 5. Privacy

| Viewer | Sees |
| --- | --- |
| Student | own sessions, attendance, published materials, published assignments, own submissions, published reports, own goals |
| Guardian | the same for actively linked children, one child per query; the API revalidates the link |
| Tutor | records for bookings they own (their own sessions/students) |
| Admin / super_admin | platform-wide read; every elevated read is permission-gated by role and audited where it mutates |
| support_agent, compliance_reviewer, organization_* | no LMS access in this phase |

Private tutor draft content (draft lesson plans/materials) is never returned to
students, guardians, or unrelated tutors.

## 6. Exports

Progress and attendance endpoints return JSON only. There is no LMS CSV/PDF
export in this phase; session calendar export (`.ics`) remains the Phase 04
endpoint. Server-side authorization is enforced on every read, so a future
export cannot bypass it by calling the API.
