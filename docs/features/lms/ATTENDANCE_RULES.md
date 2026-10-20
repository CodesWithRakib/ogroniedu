# Attendance Rules

## 1. Ownership

| Operation | student | guardian | tutor | admin / super_admin | support_agent | compliance_reviewer | organization_* |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Read own attendance | yes | — | — | yes | no | no | no |
| Read child attendance | — | active link only | — | yes | no | no | no |
| Read session attendance | own session | linked child's session | own session | yes | no | no | no |
| Write / correct | **no** | **no** | assigned tutor only | yes | no | no | no |

Every write re-derives the session from the database; the participant is never
taken on trust.

## 2. States

| State | Meaning | Counted as attendance? |
| --- | --- | --- |
| `present` | Attended for the session | yes |
| `late` | Attended, arrived late | yes (documented policy) |
| `absent` | Did not attend | no |
| `excused` | Absent with an accepted reason | excluded from the denominator |
| `not_recorded` | No row exists for the participant/session | excluded from the denominator |

`not_recorded` is **derived**, never stored. Missing attendance is never
counted as present.

## 3. Write rules

1. The session must exist.
2. Caller must be `session.tutorUserId` or an admin/super_admin.
3. `participantUserId` must equal `session.studentUserId` (1:1 sessions; group
   attendance would require a participant table, which the booking model does
   not have).
4. One row per `(session_id, participant_user_id)`; the unique constraint is
   the final guard against duplicate records.
5. Attendance may be recorded for `scheduled`, `in_progress`, or `completed`
   sessions. It may not be recorded for `cancelled` or `no_show` sessions.
6. First write stores `recorded_by` / `recorded_at`.
7. Every later write is a **correction**:
   - requires a non-empty `correctionReason` (max 500 chars);
   - tutor corrections are allowed until `session.endsAt + 72h`; after that,
     only admin/super_admin may correct;
   - `updated_at` moves, `recorded_by`/`recorded_at` move to the correcting
     actor, and the previous status/notes/reason are written to the audit log
     (`learning.attendance_corrected`).
8. Tickets are never silently deleted. Corrections are audit records.

## 4. Percentage formula

For a student and a period `[from, to]` (inclusive, evaluated on session
`startsAt`):

```
recorded   = present + late + absent          (rows that exist)
attended   = present + late
rate       = recorded === 0 ? null : round(attended / recorded * 100, 2)
```

- **Denominator**: `present + late + absent`. `excused` is excluded because the
  absence was accepted; `not_recorded` is excluded because there is no
  observation.
- The API returns `null` (not `100`) when `recorded === 0`. The UI renders
  "not enough data" rather than a fabricated 100%.
- `coverage` is reported as `recorded / sessionsInPeriod` so a consumer can see
  how much of the schedule was observed. Sessions that were cancelled or
  marked `no_show` are excluded from `sessionsInPeriod`; sessions in the future
  are excluded as well.
- Trends use calendar months in the session timezone and apply the same
  formula per month.

## 5. Reporting endpoints

| Endpoint | Who | Result |
| --- | --- | --- |
| `GET /api/v1/learning/attendance/summary?studentId=&bookingId=&from=&to=` | student self, active guardian, assigned tutor, admin | counts, rate, coverage, period |
| `GET /api/v1/learning/students/:studentId/attendance?page=&pageSize=&from=&to=` | same | offset-paginated history with session subject/time |
| `GET /api/v1/learning/students/:studentId/progress` | same | attendance block + trend + assignment/score/goals |
| `GET /api/v1/learning/sessions/:sessionId/attendance` | session participants, active guardian, admin | rows for the session |
| `GET /api/v1/learning/admin/sessions` | admin / super_admin | platform session oversight with filters |

## 6. Online meeting evidence

No video provider is integrated. Attendance is manual and the record's
provenance is `manual` (implicit). The platform does **not** claim automated or
meeting-verified attendance. If a provider is added later, a `verified_by`
provenance column must be introduced rather than reinterpreting manual rows.
