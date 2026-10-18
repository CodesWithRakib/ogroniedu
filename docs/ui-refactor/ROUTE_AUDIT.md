# OgroniEdu — Comprehensive Route & Layout Audit

**Date:** 2026-10-17  
**Scope:** 64 page routes, 9 layout wrappers across all roles  
**Status:** Audit Completed — Implementation in Progress

---

## 1. Route Inventory & Status Overview

| Route Group                     | Total Routes | Primary Layout                      | Refactor Focus                                                                                                             |
| :------------------------------ | :----------: | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Public Marketing**            |      10      | `Navbar` + `Footer`                 | Remove `border-primary/40`, fix low-contrast step numbers, replace raw buttons with `Button asChild`, eliminate dark glows |
| **Authentication & Onboarding** |      6       | `AuthShell` / Minimal               | Replace sci-fi artwork with authentic education visual, clean form controls, accessible labels, remove heavy shadows       |
| **Student Dashboard**           |      7       | `StudentLayout` / `DashboardShell`  | Eliminate nested boxes in Academic Profile, harmonize HeroKpiCards, clean Quick Action buttons, refine timetable lists     |
| **Tutor Dashboard**             |      8       | `TutorLayout` / `DashboardShell`    | Harmonize KPI cards, clean verification checklist, streamline earnings ledger, remove card-in-card containers              |
| **Guardian Dashboard**          |      7       | `GuardianLayout` / `DashboardShell` | Multi-child switcher, safety alerts, clean tuition and escrow tracking cards                                               |
| **Admin & Super-Admin**         |      9       | `AdminLayout` / `DashboardShell`    | Clean table density, remove multi-color badge clashing, modernize KPI grid, audit logs and user management                 |
| **Classroom & Learning**        |      6       | Specialized / Shell                 | Modern whiteboard toolbars, formula drawer, attendance lists, clean session controls                                       |
| **Bookings & Payments**         |      7       | Shared / Role Shell                 | Checkout ledger, escrow milestone stepper, clean payment method cards without arbitrary borders                            |
| **Shared Dashboards**           |      4       | `DashboardShell`                    | Settings, profile, notifications center, safety reports                                                                    |

---

## 2. Detailed Route Inventory

### 2.1 Public Marketing Routes (`src/app/[locale]/(public)`)

| Path                     | File                             | Primary Defects Identified                                                                                                            |
| :----------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `/[locale]`              | `(public)/page.tsx`              | `border-primary/40` on cards & badges, low contrast step numbers (01, 02, 03), raw `<button>` inside `<Link>`, nested tablet borders. |
| `/[locale]/how-it-works` | `(public)/how-it-works/page.tsx` | Repeated `border-primary/40`, redundant card wrapping, low contrast subtitle typography.                                              |
| `/[locale]/tutors`       | `(public)/tutors/page.tsx`       | Filter sidebar over-bordered, tutor cards have heavy shadows and multiple competing accent badges.                                    |
| `/[locale]/tutors/[id]`  | `(public)/tutors/[id]/page.tsx`  | Heavy credential boxes, multiple nested borders in review list and booking widget.                                                    |
| `/[locale]/pricing`      | `(public)/pricing/page.tsx`      | Calculator slider container has excessive padding, benchmark cards have multiple borders.                                             |
| `/[locale]/safety`       | `(public)/safety/page.tsx`       | Over-accented trust pillars, saturated badges, inconsistent corner radii.                                                             |
| `/[locale]/faq`          | `(public)/faq/page.tsx`          | Accordion items have heavy border dividers, category chips over-accented.                                                             |
| `/[locale]/contact`      | `(public)/contact/page.tsx`      | Raw form controls, inconsistent input heights, heavy card container.                                                                  |
| `/[locale]/privacy`      | `(public)/privacy/page.tsx`      | Prose layout lacks structured visual hierarchy, table of contents borders too prominent.                                              |
| `/[locale]/terms`        | `(public)/terms/page.tsx`        | Prose layout lacks clean section division, low contrast timestamps.                                                                   |

### 2.2 Authentication & Onboarding Routes

| Path                        | File                       | Primary Defects Identified                                                                               |
| :-------------------------- | :------------------------- | :------------------------------------------------------------------------------------------------------- |
| `/[locale]/login`           | `login/page.tsx`           | Sci-fi "Nebula Exchange" space-station illustration, heavy input backgrounds, poor placeholder contrast. |
| `/[locale]/register`        | `register/page.tsx`        | Role selector cards over-bordered, password strength indicator lacks clean spacing.                      |
| `/[locale]/forgot-password` | `forgot-password/page.tsx` | Minimal layout needs consistent card radius, clear focus rings, accessible form fields.                  |
| `/[locale]/magic-link`      | `magic-link/page.tsx`      | Token state notification needs refined feedback card without dark glows.                                 |
| `/[locale]/onboarding`      | `onboarding/page.tsx`      | Stepper progress indicator over-accented, multi-step forms use raw input elements.                       |
| `/[locale]/profile`         | `profile/page.tsx`         | Academic & security forms mix raw input styles with heavy card borders.                                  |

### 2.3 Student Dashboard & Workflows (`src/app/[locale]/dashboard/student`)

| Path                                   | File                                  | Primary Defects Identified                                                                                  |
| :------------------------------------- | :------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| `/[locale]/dashboard/student`          | `dashboard/student/page.tsx`          | 1 dark teal StatCard vs 3 white cards, 5 nested boxes in Academic Profile, Quick Actions in heavy card box. |
| `/[locale]/dashboard/student/sessions` | `dashboard/student/sessions/page.tsx` | Calendar view controls cramped, session cards use arbitrary border colors.                                  |
| `/[locale]/dashboard/student/requests` | `dashboard/student/requests/page.tsx` | Request status filters have excessive borders, action buttons lack consistent hierarchy.                    |
| `/[locale]/dashboard/student/learning` | `dashboard/student/learning/page.tsx` | Study hub tabs lack clean active indicator, homework table rows difficult to scan.                          |
| `/[locale]/dashboard/student/payments` | `dashboard/student/payments/page.tsx` | Escrow ledger has too many borders, table header contrast needs improvement.                                |

### 2.4 Tutor Dashboard & Workflows (`src/app/[locale]/dashboard/tutor`)

| Path                                     | File                                    | Primary Defects Identified                                                                                    |
| :--------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `/[locale]/dashboard/tutor`              | `dashboard/tutor/page.tsx`              | HeroKpiCard dark variant clashing, Quick Actions in `border-primary/40` box, nested cards in profile summary. |
| `/[locale]/dashboard/tutor/sessions`     | `dashboard/tutor/sessions/page.tsx`     | Session scheduler drawer has heavy backdrop, slot selection buttons use inconsistent radii.                   |
| `/[locale]/dashboard/tutor/requests`     | `dashboard/tutor/requests/page.tsx`     | Incoming student requests lack clear primary/secondary action distinction.                                    |
| `/[locale]/dashboard/tutor/learning`     | `dashboard/tutor/learning/page.tsx`     | Curriculum upload cards nested, attendance tracker has low contrast table headers.                            |
| `/[locale]/dashboard/tutor/payments`     | `dashboard/tutor/payments/page.tsx`     | Payout history table cramped on mobile, status badges clash with brand colors.                                |
| `/[locale]/dashboard/tutor/verification` | `dashboard/tutor/verification/page.tsx` | Document upload zones have heavy borders and inconsistent drag-and-drop feedback.                             |

### 2.5 Guardian Dashboard & Workflows (`src/app/[locale]/dashboard/guardian`)

| Path                                                | File                                               | Primary Defects Identified                                                                      |
| :-------------------------------------------------- | :------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `/[locale]/dashboard/guardian`                      | `dashboard/guardian/page.tsx`                      | Child switcher card nested inside header, attendance graphs have excessive drop shadows.        |
| `/[locale]/dashboard/guardian/children`             | `dashboard/guardian/children/page.tsx`             | Add child dialog inputs need accessible `FormField`, avatar selection lacks consistent borders. |
| `/[locale]/dashboard/guardian/children/[studentId]` | `dashboard/guardian/children/[studentId]/page.tsx` | Individual student dossier has 4 levels of nested card hierarchy.                               |
| `/[locale]/dashboard/guardian/sessions`             | `dashboard/guardian/sessions/page.tsx`             | Session attendance confirmation buttons have weak secondary states.                             |
| `/[locale]/dashboard/guardian/requests`             | `dashboard/guardian/requests/page.tsx`             | Booking negotiation thread has nested message bubbles with low contrast text.                   |
| `/[locale]/dashboard/guardian/learning`             | `dashboard/guardian/learning/page.tsx`             | Progress report graphs lack clear axis labels and high contrast legends.                        |
| `/[locale]/dashboard/guardian/payments`             | `dashboard/guardian/payments/page.tsx`             | Escrow release approval card has multiple warning colors competing.                             |

### 2.6 Admin & Super-Admin Workflows (`src/app/[locale]/dashboard/admin`)

| Path                                     | File                                    | Primary Defects Identified                                                                                           |
| :--------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `/[locale]/dashboard/admin`              | `dashboard/admin/page.tsx`              | Multi-color gradient cards clashing (`from-brand to-primary/10 border-info/40`), system active badge over-saturated. |
| `/[locale]/dashboard/admin/users`        | `dashboard/admin/users/page.tsx`        | User management table has boxy cell borders, role chips lack visual order.                                           |
| `/[locale]/dashboard/admin/verification` | `dashboard/admin/verification/page.tsx` | Tutor credential review dossier needs structured inspection panel without nested cards.                              |
| `/[locale]/dashboard/admin/bookings`     | `dashboard/admin/bookings/page.tsx`     | Booking table needs clean search & filter toolbar, status badges aligned with semantic colors.                       |
| `/[locale]/dashboard/admin/disputes`     | `dashboard/admin/disputes/page.tsx`     | Dispute triage list has conflicting warning/destructive badges.                                                      |
| `/[locale]/dashboard/admin/analytics`    | `dashboard/admin/analytics/page.tsx`    | Charts lack clean axes, metric cards have disparate shadow treatments.                                               |
| `/[locale]/dashboard/admin/audit-logs`   | `dashboard/admin/audit-logs/page.tsx`   | JSON payload viewers lack formatted monospaced typography and clean borders.                                         |
| `/[locale]/dashboard/admin/settings`     | `dashboard/admin/settings/page.tsx`     | Platform configuration switches and inputs need unified `FormField` layout.                                          |

### 2.7 Learning, Classroom, Bookings & Payments

| Path                                                 | File                                    | Primary Defects Identified                                                       |
| :--------------------------------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------- |
| `/[locale]/(dashboard)/classroom/[id]`               | `classroom/[id]/page.tsx`               | Whiteboard toolbar controls crowded, video placeholder needs clean aspect ratio. |
| `/[locale]/(dashboard)/sessions/[id]`                | `sessions/[id]/page.tsx`                | Session details page has cards nested inside cards.                              |
| `/[locale]/(dashboard)/assignments/[id]`             | `assignments/[id]/page.tsx`             | Assignment submission card has low contrast instructions text.                   |
| `/[locale]/(dashboard)/assignments/[id]/submissions` | `assignments/[id]/submissions/page.tsx` | Grading rubric and submission list need clean tabular structure.                 |
| `/[locale]/(dashboard)/progress/[id]`                | `progress/[id]/page.tsx`                | Subject milestone cards have heavy shadows and multiple progress bars.           |
| `/[locale]/(dashboard)/safety-reports`               | `safety-reports/page.tsx`               | Incident report form needs clean validation states and accessible field layout.  |
| `/[locale]/(dashboard)/tutor-replacements`           | `tutor-replacements/page.tsx`           | Replacement guarantee stepper needs clean horizontal layout.                     |
| `/[locale]/bookings/[id]`                            | `bookings/[id]/page.tsx`                | Booking summary card has boxy cell borders.                                      |
| `/[locale]/bookings/[id]/pay`                        | `bookings/[id]/pay/page.tsx`            | Checkout payment method picker needs clean radio cards without dark gradients.   |
| `/[locale]/notifications`                            | `notifications/page.tsx`                | Notification items have excessive borders and unclear read/unread visual states. |
| `/[locale]/requests`                                 | `requests/page.tsx`                     | Request status filters need clean tabs without heavy borders.                    |

---

## Continuation Route Verification — 2026-10-18 (post-fix)

This pass re-verified a focused set of routes against the **production build** with new screenshots (`shots2/`) and a full credentialed E2E run (47/47). The remaining routes of the 64-route inventory carry the pre-fix baseline captures only and are marked accordingly.

### Re-verified off the rendered UI (desktop + mobile)

| Route                                       | Role    | Evidence                                                         | Status       |
| :------------------------------------------ | :------ | :--------------------------------------------------------------- | :----------- |
| `/[locale]` (home)                          | Public  | Screenshot review; hero blobs softened; E2E public smoke         | **VERIFIED** |
| `/[locale]/tutors`                          | Public  | Screenshot review; E2E public smoke                              | **VERIFIED** |
| `/[locale]/login`                           | Public  | Screenshot review; E2E auth journeys (all roles)                 | **VERIFIED** |
| `/[locale]/dashboard/student`               | Student | Screenshot review; E2E login → dashboard                         | **VERIFIED** |
| `/[locale]/dashboard/student/payments`      | Student | Screenshot review                                                | **VERIFIED** |
| `/[locale]/profile`                         | Student | Screenshot review; E2E profile-form + session revocation journey | **VERIFIED** |
| `/[locale]/dashboard/tutor`                 | Tutor   | Screenshot review; chart bars fixed                              | **VERIFIED** |
| `/[locale]/dashboard/tutor/earnings`        | Tutor   | Screenshot review (payout selector trios)                        | **VERIFIED** |
| `/[locale]/dashboard/admin`                 | Admin   | Screenshot review; E2E admin console journey                     | **VERIFIED** |
| `/[locale]/dashboard/admin/users`           | Admin   | Screenshot review desktop + mobile; E2E suspension journey       | **VERIFIED** |
| `/[locale]/dashboard/admin/settings`        | Admin   | Screenshot review; neutralized hub                               | **VERIFIED** |
| `/[locale]/dashboard/admin/audit-logs`      | Admin   | Screenshot review after API Date-fix (timestamps render)         | **VERIFIED** |
| `/[locale]/dashboard/admin/users/directory` | Admin   | E2E suspension/resume journey passes                             | **VERIFIED** |
| `/[locale]/dashboard/admin/verification`    | Admin   | E2E dossier approval journey passes                              | **VERIFIED** |

### Covered by automated E2E (functional journeys)

Auth (student/tutor/admin), tutor evidence upload, session revocation, verification dossier approval, user suspension/reactivation, responsive matrix, keyboard a11y (skip-link focus), public smoke (contact form, login validation).

### Not re-verified this pass (pre-fix captures only)

All remaining student/tutor/guardian/classroom/booking/payment sub-routes (e.g. `/[locale]/sessions*`, `/[locale]/bookings*`, `/[locale]/requests`, `/[locale]/safety*`, `/[locale]/tutor-replacements`, guardian child views, admin bookings/disputes/analytics/taxonomy/flags/finance, marketing pages beyond home/tutors/pricing). These inherit the systemic sweeps (palette, borders, radius, shadows) but have **not** been individually screenshot-verified post-fix — full-matrix re-capture is the next outstanding task.
