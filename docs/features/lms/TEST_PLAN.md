# Phase 06 — LMS Test Plan

Frameworks actually installed: **Vitest** in `apps/api` and `apps/web`;
**Playwright** in `apps/web/e2e`. There is no database-backed integration
harness in the repository; API tests compose real services against mock
repositories, which is how every prior phase is tested.

## 0. Environment constraints

| Constraint                                                                                            | Impact                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local PostgreSQL unreachable (`password authentication failed for user "postgres"`, no Docker daemon) | Migration `023` cannot be applied here; DB-level invariants are covered by SQL review + unit tests of the service rules |
| No Redis                                                                                              | Nothing in the LMS depends on Redis                                                                                     |
| No running API/web stack                                                                              | Playwright journeys cannot execute in this environment; recorded as not run                                             |
| No malware scanner                                                                                    | Not claimed; tests assert `malware_scan_status='not_required'`                                                          |

## 1. Unit tests (API)

New file `apps/api/test/learning-phase06.spec.ts`, plus extensions to
`learning.service.spec.ts`.

### Session lifecycle / eligibility

1. `startSession` rejects a student with 403.
2. `startSession` rejects a tutor who is not the session tutor.
3. `startSession` on `in_progress` returns the same row (idempotent, no audit).
4. `completeSession` on `completed` returns the same row and emits no second
   outbox event.
5. `completeSession` before `actual_started_at` throws 400.
6. Completion writes exactly one `session.completed` outbox row even when the
   service is called twice (unique idempotency key).
7. Scheduling a session for a `requested`/`cancelled` booking is rejected.
8. `scheduleSession` with a replayed `Idempotency-Key` returns the existing row.

### Attendance

9. Present/late count as attended; absent does not; excused is excluded.
10. Rate is `null` when no recorded rows (not 100).
11. Coverage is `recorded / eligible sessions`.
12. Tutor correction after `endsAt + 72h` is rejected; admin allowed.
13. Correction without a reason is rejected; with a reason is audited.
14. Participant mismatch is rejected.
15. Cancelled/no_show session attendance is rejected.
16. Duplicate writes update rather than insert.

### Homework

17. Draft assignments are not visible to students.
18. Submission to a draft assignment is rejected.
19. Late submission is rejected when `late_submission_allowed=false`.
20. Attempt limit is enforced.
21. Resubmission snapshots the previous attempt into `assignment_revisions`.
22. Score above `max_score` is rejected.
23. Non-owning tutor cannot review or return.
24. Guardian cannot submit for the student.
25. Attachment ownership/purpose validation rejects a foreign asset id.
26. Return-for-revision requires a reason and notifies once.

### Progress & goals

27. Completion rate denominator excludes draft/archived assignments.
28. Average score uses reviewed submissions only and is `null` when empty.
29. Attendance trend groups by calendar month with the documented formula.
30. Goal `achieved` requires evidence.
31. Terminal goals cannot be reopened.
32. Student/guardian/tutor access matrix for progress and goals.

### Materials & lesson plans

33. Draft plan/material is hidden from the student.
34. Publish makes it visible and emits exactly one notification event.
35. Link materials reject non-https URLs.
36. Upload rejects oversize, disallowed MIME, extension mismatch, and magic-byte
    spoofing.
37. Download authorization rejects an unrelated user and allows a linked
    guardian.
38. Path traversal in the filename is rejected and the storage key is generated.

## 2. Web tests (Vitest)

New `apps/web/test/learning-phase06.spec.ts`:

- i18n key parity for the new `learningPage`/`sessionDetail` keys.
- Attendance summary formatter renders `null` as "not enough data" (never 100%).
- Assignment status badge mapping for draft/published/archived.
- `computeLearningMetrics` denominator behaviour with zero records.
- Session action visibility: student never receives start/complete actions.
- Guardian child selector changes the query key (no cross-child cache reuse).

## 3. Integration-style tests (API, service composition)

Using real service classes + in-memory fake repositories (existing pattern):

- Eligible booking → session created → visible to student/guardian/tutor →
  start → attendance → complete → one durable completion event.
- Duplicate session creation on retry returns the same session.
- Cancelled booking cannot produce a session.
- Reminder generation skips cancelled sessions and sessions already reminded;
  reschedule clears the reminder flag.
- Assignment publish → student submit → tutor review → student sees feedback.
- Guardian switches children: each summary returns only that child's rows.
- Completion retried: one outbox event, zero settlements (LMS never calls the
  ledger).

## 4. Concurrency

Service-level tests with racing promises where the logic is ours:

1. Two `scheduleSession` calls with the same idempotency key → one row.
2. Two `completeSession` calls → one event.
3. Two submission attempts → attempts serialize, revision history intact.
4. Two reviews → last write wins under lock, both audited, no duplicate
   notification for the same score.
5. Attendance double write → one row (unique key), second is a correction.

Database-level races (GiST exclusion, unique indexes) cannot be executed
without a database and are covered by constraint review; this is recorded in the
report as unverified at runtime.

## 5. End-to-end (Playwright)

Provided as specs only if the stack is runnable; otherwise documented as not
run:

- Flow A booking → session → start → attendance → complete.
- Flow B assignment → publish → submit → review → feedback.
- Flow C guardian selects two children and sees distinct records.
- Flow D material publish → authorized access → unauthorized denial.
- Flow E completion repeat → no duplicate financial side effect.

## 6. Commands

```
pnpm --filter @ogroniedu/api test
pnpm --filter @ogroniedu/web test
pnpm typecheck
pnpm lint
pnpm build
```

Migration check when a database is available:

```
pnpm db:migrate
```

## 7. Pass criteria

- All new unit tests pass.
- Existing API/web suites remain green.
- Typecheck, lint, and production build succeed.
- No unauthorized path returns data (negative tests above).
- Any check that cannot run is listed as not run with the exact blocker.
