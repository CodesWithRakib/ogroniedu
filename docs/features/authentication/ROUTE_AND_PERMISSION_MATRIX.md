# Route & Permission Matrix (Phase 01)

**The API is the authorization boundary.** Every statement marked _server_ is enforced in NestJS guards or
services. Statements marked _client_ are supplementary UX and must never be the only control.

## 1. Authentication endpoints

| Endpoint                                 | Access               | Notes                                                                                  |
| ---------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/register`             | public               | Self-signup roles only (`student`, `guardian`, `tutor`). Unique indexes + `23505`→409. |
| `POST /api/v1/auth/login`                | public               | Uniform 401; 5/min per (ip, identifier); blocked statuses rejected.                    |
| `POST /api/v1/auth/refresh`              | refresh cookie/body  | Rotates; reuse revokes all sessions. Blocked statuses rejected.                        |
| `POST /api/v1/auth/logout`               | cookie/body (public) | Revokes the presented session.                                                         |
| `POST /api/v1/auth/revoke-all`           | authenticated        | Revokes every session of the caller.                                                   |
| `POST /api/v1/auth/request-code`         | public               | 3/2min per (ip, contact); invalidates outstanding codes; generic response.             |
| `POST /api/v1/auth/verify-code`          | public               | `contact_verification` consumes; `password_recovery` only checks.                      |
| `POST /api/v1/auth/reset-password`       | public               | Atomic code consumption + `auth_epoch` bump + session revocation.                      |
| `POST /api/v1/auth/magic-link/request`   | public               | 3/5min per (ip, email); generic response; never returns the token.                     |
| `POST /api/v1/auth/magic-link/consume`   | public               | Single-use, expiring, atomically consumed; issues a session.                           |
| `GET  /api/v1/auth/me`                   | authenticated        | Profile + roles.                                                                       |
| `GET  /api/v1/auth/admin-only`           | admin family         | Smoke endpoint for the role guard.                                                     |
| `GET  /api/v1/onboarding/me`             | authenticated        | Derived onboarding status for the caller only.                                         |
| `POST /api/v1/onboarding/steps/:stepKey` | authenticated        | Step must belong to the caller's role track.                                           |

## 2. Role → capability boundaries (server-enforced)

| Role                  | May do                                                                                              | Must not do                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `student`             | own profile, own onboarding, own bookings/learning records                                          | guardian/tutor/admin/organization resources; other students' data    |
| `guardian`            | own profile; **only** students with an active `guardian_student_links` row (`GuardianStudentGuard`) | unrelated students; tutor/admin surfaces                             |
| `tutor`               | own profile, verification dossier, own bookings/sessions/records                                    | other tutors' dossiers; admin surfaces                               |
| `admin`               | admin-family operational surfaces                                                                   | `super_admin`-only privileged operations; unrestricted platform root |
| `super_admin`         | privileged operations                                                                               | (still audited; `RolesGuard` bypass is explicit)                     |
| `support_agent`       | support/dispute queues in the admin family                                                          | tutor verification decisions, user role grants                       |
| `compliance_reviewer` | verification/compliance review surfaces in the admin family                                         | support queues, role grants                                          |
| `organization_owner`  | own organization and its members (later-phase routes)                                               | other organizations; admin surfaces                                  |
| `organization_staff`  | assigned organizational resources                                                                   | ownership operations; other organizations                            |

Implementation anchors: `common/auth/role.utils.ts` (`ADMIN_ROLES`, `SUPPORT_TRIAGE_ROLES`, `isAdminRole`,
`isSuperAdmin`), `common/guards/roles.guard.ts`, `common/guards/guardian-student.guard.ts`,
`packages/contracts/src/identity.ts` (`PlatformRoles`, `SelfSignupRoles`).

## 3. Frontend route policy (`apps/web/src/lib/route-policy.ts`)

| Prefix (locale stripped) | Allowed roles                                          | Onboarding-gated |
| ------------------------ | ------------------------------------------------------ | ---------------- |
| `/admin`                 | admin, super_admin, support_agent, compliance_reviewer | yes              |
| `/dashboard/tutor`       | tutor                                                  | yes              |
| `/dashboard/guardian`    | guardian                                               | yes              |
| `/dashboard/student`     | student                                                | yes              |
| `/dashboard`             | all authenticated                                      | yes              |
| `/bookings`, `/requests` | student, guardian, tutor                               | yes              |
| `/tutor`                 | tutor, organization_owner, organization_staff          | yes              |
| `/profile`               | all authenticated                                      | no               |
| `/notifications`         | all authenticated                                      | no               |
| `/onboarding`            | all authenticated                                      | no               |

Unmapped paths are public (e.g. `/tutors`, `/login`, `/register`, `/forgot-password`, `/magic-link`).

## 4. Onboarding tracks and gates

| Role                                                      | Steps (R = required, A = approval-gated, S = system-verified, U = user-submittable)                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| student                                                   | contact_verification (R,S) → profile (R,U) → learning_preferences (R,U)                                 |
| guardian                                                  | contact_verification (R,S) → profile (R,U) → link_student (R,S)                                         |
| tutor                                                     | contact_verification (R,S) → profile (R,U) → education (R,U) → documents (R,U,A) → verification (R,S,A) |
| admin / super_admin / support_agent / compliance_reviewer | security_setup (R,U)                                                                                    |
| organization_owner                                        | contact_verification (R,S) → organization_profile (R,U) → ownership_verification (R,S,A)                |
| organization_staff                                        | membership (R,S) → security_setup (R,U)                                                                 |

Rules enforced server-side:

- A step is completable only if it belongs to the caller's resolved role track and is `submittable`.
- `approvalGated` steps move to `pending_review`; they never mark the track complete by themselves.
- `systemVerified` steps (verified contact, active guardian link, tutor verification, ownership, membership)
  are derived from trusted tables — never from user input.
- Completing the tutor `documents` step does **not** set `tutor_profiles.verification_status`.
- The track resolves to the most constrained role the user holds (`ONBOARDING_ROLE_PRIORITY`).

## 5. Session/token policy

- Access token: HS256, 15 minutes, `iss=ogroniedu-api`, `aud=ogroniedu-clients`, carries `authEpoch`.
- Refresh token: opaque 320-bit, stored only as a SHA-256 hash, 7 days, single-use (rotation).
- Reuse of a rotated token revokes **all** the user's sessions.
- Account status and `auth_epoch` are re-checked on every guarded request; suspension, deactivation and
  password reset invalidate outstanding access tokens.
- Web client: refresh token is memory-only; the API sets it as an `HttpOnly` cookie.
