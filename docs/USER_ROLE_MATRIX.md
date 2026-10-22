# OgroniEdu — User Role Matrix & Lifecycle Audit (All 9 Canonical Roles)

**Date:** 2026-10-22  
**Baseline Status:** Phase 0 Product Audit  
**Authoritative Contracts:** `@ogroniedu/contracts/identity.ts` & `@ogroniedu/database/roles`  

---

## 1. System Role Architecture Overview

OgroniEdu enforces **Role-Based Access Control (RBAC)** layered with **Attribute-Based Access Control (ABAC)** resource ownership guards. Roles are assigned in the `user_roles` database table. A single account may hold multiple roles (e.g., an Admin who is also a verified Tutor), but the session dynamically selects the active portal while honoring strict permission boundaries.

---

## 2. Comprehensive Role-by-Role Lifecycle Audit

### Role 1: Student (শিক্ষার্থী)
1. **Platform Discovery**: Through social media, word-of-mouth, search engines (Google SEO), or when invited by a Guardian or Tutor.
2. **Registration & Auth**: Self-signup at `/register` selecting `student` role. Provides Full Name, Email or Bangladeshi mobile number (+8801...), password (min 8 chars with mixed case and digits). Receives 6-digit OTP code to verify contact.
3. **Post-Login State**: Automatically redirected to `/dashboard/student`. If onboarding incomplete, prompted to set academic preferences.
4. **Onboarding Requirements**: Captures education level (Primary, SSC, HSC, Admission), curriculum (National Curriculum Bangla/English Medium, Cambridge), division, and district.
5. **Profile Completion**: Profile at `/profile` allows uploading student avatar, specifying weak subjects, and updating preferred learning times.
6. **Dashboard Selection**: Direct route `/dashboard/student` renders the Student Cockpit with Next Class Countdown, live subjects, attendance stats, and Study Streak counter.
7. **Accessible Features**: Tutor Search Catalog, Student Requests Inbox, Class Schedule Calendar, Study Room (Pomodoro Timer + Formula Sheets), Assignment Submission, Billing & Invoices.
8. **Permitted Actions**: Create booking requests, cancel pending requests, attend digital classroom sessions, submit homework solutions, rate and review completed tutors, report safety concerns.
9. **Viewed / Modified Data**: Can view published tutor profiles and own academic records. Cannot view other students' submissions, tutors' private dossiers, or platform financial balances.
10. **Notifications & Reminders**: Session reminders 1 hour before class, homework assignment notifications, tutor acceptance alerts, grading feedback notices.
11. **Action Success**: Emits visual toast feedback, invalidates relevant RTK Query tags, updates UI counters instantaneously.
12. **Action Failure**: Displays inline alert with localized error message (e.g., "সময়সূচীতে সংঘাত বিদ্যমান / Schedule Overlap Detected"). Form state is preserved.
13. **Missing Info**: Prevents booking submission until subject, level, and weekly frequency are selected.
14. **Restricted States**: If account is `suspended`, login is rejected with HTTP 403 and suspension reason. If `unverified`, prompted to verify mobile number via OTP.
15. **Unfinished Tasks**: Draft booking requests remain accessible; pending assignments display countdown chips in the Study Room.
16. **Logout & Return**: Clicking logout clears client tokens, revokes the refresh session in `auth_sessions`, and redirects to `/login`.

---

### Role 2: Guardian (অভিভাবক)
1. **Platform Discovery**: Targeted parent forums, school recommendations, digital marketing, or after a tutor or student suggests platform escrow protection.
2. **Registration & Auth**: Self-signup at `/register` selecting `guardian` role. Verifies phone via OTP.
3. **Post-Login State**: Redirects to `/dashboard/guardian`. Prompts to register first child if no linked children exist.
4. **Onboarding Requirements**: Must register at least one child (Name, Class, Institution, Relationship: Father/Mother/Legal Guardian) and agree to Bangladesh Minor Consent Policy (`v1.0-bd-minor-consent`).
5. **Profile Completion**: Contact info, emergency phone number, residential district, and preferred payment method.
6. **Dashboard Selection**: `/dashboard/guardian` features the Guardian Oversight Dashboard with Escrow Balance Held, Released Fees, Child Progress Chips, and Safety Assurance banner.
7. **Accessible Features**: Child Management (`/children`), Academic Progress (`/learning`), Class Schedule (`/sessions`), Tutor Directory (`/tutors`), Escrow Checkout (`/payments`), Safety Reports (`/safety-reports`).
8. **Permitted Actions**: Add/link children, request tutors on behalf of children, authorize escrow payment, inspect attendance logs, review graded assignments, request free tutor replacement, submit safety complaints.
9. **Viewed / Modified Data**: Can view all academic and billing data for **linked children only** (enforced by ABAC guard). Cannot view children of other families.
10. **Notifications & Reminders**: Attendance alerts (if child is late/absent), session completion notices, escrow deposit receipts, tutor replacement updates.
11. **Action Success**: Clear confirmation modal, toast notification, and real-time dashboard ledger update.
12. **Action Failure**: Descriptive error banner with recovery recommendations.
13. **Missing Info**: Cannot checkout until a specific linked child is assigned to the booking.
14. **Restricted States**: Suspended guardians cannot book or communicate; pending verification accounts cannot initiate payments.
15. **Unfinished Tasks**: Child switcher allows picking up right where left off for any child.
16. **Logout & Return**: Session cleared; re-authenticating restores active child selection context.

---

### Role 3: Tutor (শিক্ষক)
1. **Platform Discovery**: University campus ambassador networks (BUET, DU, DMC, NSU), educator job portals, referral bonuses.
2. **Registration & Auth**: Self-signup at `/register` selecting `tutor` role. Enforces password strength and OTP verification.
3. **Post-Login State**: Redirects to `/dashboard/tutor`. If verification dossier is missing, presents prominent "Upload Credentials" callout.
4. **Onboarding Requirements**: Academic background (Institution, Degree, Major), tuition medium, hourly rate, and Weekly Availability Matrix slots.
5. **Profile Completion**: High-resolution avatar, detailed bio, teaching methodology, subjects taught, and verification documents.
6. **Dashboard Selection**: `/dashboard/tutor` renders Teaching Studio with pending grading counter, classroom attendance rate, dynamic earnings balance, and student inquiries.
7. **Accessible Features**: Tutor Profile Editor, Verification Dossier Hub, Booking Inbox, Schedule Studio, Teaching LMS & Grading Desk, Earnings & Payout Requests.
8. **Permitted Actions**: Accept/decline booking requests, reschedule classes (with notice), launch classroom whiteboard, mark student attendance, create homework, submit payout requests.
9. **Viewed / Modified Data**: Can view booked students' academic info. Cannot view private contact details of students before booking confirmation (safeguarding against off-platform bypass).
10. **Notifications & Reminders**: New tuition requests, 30m class reminders, student homework submission alerts, payout approval notices.
11. **Action Success**: Success banners, automated ledger credit updates, real-time status transitions.
12. **Action Failure**: Displays specific validation constraint (e.g. "Cannot reschedule within 2 hours of session").
13. **Missing Info**: Profile cannot be published in public search directory until Level 1 (NID) and Level 2 (Certificates) are approved by Admin.
14. **Restricted States**: If verification is `rejected`, tutor receives detailed feedback and can re-upload. If under `safety_hold`, teaching and payouts are frozen pending investigation.
15. **Unfinished Tasks**: Pending homework submissions remain in grading queue; incomplete dossier highlights missing documents.
16. **Logout & Return**: Clears auth tokens; logging back in restores teaching desk state.

---

### Role 4: Admin (প্রশাসক)
1. **Platform Discovery**: Assigned internally by Super Admin; internal operational staff.
2. **Registration & Auth**: Cannot self-signup; account created by Super Admin via `/dashboard/admin/users/admins`. Authenticates with email and high-entropy password.
3. **Post-Login State**: Direct redirect to `/dashboard/admin` Master Operations Console.
4. **Onboarding Requirements**: Administrative 2FA setup and role agreement.
5. **Profile Completion**: Staff name, department, official contact.
6. **Dashboard Selection**: Operational dashboard showing pending tutor verification count, active replacement cases, open safety reports, and active booking queues.
7. **Accessible Features**: Verification Queue (`/verification`), Tuition Bookings (`/bookings`), Academic Taxonomy (`/taxonomy`), Replacement Hub (`/replacements`), User Directory (`/users`), Disputes Queue (`/disputes`).
8. **Permitted Actions**: Approve/reject tutor verification documents, manage taxonomy categories, arbitrate booking disputes, assign replacement tutors, suspend malicious users.
9. **Viewed / Modified Data**: Access to all platform operational data, tutor private documents (NID, degrees), and user safety dossiers. Cannot view super-admin system keys or modify core finance settings.
10. **Notifications & Reminders**: High-priority safety report alerts, escalated disputes, incoming verification backlog alerts.
11. **Action Success**: Audit trail entry logged; action status updated in operational table.
12. **Action Failure**: Displays permission error or database constraint rejection.
13. **Missing Info**: Rejection of verification requires a mandatory text reason sent to the tutor.
14. **Restricted States**: Account revocation by Super Admin instantly invalidates all active sessions via `auth_epoch`.
15. **Unfinished Tasks**: Preserved queue filters and ticket statuses.
16. **Logout & Return**: Strict time-out after inactivity.

---

### Role 5: Super Admin (প্রধান প্রশাসক)
1. **Platform Discovery**: System owner / executive leadership.
2. **Registration & Auth**: Seeded securely during initial database bootstrap. Multi-factor authenticated.
3. **Post-Login State**: Redirects to `/dashboard/admin` with full executive controls enabled.
4. **Onboarding Requirements**: Hardware token / executive credentials.
5. **Profile Completion**: Executive root profile.
6. **Dashboard Selection**: Executive Console with real-time Gross Merchandise Value (GMV), Escrow Pool balance, system health probes, and mathematical ledger integrity status.
7. **Accessible Features**: All Admin features + Financial Ledger (`/finance`), Platform Settings Hub (`/settings`), Staff Role Management (`/users/admins`), Feature Flags (`/settings/flags`), Audited Impersonation.
8. **Permitted Actions**: Reconcile financial balance sheets, approve batch tutor payouts, update platform commission BPS, grant/revoke admin roles, execute time-limited user impersonation (max 15m).
9. **Viewed / Modified Data**: Unrestricted system-wide visibility, double-entry financial journals, audit trails, system configuration.
10. **Notifications & Reminders**: Ledger discrepancy alerts, critical child safety alerts, high-value transaction notifications.
11. **Action Success**: Instant cryptographic ledger balancing, configuration persistence, and immutable audit logging.
12. **Action Failure**: Rejects operation and flags system alert (e.g. if ledger debits != credits).
13. **Missing Info**: Strict input schema validation on commission rates and platform settings.
14. **Restricted States**: Root account cannot be suspended or impersonated by any other account.
15. **Unfinished Tasks**: Queue states and system monitoring persistent.
16. **Logout & Return**: Full session termination across all active tokens.

---

### Supporting Specialized Roles:
- **`support_agent`**: Restricted operational role focused on resolving customer dispute tickets (`/dashboard/admin/disputes`) without access to financial ledger balances or user credential editing.
- **`compliance_reviewer`**: Specialized auditor focused on inspecting uploaded tutor documents, degree certificates, and background reports (`/dashboard/admin/verification`).
- **`organization_owner`**: Coaching center or academic academy head who manages an institutional tutor roster and tracks aggregate institutional revenue (`/dashboard/organization`).
- **`organization_staff`**: Administrative coordinator for coaching academies who schedules classes and tracks attendance across multiple institutional batches (`/dashboard/organization/members`).
