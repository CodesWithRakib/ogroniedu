# Tutor Verification — Operations Guide (Phase 02)

Three independently reviewable levels replace a single verification flag:

| Level           | Mandatory evidence                                                                            | Validity policy                |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| `identity`      | `nid_front` **and** `nid_back` (both approved)                                                | re-verify after `validityDays` |
| `educational`   | at least one approved `academic_certificate` **or** `transcript`                              | none (never auto-expires)      |
| `institutional` | at least one approved `institution_letter`, `employment_letter` or `professional_certificate` | none (never auto-expires)      |

`tutor_profiles.verification_status` is **derived** from the three level rows by
`TutorVerificationStatusService.recomputeDerivedStatus` — it is never written by
hand. Only that service recomputes it, so applicant submissions, reviewer
decisions, document revocation and the expiry sweep cannot disagree.

Legal/regulatory validity is not asserted anywhere. `validityDays` is an
operational re-verification interval and is overridable with
`TUTOR_VERIFICATION_VALIDITY_DAYS` (identity level only; `0`/unset keeps the
policy default). Levels whose policy declares `validityDays: null` have no
expiry policy at all.

## Daily maintenance sweep

`TutorVerificationExpiryService.sweep(now?)` is the single scheduled job. It is:

- **deterministic** — the clock is a parameter, so tests need no fake timers;
- **idempotent** — a second run with the same clock mutates nothing and sends no
  duplicate reminder (document reminders advance `reminder_stage` only after a
  successful delivery);
- **fail-open for review, fail-closed for eligibility** — revocation of an
  expired document/level happens before any notification, so a delivery failure
  can never leave expired evidence backed by an approved level.

What it does, in order:

1. **Expired documents** — approved evidence with `expires_on` in the past
   invalidates its level (`expired`), audits
   `tutor.verification.document_expired`, and notifies `tutor.verification_expired`.
2. **Expired levels** — approved levels whose `expires_at` has elapsed move to
   `expired`, are audited (`tutor.verification.level_expired`) and notify.
3. **Reminders** — approved evidence inside the reminder window gets
   `tutor.document_expiring` at stages `D-30` then `D-7`
   (`VERIFICATION_REMINDER_OFFSETS_DAYS`), at most once per stage.

Every touched tutor is recomputed through the status service, which clears
`verified_at`, drops `verification_expires_at` and unpublishes the profile, so an
expired tutor immediately disappears from public discovery and from
`GET /api/v1/tutors/public/:id`.### Scheduling

`TutorVerificationSweepScheduler` runs the sweep once per day from every API
process, anchored to `TUTOR_VERIFICATION_SWEEP_HOUR_UTC` (default `2`, i.e.
02:00 UTC). Exactly-once behaviour across horizontally scaled pods comes from a
PostgreSQL advisory lock (`pg_try_advisory_lock`, key `913402117`): the first
instance to acquire it runs the sweep, the others log a skip. The timer is
re-armed after each run with a recomputed delay, so clock drift never shifts the
window, and it is `unref()`-ed so it cannot hold a CLI/test process open.

| Environment variable                | Default                    | Purpose                                             |
| ----------------------------------- | -------------------------- | --------------------------------------------------- |
| `TUTOR_VERIFICATION_SWEEP_ENABLED`  | on outside `NODE_ENV=test` | Set `false` when an external scheduler owns the job |
| `TUTOR_VERIFICATION_SWEEP_HOUR_UTC` | `2`                        | Daily anchor hour (0-23, UTC)                       |

Because the sweep is idempotent, an operator can also trigger it on demand as a
platform admin:

```
POST /api/v1/admin/tutors/verification/sweep
Authorization: Bearer <admin or super_admin token>
```

The response body reports `expiredLevels`, `expiredDocuments`, `remindersSent`,
`alreadyNotified`, `notifiedTutors` and per-subject `failures`, so the job can be
alerted on non-empty `failures`.

## Reviewer roles and assignment

- `admin` / `super_admin` review any dossier and may reassign cases.
- `compliance_reviewer` reviews unassigned cases and its own assignments only and
  cannot reassign work to another user.
- No one may decide their own dossier (self-approval denial), including
  super admins.
- Decisions carry `expectedVersion`; a mismatch returns `409` so two reviewers
  cannot silently overwrite each other.

Level transitions are validated by `verification-state-machine.ts`. A rejection
allows at most `MAX_LEVEL_RESUBMISSIONS` resubmissions per level; after that only
an admin can reopen the case (`reinstated` re-opens a suspended level as
`under_review`).

## Evidence access

Dossier evidence is stored in private `file_assets`; there are no public URLs.
Reviewers obtain a short-lived signed URL
(`VERIFICATION_SIGNED_URL_TTL_SECONDS`, default 300 s) from
`GET /api/v1/admin/tutors/:tutorId/verification/documents/:documentId/access`,
which re-checks assignment scope and writes
`tutor.verification.document_accessed` to the audit log. The generic
`/api/v1/files/:id/access` route stays restricted to the owner and platform
admins.

## Data handling

- `applicant_feedback` is the only reviewer text sent to the tutor (in-app
  dossier and notifications). `internal_notes` never leave reviewer surfaces —
  notifications carry `level` / `status` only, never document contents, URLs or
  internal notes.
- Evidence rows are soft-deleted and superseded, never hard-deleted, so review
  history survives replacements.
- Retention and erasure requests are handled through the platform privacy
  process; this module keeps no cache of document binaries.

## Runbook checkpoints

| Symptom                             | Check                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Tutor still visible after expiry    | sweep ran today? `tutor_profiles.verification_expires_at` vs `publication_status`  |
| Tutor cannot submit despite uploads | evidence `review_status` must be `approved`, not merely `pending`                  |
| Reviewer sees `409` on decision     | dossier changed since load — reload and re-apply with the fresh `version`          |
| No reminder emails                  | delivery failures leave `reminder_stage` unchanged; the next run retries the stage |
