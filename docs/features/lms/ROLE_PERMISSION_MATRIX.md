# LMS Role & Privacy Matrix

All permissions are enforced in the API. The web route policy is a UX aid only.

Legend: **Y** allowed · **Own** allowed only through the ownership rule in the
row · **—** denied (403/404) · **n/a** no such capability exists in this phase.

Ownership rules:

- **T** = caller is `booking_sessions.tutor_user_id` / `bookings.tutor_user_id`.
- **S** = caller is the student (`student_user_id`).
- **G** = caller has an **active** `guardian_student_links` row to the student.
- **A** = caller has role `admin` or `super_admin` (`isAdminRole`).

## Matrix

| Operation                        | student       | guardian    | tutor           | admin        | super_admin | support_agent | compliance_reviewer | organization_owner | organization_staff |
| -------------------------------- | ------------- | ----------- | --------------- | ------------ | ----------- | ------------- | ------------------- | ------------------ | ------------------ |
| Read session list/detail         | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Create/schedule session          | —¹            | —¹          | T               | A            | A           | —             | —                   | —                  | —                  |
| Start session                    | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Complete session                 | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Cancel / reschedule              | S/G by policy | G by policy | T               | A            | A           | —             | —                   | —                  | —                  |
| Read attendance                  | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Record/correct attendance        | —             | —           | T (72 h window) | A (any time) | A           | —             | —                   | —                  | —                  |
| Read attendance summary/report   | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Create/edit lesson plan          | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Publish/archive lesson plan      | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Read lesson plan (published)     | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Read lesson plan (draft)         | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Upload learning material         | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Download published material      | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Download draft material          | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Create assignment                | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Publish/archive assignment       | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| List assignments                 | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Submit homework                  | S             | —           | —               | —            | —           | —             | —                   | —                  | —                  |
| Review queue / submission detail | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Grade / return submission        | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Create/update learning goal      | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Read learning goal               | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Read progress summary            | S             | G           | T               | A            | A           | —             | —                   | —                  | —                  |
| Create progress report           | —             | —           | T               | A            | A           | —             | —                   | —                  | —                  |
| Export learning report           | n/a           | n/a         | n/a             | n/a          | n/a         | n/a           | n/a                 | n/a                | n/a                |
| Organization-scoped LMS records  | n/a           | n/a         | n/a             | n/a          | n/a         | n/a           | n/a                 | n/a                | n/a                |

¹ Guardians and students cannot create sessions directly. Session scheduling is
a tutor/admin operation in Phase 04; a requester/guardian participates through
the booking request and reschedule/cancel flows.

`support_agent` and `compliance_reviewer` have **no** LMS read access. The
support module and tutor-verification module already cover their documented
duties; widening LMS access would expose private learning records.

`organization_owner` / `organization_staff` have no LMS access because no
organization entity, membership model, or org-scoped query exists. This is a
documented gap, not a hidden grant.

## Security assertions (tested)

| Assertion                                               | Enforcement point                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Student A cannot read student B's session               | `SessionQueriesService.getSessionById` → `GuardianAccessService.assertCanAccessBooking`          |
| Student A cannot read student B's submission/assignment | `LearningAccessService.assertCanAccessStudentRecords` + assignment ownership checks              |
| Guardian cannot read an unrelated child's history       | `GuardianAccessService.hasActiveLink` / `assertActiveLink`; summaries revalidate                 |
| Guardian cannot submit for a child                      | `submitAssignment` requires `user.id === assignment.studentUserId`                               |
| Tutor A cannot mutate tutor B's session                 | `startSession`/`completeSession`/reschedule/cancel compare `session.tutorUserId`                 |
| Tutor A cannot grade tutor B's submission               | `gradeSubmission` compares `assignment.tutorUserId`                                              |
| Student cannot mark themselves present                  | `markAttendance` requires tutor/admin                                                            |
| Tutor cannot record attendance outside their session    | `markAttendance` compares `session.tutorUserId`                                                  |
| Attendance correction requires a reason and window      | `LearningAttendanceService`                                                                      |
| Attachment ID substitution is rejected                  | ownership + purpose check in `LearningAssignmentsService` and material download authorization    |
| Admin cannot bypass session invariants                  | admins still pass `assertSessionTransition` and completion preconditions; only role checks widen |
| Super-admin access is explicit                          | via `isAdminRole`/`isSuperAdmin`; LMS has no blanket bypass beyond the admin family              |
| Learning history survives deactivation                  | FKs use RESTRICT/SET NULL, never CASCADE from users/tutors/bookings (new tables)                 |

## Route surface by role (web)

| Role                               | LMS routes                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| student                            | `/dashboard/student/sessions`, `/dashboard/student/learning`, `/sessions/[id]`, `/assignments/[id]`, `/progress/[id]`       |
| guardian                           | `/dashboard/guardian/sessions`, `/dashboard/guardian/learning` (child selector), `/dashboard/guardian/children/[studentId]` |
| tutor                              | `/dashboard/tutor/sessions`, `/dashboard/tutor/learning`, `/tutor/lesson-plans`, `/assignments/[id]/submissions`            |
| admin, super_admin                 | `/dashboard/admin/learning` (session oversight), all read links                                                             |
| support_agent, compliance_reviewer | none (existing dashboards only)                                                                                             |
| organization_*                     | none (no org model)                                                                                                         |
