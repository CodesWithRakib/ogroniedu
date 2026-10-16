# OgroniEdu — User Roles, Permissions & Authorization Matrix

**Date:** 2026-10-10  
**Status:** Approved Security Baseline

---

## 1. System Roles

1. **`guest` (অনিবন্ধিত পরিদর্শক):** Unauthenticated public visitor. Can browse landing pages, view published verified tutor profiles (without contact details), and review public policies.
2. **`student` (শিক্ষার্থী):** A registered learner (must be 18+ for independent account, or linked under a guardian if a minor). Can attend sessions, submit assignments, and review own reports.
3. **`guardian` (অভিভাবক):** Parent or legal guardian. Can register children, book tutors, authorize payments, view attendance, review assignments, and receive real-time notifications.
4. **`tutor` (শিক্ষক):** Verified educator. Can create profile, submit verification documents, define subjects & availability, accept booking requests, mark attendance, give homework, and view earnings.
5. **`support_agent` (সহায়তা কর্মী):** Customer service representative. Can view assigned support tickets, inspect dispute logs (without editing financial records), and communicate with users.
6. **`admin` (প্রশাসক):** Platform operations manager. Can verify tutor credentials, moderate reviews, configure reference catalogs (subjects, curricula), and arbitrate disputes.
7. **`super_admin` (প্রধান প্রশাসক):** Platform executive/security administrator. Full platform access, managing admin roles, platform settings, financial payouts, and audit trail inspection.

---

## 2. Granular Permissions Registry

| Permission Code              | Description                                                    | Default Assigned Roles                                                  |
| ---------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `public.tutor.browse`        | Browse published, approved tutor directory                     | `guest`, `student`, `guardian`, `tutor`, `admin`                        |
| `auth.session.manage`        | Inspect and revoke own login sessions                          | `student`, `guardian`, `tutor`, `support_agent`, `admin`, `super_admin` |
| `guardian.child.link`        | Link and manage child learner profiles                         | `guardian`                                                              |
| `guardian.child.view`        | View academic data for linked children only                    | `guardian`                                                              |
| `tutor.profile.edit`         | Update own bio, subjects, pricing, availability                | `tutor`                                                                 |
| `tutor.credential.submit`    | Upload NID and academic certificates                           | `tutor`                                                                 |
| `tutor.verification.review`  | Approve, reject, or request info on tutor verification         | `admin`, `super_admin`                                                  |
| `booking.request.create`     | Initiate booking requests for self or linked child             | `guardian`, `student`                                                   |
| `booking.request.respond`    | Accept, decline, or counter booking requests                   | `tutor`                                                                 |
| `booking.view.own`           | View bookings where user is participant/guardian               | `guardian`, `student`, `tutor`                                          |
| `session.attendance.record`  | Mark student attendance for active session                     | `tutor`                                                                 |
| `learning.assignment.create` | Assign homework to booked student                              | `tutor`                                                                 |
| `learning.assignment.submit` | Submit homework solution                                       | `student`                                                               |
| `learning.progress.create`   | Create bi-weekly progress evaluation report                    | `tutor`                                                                 |
| `payment.checkout.create`    | Initiate payment for awaiting booking                          | `guardian`, `student`                                                   |
| `payment.refund.request`     | Request refund or dispute for cancelled/unsatisfactory session | `guardian`, `student`                                                   |
| `payment.refund.review`      | Approve or reject refund/dispute case                          | `admin`, `super_admin`                                                  |
| `financial.ledger.view`      | View platform double-entry balance sheets                      | `super_admin`                                                           |
| `notification.read.own`      | Receive and mark real-time in-app notifications                | All Authenticated Roles                                                 |
| `admin.audit.view`           | Inspect platform audit trails                                  | `admin`, `super_admin`                                                  |
| `platform.settings.edit`     | Modify platform fees, feature flags, policies                  | `super_admin`                                                           |

---

## 3. Attribute-Based Access Control (ABAC) & Resource Ownership Rules

Role checks alone are insufficient. The backend API must enforce resource-level ownership guards on every single request:

1. **Guardian Child Ownership Guard:**
   - When a Guardian attempts to access `/api/students/:id/*`, the system queries `guardian_student_links`:

   ```sql
   SELECT 1 FROM guardian_student_links
   WHERE guardian_user_id = :currentUserId
     AND student_user_id = :targetStudentId
     AND status = 'active';
   ```
   - If no active link exists, the server returns `403 Forbidden` (or `404 Not Found` to prevent resource enumeration).

2. **Booking Participant Guard:**
   - A user can only inspect or modify booking `:bookingId` if:

   ```sql
   requester_user_id = :userId
   OR student_user_id = :userId
   OR tutor_user_id = :userId
   OR EXISTS (
       SELECT 1 FROM guardian_student_links
       WHERE guardian_user_id = :userId
         AND student_user_id = bookings.student_user_id
         AND status = 'active'
   );
   ```

3. **Tutor Document Privacy:**
   - Verification assets (National ID images, university grade sheets) are strictly restricted to the owning tutor and authorized `admin` / `super_admin` reviewers. They are never rendered in public DTOs or public asset URLs.

---

## 4. Minor Protection & Safety Guardrails

- Direct communication between tutors and minor students is logged and accessible to the verified guardian in real-time.
- Guardians receive real-time notifications for every session booking, rescheduling, attendance record, and assignment submission.
- Tutors cannot see a minor student's phone number or home address prior to a confirmed, paid booking and guardian consent.
