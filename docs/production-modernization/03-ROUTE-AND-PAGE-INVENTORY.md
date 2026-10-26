# OgroniEdu — Master Route and Frontend File Inventory

**Status:** AUDITED & VERIFIED  
**Date:** 2026-10-24  
**Scope:** Complete inventory of all frontend routes, layouts, pages, components, hooks, stores, and test suites in `@ogroniedu/web` (Next.js 16.4.2 App Router).  
**Core Architectural Mandate:** _"frontend amon file bad jabe na sob file ei amra kaj korbo"_ — Every single frontend file is cataloged, audited, and tracked for modernization.

---

## 1. Frontend Structure Overview

The frontend application (`apps/web`) contains **528 total application-owned files**:

- **`src/app`**: 108 files (88 compiled routes across `[locale]`, `(admin)`, `(dashboard)`, `(public)`)
- **`src/components`**: 92 reusable components (admin, analytics, auth, dashboard, feedback, guardian, notifications, payments, pwa, scheduling, shared, shell, trust, tutor, ui)
- **`src/features`**: 215 domain-specific feature views, components, and pages
- **`src/hooks`**: 4 global hooks (`use-toast`, `use-mobile`, `use-sound`, etc.)
- **`src/i18n`**: 1 locale configuration module (`routing.ts`, `request.ts`)
- **`src/layouts`**: 6 role layout shells (`RoleLayout.tsx`, `student`, `guardian`, `tutor`, `admin`)
- **`src/lib`**: 16 application utilities (`navigation.ts`, `api.ts`, `auth.ts`, `utils.ts`, etc.)
- **`src/store`**: 26 Redux Toolkit slices and RTK Query API endpoints
- **`test`**: 48 Vitest unit/integration test specifications
- **`e2e`**: 12 Playwright browser test specifications and support helpers

---

## 2. Complete Compiled Route Inventory (88 Routes)

Discovered directly from Next.js 16.4.2 Turbopack production build:

### 2.1 Public & Marketing Routes (10 Routes)

All public routes live under `apps/web/src/app/[locale]/(public)/` and default to bilingual Server Components (`bn`/`en`):

| Route Path               | File Location                                     | Page Type         | Allowed Roles | Component / View                                            | Status  |
| ------------------------ | ------------------------------------------------- | ----------------- | ------------- | ----------------------------------------------------------- | ------- |
| `/`                      | `src/app/page.tsx`                                | Server (Redirect) | Public        | Redirects to `/[locale]`                                    | Clean   |
| `/[locale]`              | `src/app/[locale]/(public)/page.tsx`              | Server Component  | Public        | `features/public/pages/home-page.tsx` (790 lines)           | AUDITED |
| `/[locale]/contact`      | `src/app/[locale]/(public)/contact/page.tsx`      | Server Component  | Public        | `features/public/pages/contact-page.tsx`                    | Clean   |
| `/[locale]/faq`          | `src/app/[locale]/(public)/faq/page.tsx`          | Server Component  | Public        | `features/public/pages/faq-page.tsx`                        | Clean   |
| `/[locale]/how-it-works` | `src/app/[locale]/(public)/how-it-works/page.tsx` | Server Component  | Public        | `features/public/pages/how-it-works-page.tsx`               | Clean   |
| `/[locale]/pricing`      | `src/app/[locale]/(public)/pricing/page.tsx`      | Server Component  | Public        | `features/public/pages/pricing-page.tsx`                    | Clean   |
| `/[locale]/privacy`      | `src/app/[locale]/(public)/privacy/page.tsx`      | Server Component  | Public        | `features/public/pages/privacy-page.tsx`                    | Clean   |
| `/[locale]/safety`       | `src/app/[locale]/(public)/safety/page.tsx`       | Server Component  | Public        | `features/public/pages/safety-page.tsx`                     | Clean   |
| `/[locale]/terms`        | `src/app/[locale]/(public)/terms/page.tsx`        | Server Component  | Public        | `features/public/pages/terms-page.tsx`                      | Clean   |
| `/[locale]/tutors`       | `src/app/[locale]/(public)/tutors/page.tsx`       | Server Component  | Public        | `features/tutor-discovery/pages/tutors-page.tsx`            | AUDITED |
| `/[locale]/tutors/[id]`  | `src/app/[locale]/(public)/tutors/[id]/page.tsx`  | Server Component  | Public        | `features/tutors/pages/tutor-details-page.tsx` (1076 lines) | AUDITED |
| `/_not-found`            | `src/app/not-found.tsx`                           | Server Component  | Public        | Shared 404 handler                                          | Clean   |
| `/robots.txt`            | `src/app/robots.ts`                               | Static Route      | Public        | Search engine indexing rules                                | Clean   |
| `/sitemap.xml`           | `src/app/sitemap.ts`                              | Static Route      | Public        | XML sitemap generator                                       | Clean   |

---

### 2.2 Authentication & Onboarding Routes (8 Routes)

| Route Path                  | File Location                               | Page Type           | Allowed Roles       | Responsibilities                                     | Status  |
| --------------------------- | ------------------------------------------- | ------------------- | ------------------- | ---------------------------------------------------- | ------- |
| `/[locale]/login`           | `src/app/[locale]/login/page.tsx`           | Client View wrapper | Anonymous           | Email/phone + password login, remember-me            | Clean   |
| `/[locale]/register`        | `src/app/[locale]/register/page.tsx`        | Client View wrapper | Anonymous           | Self-registration (student, guardian, tutor)         | Clean   |
| `/[locale]/forgot-password` | `src/app/[locale]/forgot-password/page.tsx` | Client View wrapper | Anonymous           | OTP request and password reset form                  | Clean   |
| `/[locale]/magic-link`      | `src/app/[locale]/magic-link/page.tsx`      | Client View wrapper | Anonymous           | Passwordless email magic-link token consumption      | Clean   |
| `/[locale]/onboarding`      | `src/app/[locale]/onboarding/page.tsx`      | Client View wrapper | Authenticated (New) | Step-based onboarding flow per role                  | AUDITED |
| `/[locale]/profile`         | `src/app/[locale]/profile/page.tsx`         | Client View wrapper | Authenticated       | User account settings, phone/email, password         | AUDITED |
| `/[locale]/notifications`   | `src/app/[locale]/notifications/page.tsx`   | Client View wrapper | Authenticated       | Real-time notification list, preferences, read state | AUDITED |
| `/[locale]/requests`        | `src/app/[locale]/requests/page.tsx`        | Client View wrapper | Authenticated       | Direct redirect to role requests portal              | Clean   |

---

### 2.3 Student Dashboard Routes (7 Routes)

| Route Path                             | File Location                                          | Allowed Roles | Feature View Component                                     | Status  |
| -------------------------------------- | ------------------------------------------------------ | ------------- | ---------------------------------------------------------- | ------- |
| `/[locale]/dashboard/student`          | `src/app/[locale]/dashboard/student/page.tsx`          | `student`     | `features/student/pages/student-dashboard-page.tsx`        | AUDITED |
| `/[locale]/dashboard/student/learning` | `src/app/[locale]/dashboard/student/learning/page.tsx` | `student`     | `features/learning/pages/learning-page.tsx`                | AUDITED |
| `/[locale]/dashboard/student/messages` | `src/app/[locale]/dashboard/student/messages/page.tsx` | `student`     | `features/messaging/components/ConversationsInboxView.tsx` | AUDITED |
| `/[locale]/dashboard/student/payments` | `src/app/[locale]/dashboard/student/payments/page.tsx` | `student`     | `features/payments/pages/payments-page.tsx`                | AUDITED |
| `/[locale]/dashboard/student/requests` | `src/app/[locale]/dashboard/student/requests/page.tsx` | `student`     | `features/bookings/pages/requests-page.tsx`                | AUDITED |
| `/[locale]/dashboard/student/sessions` | `src/app/[locale]/dashboard/student/sessions/page.tsx` | `student`     | `features/bookings/pages/sessions-page.tsx`                | AUDITED |
| `/[locale]/dashboard`                  | `src/app/[locale]/dashboard/page.tsx`                  | Authenticated | Role router redirecting to `/dashboard/<role>`             | Clean   |

---

### 2.4 Guardian Dashboard Routes (8 Routes)

| Route Path                                          | File Location                                                       | Lines   | Allowed Roles | Feature View Component                                                                        | Status             |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------- | ------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| `/[locale]/dashboard/guardian`                      | `src/app/[locale]/dashboard/guardian/page.tsx`                      | 15      | `guardian`    | `features/guardian/pages/guardian-dashboard-page.tsx`                                         | AUDITED            |
| `/[locale]/dashboard/guardian/children`             | `src/app/[locale]/dashboard/guardian/children/page.tsx`             | 134     | `guardian`    | `components/guardian/GuardianChildrenManager.tsx` (953 lines)                                 | AUDITED            |
| `/[locale]/dashboard/guardian/children/[studentId]` | `src/app/[locale]/dashboard/guardian/children/[studentId]/page.tsx` | **728** | `guardian`    | **NEEDS DECOMPOSITION**: Oversized page with child detail, safety holds, replacement triggers | **OVERSIZED (P1)** |
| `/[locale]/dashboard/guardian/learning`             | `src/app/[locale]/dashboard/guardian/learning/page.tsx`             | 11      | `guardian`    | `features/learning/pages/learning-page.tsx`                                                   | AUDITED            |
| `/[locale]/dashboard/guardian/messages`             | `src/app/[locale]/dashboard/guardian/messages/page.tsx`             | 11      | `guardian`    | `features/messaging/components/ConversationsInboxView.tsx`                                    | AUDITED            |
| `/[locale]/dashboard/guardian/payments`             | `src/app/[locale]/dashboard/guardian/payments/page.tsx`             | 11      | `guardian`    | `features/payments/pages/payments-page.tsx`                                                   | AUDITED            |
| `/[locale]/dashboard/guardian/requests`             | `src/app/[locale]/dashboard/guardian/requests/page.tsx`             | 11      | `guardian`    | `features/bookings/pages/requests-page.tsx`                                                   | AUDITED            |
| `/[locale]/dashboard/guardian/sessions`             | `src/app/[locale]/dashboard/guardian/sessions/page.tsx`             | 11      | `guardian`    | `features/bookings/pages/sessions-page.tsx`                                                   | AUDITED            |

---

### 2.5 Tutor Dashboard Routes (9 Routes)

| Route Path                               | File Location                                            | Lines | Allowed Roles | Feature View Component                                     | Status  |
| ---------------------------------------- | -------------------------------------------------------- | ----- | ------------- | ---------------------------------------------------------- | ------- |
| `/[locale]/dashboard/tutor`              | `src/app/[locale]/dashboard/tutor/page.tsx`              | 11    | `tutor`       | `features/tutors/pages/tutor-dashboard-page.tsx`           | AUDITED |
| `/[locale]/dashboard/tutor/profile`      | `src/app/[locale]/dashboard/tutor/profile/page.tsx`      | 15    | `tutor`       | `features/tutors/pages/tutor-profile-settings-page.tsx`    | AUDITED |
| `/[locale]/dashboard/tutor/verification` | `src/app/[locale]/dashboard/tutor/verification/page.tsx` | 15    | `tutor`       | `features/tutors/pages/tutor-verification-page.tsx`        | AUDITED |
| `/[locale]/dashboard/tutor/learning`     | `src/app/[locale]/dashboard/tutor/learning/page.tsx`     | 11    | `tutor`       | `features/learning/pages/learning-page.tsx`                | AUDITED |
| `/[locale]/dashboard/tutor/lesson-plans` | `src/app/[locale]/dashboard/tutor/lesson-plans/page.tsx` | 11    | `tutor`       | `features/learning/pages/lesson-planner-page.tsx`          | AUDITED |
| `/[locale]/dashboard/tutor/messages`     | `src/app/[locale]/dashboard/tutor/messages/page.tsx`     | 11    | `tutor`       | `features/messaging/components/ConversationsInboxView.tsx` | AUDITED |
| `/[locale]/dashboard/tutor/payments`     | `src/app/[locale]/dashboard/tutor/payments/page.tsx`     | 11    | `tutor`       | `features/tutors/pages/tutor-earnings-page.tsx`            | AUDITED |
| `/[locale]/dashboard/tutor/requests`     | `src/app/[locale]/dashboard/tutor/requests/page.tsx`     | 11    | `tutor`       | `features/bookings/pages/requests-page.tsx`                | AUDITED |
| `/[locale]/dashboard/tutor/sessions`     | `src/app/[locale]/dashboard/tutor/sessions/page.tsx`     | 11    | `tutor`       | `features/bookings/pages/sessions-page.tsx`                | AUDITED |

---

### 2.6 Admin & Governance Dashboard Routes (21 Routes)

| Route Path                                         | File Location                                                      | Lines   | Allowed Roles                           | Feature View Component                                                   | Status             |
| -------------------------------------------------- | ------------------------------------------------------------------ | ------- | --------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| `/[locale]/admin`                                  | `src/app/[locale]/(admin)/admin/page.tsx`                          | 47      | `admin`, `super_admin`                  | Redirects to `/dashboard/admin`                                          | Clean              |
| `/[locale]/dashboard/admin`                        | `src/app/[locale]/dashboard/admin/page.tsx`                        | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-overview-page.tsx`                           | AUDITED            |
| `/[locale]/dashboard/admin/analytics`              | `src/app/[locale]/dashboard/admin/analytics/page.tsx`              | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-analytics-page.tsx`                          | AUDITED            |
| `/[locale]/dashboard/admin/audit-logs`             | `src/app/[locale]/dashboard/admin/audit-logs/page.tsx`             | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-audit-logs-page.tsx`                         | AUDITED            |
| `/[locale]/dashboard/admin/bookings`               | `src/app/[locale]/dashboard/admin/bookings/page.tsx`               | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-bookings-page.tsx`                           | AUDITED            |
| `/[locale]/dashboard/admin/disputes`               | `src/app/[locale]/dashboard/admin/disputes/page.tsx`               | 11      | `admin`, `super_admin`, `support_agent` | `features/admin/components/tabs/adminDisputesTab.tsx`                    | AUDITED            |
| `/[locale]/dashboard/admin/finance`                | `src/app/[locale]/dashboard/admin/finance/page.tsx`                | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-finance-page.tsx` (964 lines)                | AUDITED            |
| `/[locale]/dashboard/admin/learning`               | `src/app/[locale]/dashboard/admin/learning/page.tsx`               | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-learning-page.tsx`                           | AUDITED            |
| `/[locale]/dashboard/admin/messages`               | `src/app/[locale]/dashboard/admin/messages/page.tsx`               | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-messages-page.tsx`                           | AUDITED            |
| `/[locale]/dashboard/admin/organizations`          | `src/app/[locale]/dashboard/admin/organizations/page.tsx`          | **341** | `admin`, `super_admin`                  | **NEEDS DECOMPOSITION**: Embedded organization management table          | **OVERSIZED (P2)** |
| `/[locale]/dashboard/admin/replacements`           | `src/app/[locale]/dashboard/admin/replacements/page.tsx`           | 192     | `admin`, `super_admin`                  | `features/admin/components/tabs/adminReplacementsTab.tsx`                | AUDITED            |
| `/[locale]/dashboard/admin/replacements/[id]`      | `src/app/[locale]/dashboard/admin/replacements/[id]/page.tsx`      | **435** | `admin`, `super_admin`                  | **NEEDS DECOMPOSITION**: Embedded candidate scoring and resolution modal | **OVERSIZED (P2)** |
| `/[locale]/dashboard/admin/settings`               | `src/app/[locale]/dashboard/admin/settings/page.tsx`               | 11      | `super_admin`                           | Settings overview router                                                 | AUDITED            |
| `/[locale]/dashboard/admin/settings/finance`       | `src/app/[locale]/dashboard/admin/settings/finance/page.tsx`       | 15      | `super_admin`                           | `features/admin/pages/settings/admin-settings-finance-page.tsx`          | AUDITED            |
| `/[locale]/dashboard/admin/settings/flags`         | `src/app/[locale]/dashboard/admin/settings/flags/page.tsx`         | 15      | `super_admin`                           | `features/admin/pages/settings/admin-settings-flags-page.tsx`            | AUDITED            |
| `/[locale]/dashboard/admin/settings/general`       | `src/app/[locale]/dashboard/admin/settings/general/page.tsx`       | 15      | `super_admin`                           | `features/admin/pages/settings/admin-settings-general-page.tsx`          | AUDITED            |
| `/[locale]/dashboard/admin/settings/notifications` | `src/app/[locale]/dashboard/admin/settings/notifications/page.tsx` | 15      | `super_admin`                           | `features/admin/pages/settings/admin-settings-notifications-page.tsx`    | AUDITED            |
| `/[locale]/dashboard/admin/settings/security`      | `src/app/[locale]/dashboard/admin/settings/security/page.tsx`      | 15      | `super_admin`                           | `features/admin/pages/settings/admin-settings-security-page.tsx`         | AUDITED            |
| `/[locale]/dashboard/admin/taxonomy`               | `src/app/[locale]/dashboard/admin/taxonomy/page.tsx`               | 11      | `admin`, `super_admin`                  | `features/admin/pages/admin-taxonomy-page.tsx` (819 lines)               | AUDITED            |
| `/[locale]/dashboard/admin/users`                  | `src/app/[locale]/dashboard/admin/users/page.tsx`                  | 11      | `admin`, `super_admin`                  | `features/admin/pages/users/admin-users-directory-page.tsx`              | AUDITED            |
| `/[locale]/dashboard/admin/users/admins`           | `src/app/[locale]/dashboard/admin/users/admins/page.tsx`           | 11      | `super_admin`                           | `features/admin/pages/users/admin-users-admins-page.tsx`                 | AUDITED            |
| `/[locale]/dashboard/admin/users/directory`        | `src/app/[locale]/dashboard/admin/users/directory/page.tsx`        | 15      | `admin`, `super_admin`                  | `features/admin/pages/users/admin-users-directory-page.tsx`              | AUDITED            |
| `/[locale]/dashboard/admin/users/students`         | `src/app/[locale]/dashboard/admin/users/students/page.tsx`         | 15      | `admin`, `super_admin`                  | `features/admin/pages/users/admin-users-students-page.tsx`               | AUDITED            |
| `/[locale]/dashboard/admin/users/tutors`           | `src/app/[locale]/dashboard/admin/users/tutors/page.tsx`           | 11      | `admin`, `super_admin`                  | `features/admin/pages/users/admin-users-tutors-page.tsx`                 | AUDITED            |
| `/[locale]/dashboard/admin/verification`           | `src/app/[locale]/dashboard/admin/verification/page.tsx`           | 15      | `admin`, `compliance_reviewer`          | `features/admin/components/tabs/adminVerificationTab.tsx` (859 lines)    | AUDITED            |

---

### 2.7 Organization Dashboard Routes (3 Routes)

| Route Path                                  | File Location                                               | Lines   | Allowed Roles                              | Feature View Component                                                  | Status             |
| ------------------------------------------- | ----------------------------------------------------------- | ------- | ------------------------------------------ | ----------------------------------------------------------------------- | ------------------ |
| `/[locale]/dashboard/organization`          | `src/app/[locale]/dashboard/organization/page.tsx`          | **383** | `organization_owner`, `organization_staff` | **NEEDS DECOMPOSITION**: Embedded institution roster, branch management | **OVERSIZED (P2)** |
| `/[locale]/dashboard/organization/members`  | `src/app/[locale]/dashboard/organization/members/page.tsx`  | **307** | `organization_owner`                       | **NEEDS DECOMPOSITION**: Embedded member invitation & role assignment   | **OVERSIZED (P2)** |
| `/[locale]/dashboard/organization/messages` | `src/app/[locale]/dashboard/organization/messages/page.tsx` | 27      | `organization_owner`, `organization_staff` | `features/messaging/components/ConversationsInboxView.tsx`              | AUDITED            |

---

### 2.8 Shared Workflow Routes (18 Routes)

| Route Path                               | File Location                                                        | Lines   | Allowed Roles                   | Feature View Component                                                             | Status             |
| ---------------------------------------- | -------------------------------------------------------------------- | ------- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------------ |
| `/[locale]/bookings/[id]`                | `src/app/[locale]/bookings/[id]/page.tsx`                            | **829** | Student, Guardian, Tutor, Admin | **CRITICAL OVERSIZED**: Monolithic booking view, messaging, status changes         | **OVERSIZED (P1)** |
| `/[locale]/bookings/[id]/pay`            | `src/app/[locale]/bookings/[id]/pay/page.tsx`                        | **575** | Student, Guardian               | **CRITICAL OVERSIZED**: Monolithic payment checkout, escrow terms, gateway trigger | **OVERSIZED (P1)** |
| `/[locale]/dashboard/bookings/[id]`      | `src/app/[locale]/dashboard/bookings/[id]/page.tsx`                  | 5       | All roles                       | Thin redirect to `/bookings/[id]`                                                  | Clean              |
| `/[locale]/dashboard/bookings/[id]/pay`  | `src/app/[locale]/dashboard/bookings/[id]/pay/page.tsx`              | 5       | Student, Guardian               | Thin redirect to `/bookings/[id]/pay`                                              | Clean              |
| `/[locale]/tutor/bookings/[id]`          | `src/app/[locale]/tutor/bookings/[id]/page.tsx`                      | 37      | Tutor                           | Thin wrapper for tutor booking detail                                              | Clean              |
| `/[locale]/sessions`                     | `src/app/[locale]/(dashboard)/sessions/page.tsx`                     | 18      | All tutoring participants       | `features/bookings/pages/sessions-page.tsx`                                        | AUDITED            |
| `/[locale]/sessions/[id]`                | `src/app/[locale]/(dashboard)/sessions/[id]/page.tsx`                | **634** | All tutoring participants       | **CRITICAL OVERSIZED**: Live session view, reschedule, meeting launcher            | **OVERSIZED (P1)** |
| `/[locale]/classroom/[id]`               | `src/app/[locale]/(dashboard)/classroom/[id]/page.tsx`               | 79      | Student, Tutor                  | `features/classroom/components/ClassroomWorkspace.tsx` (771 lines)                 | AUDITED            |
| `/[locale]/assignments/[id]`             | `src/app/[locale]/(dashboard)/assignments/[id]/page.tsx`             | **577** | Student, Tutor                  | **CRITICAL OVERSIZED**: Monolithic assignment detail, submission uploader, rubric  | **OVERSIZED (P1)** |
| `/[locale]/assignments/[id]/submissions` | `src/app/[locale]/(dashboard)/assignments/[id]/submissions/page.tsx` | **382** | Tutor                           | **NEEDS DECOMPOSITION**: Embedded grading matrix, file downloads                   | **OVERSIZED (P2)** |
| `/[locale]/learning`                     | `src/app/[locale]/(dashboard)/learning/page.tsx`                     | 19      | Student, Guardian, Tutor        | `features/learning/pages/learning-page.tsx`                                        | AUDITED            |
| `/[locale]/progress/[id]`                | `src/app/[locale]/(dashboard)/progress/[id]/page.tsx`                | 223     | Student, Guardian, Tutor        | `features/learning/components/studentProgressPanel.tsx`                            | AUDITED            |
| `/[locale]/messages`                     | `src/app/[locale]/(dashboard)/messages/page.tsx`                     | 41      | Authenticated                   | `features/messaging/components/ConversationsInboxView.tsx`                         | AUDITED            |
| `/[locale]/payments`                     | `src/app/[locale]/(dashboard)/payments/page.tsx`                     | 18      | Authenticated                   | `features/payments/pages/payments-page.tsx`                                        | AUDITED            |
| `/[locale]/payments/[id]`                | `src/app/[locale]/(dashboard)/payments/[id]/page.tsx`                | 44      | Authenticated                   | Invoice / receipt view                                                             | AUDITED            |
| `/[locale]/saved-tutors`                 | `src/app/[locale]/(dashboard)/saved-tutors/page.tsx`                 | 207     | Student, Guardian               | Saved tutor list view                                                              | AUDITED            |
| `/[locale]/safety-reports`               | `src/app/[locale]/(dashboard)/safety-reports/page.tsx`               | 270     | Authenticated                   | Safety report submission & case list                                               | AUDITED            |
| `/[locale]/tutor-replacements`           | `src/app/[locale]/(dashboard)/tutor-replacements/page.tsx`           | **303** | Student, Guardian, Admin        | **NEEDS DECOMPOSITION**: Replacement claim tracker                                 | **OVERSIZED (P2)** |
| `/[locale]/tutor-replacements/new`       | `src/app/[locale]/(dashboard)/tutor-replacements/new/page.tsx`       | 280     | Student, Guardian               | Tutor replacement guarantee submission wizard                                      | AUDITED            |
| `/[locale]/tutor-replacements/[id]`      | `src/app/[locale]/(dashboard)/tutor-replacements/[id]/page.tsx`      | 209     | Student, Guardian, Admin        | Tutor replacement case detail and candidate picker                                 | AUDITED            |

---

## 3. The 11 Oversized Route Pages Requiring Modularization

In accordance with Part V Rule 14 (_"Route Pages Must Remain Thin"_), these 11 pages violate architectural boundaries and will be decomposed:

| #   | Route                                                         | Current Lines | Target Feature Component Directory                    | Scope of Decomposition                                                                                          | Priority |
| --- | ------------------------------------------------------------- | ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `/[locale]/bookings/[id]/page.tsx`                            | 829           | `src/features/bookings/components/detail/`            | Extract `BookingHeader`, `BookingTimeline`, `BookingParticipants`, `BookingActionPanel`, `BookingDisputeDrawer` | **P1**   |
| 2   | `/[locale]/dashboard/guardian/children/[studentId]/page.tsx`  | 728           | `src/features/guardian/components/child-detail/`      | Extract `ChildAcademicSummary`, `ChildActiveSessions`, `ChildSafetyControls`, `ChildReplacementTrigger`         | **P1**   |
| 3   | `/[locale]/(dashboard)/sessions/[id]/page.tsx`                | 634           | `src/features/bookings/components/session-detail/`    | Extract `SessionLiveHeader`, `SessionRescheduleModal`, `SessionAttendanceBadge`, `MeetingLauncher`              | **P1**   |
| 4   | `/[locale]/(dashboard)/assignments/[id]/page.tsx`             | 577           | `src/features/learning/components/assignment-detail/` | Extract `AssignmentDescription`, `AssignmentAttachmentList`, `StudentSubmissionForm`, `GradingSummary`          | **P1**   |
| 5   | `/[locale]/bookings/[id]/pay/page.tsx`                        | 575           | `src/features/payments/components/checkout/`          | Extract `EscrowTermsCard`, `PaymentMethodSelector`, `FeeBreakdownCard`, `SslcommerzLauncher`                    | **P1**   |
| 6   | `/[locale]/dashboard/admin/replacements/[id]/page.tsx`        | 435           | `src/features/admin/components/replacements/`         | Extract `ReplacementDossierCard`, `CandidateMatchingGrid`, `ArbitrationActionPanel`                             | **P2**   |
| 7   | `/[locale]/dashboard/organization/page.tsx`                   | 383           | `src/features/organization/components/overview/`      | Extract `OrganizationBranchGrid`, `TutorRosterTable`, `BillingSummaryCard`                                      | **P2**   |
| 8   | `/[locale]/(dashboard)/assignments/[id]/submissions/page.tsx` | 382           | `src/features/learning/components/submissions/`       | Extract `SubmissionsDataTable`, `RubricGradingDrawer`, `BulkFeedbackModal`                                      | **P2**   |
| 9   | `/[locale]/dashboard/admin/organizations/page.tsx`            | 341           | `src/features/admin/components/organizations/`        | Extract `OrganizationApprovalQueue`, `InstitutionAuditModal`                                                    | **P2**   |
| 10  | `/[locale]/dashboard/organization/members/page.tsx`           | 307           | `src/features/organization/components/members/`       | Extract `MemberInviteForm`, `StaffPermissionsTable`                                                             | **P2**   |
| 11  | `/[locale]/(dashboard)/tutor-replacements/page.tsx`           | 303           | `src/features/trust/components/replacements/`         | Extract `ReplacementStatusBadge`, `ReplacementHistoryTable`                                                     | **P2**   |

---

## 4. Shared Components & Features Inventory (307 Files)

### 4.1 Component Catalog (`src/components/`, 92 files)

- **`admin/`** (12 files): `AdminDashboardView.tsx`, `AdminUsersTab.tsx`, `AdminAuditLogTab.tsx`, `AdminBookingsTab.tsx`, `AdminTutorsTab.tsx`, etc.
- **`analytics/`** (6 files): `AnalyticsKPICard.tsx`, `RetentionCohortChart.tsx`, `RevenueGrowthChart.tsx`, etc.
- **`auth/`** (8 files): `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `MagicLinkForm.tsx`, `authShell.tsx`, etc.
- **`dashboard/`** (8 files): `RoleDashboardShell.tsx`, `DashboardSidebar.tsx`, `DashboardHeader.tsx`, `QuickStatsCard.tsx`, etc.
- **`guardian/`** (6 files): `GuardianChildrenManager.tsx`, `ChildProfileCard.tsx`, `GuardianConsentModal.tsx`, etc.
- **`notifications/`** (10 files): `NotificationCenter.tsx`, `NotificationBell.tsx`, `BookingChatView.tsx`, `NotificationPreferencesView.tsx`, etc.
- **`payments/`** (8 files): `PaymentMethodCard.tsx`, `EscrowStatusBadge.tsx`, `PayoutRequestModal.tsx`, `InvoiceDownloadButton.tsx`, etc.
- **`scheduling/`** (6 files): `SessionScheduleCalendar.tsx`, `RescheduleModal.tsx`, `TimeSlotPicker.tsx`, etc.
- **`trust/`** (6 files): `ReviewStars.tsx`, `TutorBadge.tsx`, `DisputeCaseModal.tsx`, etc.
- **`tutor/`** (8 files): `TutorVerificationStatusCard.tsx`, `TutorRateBadge.tsx`, `AvailabilityGrid.tsx`, etc.
- **`ui/`** (14 files): shadcn/ui primitives (`button.tsx`, `card.tsx`, `dialog.tsx`, `table.tsx`, `badge.tsx`, `select.tsx`, etc.)

### 4.2 Feature Modules (`src/features/`, 215 files)

- **`admin/`** (38 files): Pages, components, and tabs for users, verification, finance, dispute arbitration, taxonomy, and feature flags.
- **`analytics/`** (12 files): Charts, exports, metrics tables, and KPI cards.
- **`auth/`** (16 files): Authentication flows, OTP handlers, magic link consumption, session storage wrappers.
- **`bookings/`** (24 files): Booking requests, scheduling, calendar synchronization, series bookings, cancellation flows.
- **`classroom/`** (14 files): `ClassroomWorkspace.tsx`, `InteractiveWhiteboard.tsx`, `ClassroomFormulasDrawer.tsx`, Google Meet bridge.
- **`dashboard/`** (18 files): Overview cards, greeting banners, role navigation tiles, activity feeds.
- **`guardian/`** (16 files): Multi-child oversight, safety alert notifications, consent verification, replacement requests.
- **`learning/`** (28 files): Lesson planner, assignments, grading drawer, progress tracking, learning materials.
- **`messaging/`** (14 files): `ConversationsInboxView.tsx`, `use-booking-chat.ts`, cursor pagination parser, attachment upload.
- **`notifications/`** (10 files): In-app alerts, socket subscriptions, sound effects, preference toggles.
- **`onboarding/`** (12 files): Step progression, profile setup, subject selection, document upload.
- **`payments/`** (18 files): Payment ledger views, SSLCommerz/bKash/Nagad checkout, receipts, refunds, payouts.
- **`profile/`** (14 files): `profile-page.tsx`, credentials manager, security epoch resets, avatar uploader.
- **`public/`** (16 files): `home-page.tsx`, `HeroSearchBar.tsx`, contact, terms, privacy, FAQ, pricing.
- **`student/`** (14 files): Academic dashboard, upcoming sessions, pending assignments, tutor recommendations.
- **`trust/`** (16 files): Reviews, disputes, safety report submission, tutor replacement guarantee wizard.
- **`tutor-discovery/`** (16 files): Search catalog, filters form, tutor card, booking request modal, map locator.
- **`tutors/`** (22 files): `tutor-details-page.tsx`, profile editor, verification dossier uploader, earnings dashboard.

---

## 5. Frontend Test Inventory (48 Test Files, 308 Tests)

Located in `apps/web/test/`:

- **Passing (47 files, 307 tests)**:
  `role-dashboards.spec.ts`, `guardian-children.spec.ts`, `phase11-e2e-journeys.spec.ts`, `verification-dossier-ui.spec.ts`, `dashboard-layout.spec.ts`, `production-readiness.spec.ts`, `public-website-and-seo.spec.ts`, `tutoring-lifecycle-phase07.spec.ts`, `financial-escrow-phase10.spec.ts`, `learning-phase06.spec.ts`, `communication-notifications-phase09.spec.ts`, `student-experience-phase04.spec.ts`, `progress-tracking.spec.ts`, `frontend-ux-accessibility-phase11.spec.ts`, `tutor-experience-phase06.spec.ts`, `guardian-experience-phase05.spec.ts`, `e2e-browser-uat-phase13.spec.ts`, `notification-bell.spec.ts`, `components.spec.ts`, `tutor-discovery-results.spec.ts`, `api-contract.spec.ts`, `auth-session-storage.spec.ts`, `store.spec.ts`, `feedback-modal.spec.ts`, `admin-operations.spec.ts`, `auth-forms.spec.ts`, `contract-roundtrip.spec.ts`, `auth-flow.spec.ts`, `classroom.spec.ts`, `safety-phase07.spec.ts`, `scheduling.spec.ts`, `tutor-discovery.spec.ts`, `tutor-localization.spec.ts`, `trust-and-reviews.spec.ts`, `i18n.spec.ts`, `payments.spec.ts`, `route-policy.spec.ts`, `breadcrumbs-and-navigation.spec.ts`, `analytics-data.spec.ts`, `learning.spec.ts`, `accessibility-and-a11y.spec.ts`, `session-mappers.spec.ts`, `tutor-verification.spec.ts`, `analytics.spec.ts`, `communication.spec.ts`, `support.spec.ts`.
- **Failing (1 test in 1 file)**:
  `test/messaging.spec.ts:33:33` — assertion expected `'You'` to be `'Me'`. Root cause identified in `src/features/messaging/utils/chat-mappers.ts:19` where default is `'You'`.

---

## 6. Server and Client Component Governance

1. **Pages are Server Components by Default**: Initial access checks, metadata generation (`generateMetadata`), and SSR hydration.
2. **"use client" Confined to Leaves**: Only interactive forms (`RegisterForm`, `TutorFiltersForm`, `BookingChatView`, `InteractiveWhiteboard`) carry the `"use client"` directive.
3. **No Non-Serializable Server Props**: Client components receive only JSON-serializable primitives and DTOs.
4. **No Secrets in Frontend Bundles**: Environment variables prefixed with `NEXT_PUBLIC_` are audited; zero API secrets or database credentials exist in frontend code.
