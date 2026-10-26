# OgroniEdu — Feature and Role Matrix

**Status:** VERIFIED (2026-10-24)  
**Purpose:** Maps every role to every feature/route, identifying which role can perform which operation.

---

## 1. Canonical Role List

| Code                  | Label (BN)        | Scope                                                |
| --------------------- | ----------------- | ---------------------------------------------------- |
| `student`             | শিক্ষার্থী        | Learner; 18+ independent or guardian-linked if minor |
| `guardian`            | অভিভাবক           | Parent/guardian managing minor students              |
| `tutor`               | শিক্ষক            | Verified educator                                    |
| `admin`               | प्रशासक           | Platform operations manager                          |
| `super_admin`         | প্রধান प्रशासক    | Platform executive/security                          |
| `support_agent`       | সহায়তা কর্মী     | Customer dispute/ticket triage                       |
| `compliance_reviewer` | মানদণ্ড পর্যালোচক | Tutor identity/degree verification auditor           |
| `organization_owner`  | প্রতিষ্ঠান_owner  | Coaching center/academy owner                        |
| `organization_staff`  | প্রতিষ্ঠান_Staff  | Institutional academic coordinator                   |

---

## 2. Granular Permission Registry

| Permission Code               | Description                                                    | Default Roles                                                           |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `public.tutor.browse`         | Browse published, approved tutor directory                     | `guest`, `student`, `guardian`, `tutor`, `admin`                        |
| `auth.session.manage`         | Inspect and revoke own login sessions                          | `student`, `guardian`, `tutor`, `support_agent`, `admin`, `super_admin` |
| `guardian.child.link`         | Link and manage child learner profiles                         | `guardian`                                                              |
| `guardian.child.view`         | View academic data for linked children only                    | `guardian`                                                              |
| `tutor.profile.edit`          | Update own bio, subjects, pricing, availability                | `tutor`                                                                 |
| `tutor.credential.submit`     | Upload NID and academic certificates                           | `tutor`                                                                 |
| `tutor.verification.review`   | Approve, reject, or request info on tutor verification         | `admin`, `super_admin`                                                  |
| `booking.request.create`      | Initiate booking requests for self or linked child             | `guardian`, `student`                                                   |
| `booking.request.respond`     | Accept, decline, or counter booking requests                   | `tutor`                                                                 |
| `booking.view.own`            | View bookings where user is participant/guardian               | `guardian`, `student`, `tutor`                                          |
| `session.attendance.record`   | Mark student attendance for active session                     | `tutor`                                                                 |
| `learning.assignment.create`  | Assign homework to booked student                              | `tutor`                                                                 |
| `learning.assignment.submit`  | Submit homework solution                                       | `student`                                                               |
| `learning.progress.create`    | Create bi-weekly progress evaluation report                    | `tutor`                                                                 |
| `payment.checkout.create`     | Initiate payment for awaiting booking                          | `guardian`, `student`                                                   |
| `payment.refund.request`      | Request refund or dispute for cancelled/unsatisfactory session | `guardian`, `student`                                                   |
| `payment.refund.review`       | Approve or reject refund/dispute case                          | `admin`, `super_admin`                                                  |
| `financial.ledger.view`       | View platform double-entry balance sheets                      | `super_admin`                                                           |
| `notification.read.own`       | Receive and mark real-time in-app notifications                | All Authenticated Roles                                                 |
| `admin.audit.view`            | Inspect platform audit trails                                  | `admin`, `super_admin`                                                  |
| `platform.settings.edit`      | Modify platform fees, feature flags, policies                  | `super_admin`                                                           |
| `organization.member.manage`  | Add/remove members from organization                           | `organization_owner`, `admin`, `super_admin`                            |
| `organization.invite.member`  | Invite new member to organization                              | `organization_owner`, `admin`, `super_admin`                            |
| `organization.view.analytics` | View organization-level analytics                              | `organization_owner`, `organization_staff`, `admin`, `super_admin`      |

---

## 3. Role-to-Feature Access Matrix

| Feature Area              | student                              | guardian                             | tutor                                | admin                                | super_admin                                 | support_agent                        | compliance_reviewer                  | organization_owner                   | organization_staff                   |
| ------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------ | ------------------------------------ |
| **Auth**                  | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link            | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     | ✅ login/register/OTP/magic link     |
| **Tutor Discovery**       | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) | ✅ search view profiles (no contact)        | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) | ✅ search view profiles (no contact) |
| **Booking Requests**      | ✅ create request                    | ✅ create request / link child       | ✅ respond to requests               | ✅ manage sweep-expired              | ✅ manage sweep-expired                     | ⚠️ support tickets only              | ⚠️ review only                       | ✅ manage                            | ✅ manage                            |
| **Session Scheduling**    | ✅ view sessions                     | ✅ view sessions / linked child      | ✅ schedule sessions (no conflicts)  | ✅ manage all sessions               | ✅ manage all sessions                      | ⚠️ support tickets only              | ⚠️ review only                       | ✅ manage                            | ✅ manage                            |
| **Escrow Payments**       | ✅ checkout (own booking)            | ✅ checkout (own child booking)      | ✅ set prices / publish profile      | ✅ admin refunds/payouts             | ✅ admin refunds/payouts                    | ⚠️ support tickets only              | ⚠️ review only                       | ✅ manage                            | ✅ manage                            |
| **Digital Classroom**     | ✅ attend session (via link)         | ✅ attend session (via link)         | ✅ teach session (via link)          | ✅ view session logs                 | ✅ view session logs                        | ⚠️ support only                      | ⚠️ review only                       | ✅ manage                            | ✅ manage                            |
| **Learning / LMS**        | ✅ submit assignments                | ✅ view submissions (own child)      | ✅ assign / grade / return           | ✅ admin view all                    | ✅ admin view all                           | ⚠️ support tickets only              | ⚠️ review only                       | ✅ manage                            | ✅ manage                            |
| **Tutor Verification**    | ❌                                   | ❌                                   | ✅ submit dossier / view own         | ✅ review / approve / reject         | ✅ review / approve / reject                | ❌                                   | ✅ audit role                        | ❌                                   | ❌                                   |
| **Safety & Trust**        | ❌ submit report (own)               | ❌ submit report (child)             | ⚠️ apply protective hold (own tutor) | ✅ manage all cases                  | ✅ manage all cases                         | ⚠️ triage tickets                    | ✅ review all                        | ❌                                   | ❌                                   |
| **Admin Governance**      | ❌                                   | ❌                                   | ❌                                   | ✅ all dashboards / queries          | ✅ all dashboards / queries + impersonation | ✅ support tickets                   | ✅ queries only                      | ❌ (org settings)                    | ✅ org queries                       |
| **Analytics & Reporting** | ⚠️ own stats only                    | ⚠️ own child stats                   | ⚠️ own earnings only                 | ✅ full overview                     | ✅ full override + feature flags            | ⚠️ support queries                   | ✅ view all reports                  | ⚠️ own org                           | ⚠️ own org                           |
| **Onboarding**            | ✅ complete steps                    | ✅ complete steps (child)            | ❌ (dossier only for tutor)          | ✅ manage all steps                  | ✅ manage all steps                         | ❌                                   | ❌                                   | ❌                                   | ❌                                   |
| **File Upload**           | ❌                                   | ❌                                   | ✅ upload evidence                   | ✅ admin view/access all             | ✅ admin view/access all                    | ❌                                   | ❌                                   | ❌                                   | ❌                                   |
| **Support / Tickets**     | ✅ create own                        | ✅ create own / child                | ⚠️ view own                          | ✅ admin triage all                  | ✅ super_admin admin all                    | ✅ manage all tickets                | ⚠️ triage assigned                   | ❌                                   | ❌                                   |
| **Organization Mgmt**     | ❌                                   | ❌                                   | ❌                                   | ✅ admin view/edit                   | ✅ super_admin admin all                    | ❌                                   | ❌                                   | ✅ manage own org                    | ✅ manage members                    |
| **Taxonomy / Subjects**   | ✅ browse public                     | ✅ browse public                     | ✅ browse public                     | ✅ admin manage all                  | ✅ super_admin admin all                    | ❌                                   | ❌                                   | ✅ manage own org                    | ❌                                   |

### Legend

- ✅ Full access (all operations)
- ❌ No access (route blocked, returns 403/401)
- ⚠️ Partial/limited access (specific operations, often ABAC-guarded)

---

## 4. Guardian-Child ABAC Rules

Guardians operate with an additional `studentId` scope qualifier.

| Operation                   | Additional Condition                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| View child academic data    | Active `guardian_student_links` row: `guardian_user_id = :userId AND student_user_id = :targetId AND status = 'active'` |
| Create booking for child    | Guardian initiates on behalf of linked student (`:studentId`)                                                           |
| View child's assignments    | Must have active guardian_student_link                                                                                  |
| View child's payment data   | Must have active guardian_student_link                                                                                  |
| View guardian's own tickets | No child scope required (general)                                                                                       |
| View child's safety reports | Active `guardian_student_links` row required                                                                            |

---

## 5. Organization ABAC Rules

| Operation                       | Additional Condition                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| View organization analytics     | User belongs to `organization_members` row with role `owner` or `staff` |
| Manage organization             | User is `organization_owner` or assigned `admin` role in org context    |
| Add/remove organization members | Only `organization_owner` (or super_admin globally)                     |
| Invite new member               | `organization_owner` (or admin if delegated)                            |

---

## 6. Permission Enforcement Notes

1. **Frontend visibility is NOT the only authorization control.** Every API route has server-side guards (`@Roles()`, `@UseGuards()`, `@GuardianStudentGuard()`). Never trust `NavSection` rendering as the sole access gate.

2. **Resource ownership** is enforced via `GuardianStudentGuard` (DB lookup `guardian_student_links`), `AuthGuard` (JWT verification), and `RolesGuard` (decorator metadata). These are non-negotiable server-side checks.

3. **`super_admin` always bypasses** role checks when `@Roles(...)` decorator specifies roles that do not include `super_admin`. This is the intended design.

4. **`guardian_student_links` table** is the authoritative source for guardian-student relationship. If no active link exists, the server returns `403 Forbidden` (or `404 Not Found` to prevent enumeration).

---

_End of `05-FEATURE-AND-ROLE-MATRIX.md`._
