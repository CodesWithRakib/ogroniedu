# OgroniEdu — End-to-End User Journeys Specification

**Document Reference:** `docs/USER_JOURNEYS.md`  
**Last Updated:** 2026-10-24  
**Status:** Updated per RLD-004 — phantom routes replaced with actual canonical routes.  
**Visual Companion:** Diagrams located in `docs/diagrams/` (student-journey.mmd, guardian-journey.mmd, tutor-journey.mmd, admin-journey.mmd, super-admin-journey.mmd, booking-lifecycle.mmd, payment-flow.mmd, safeguarding-workflow.mmd)

> **NOTE:** This document was updated on 2026-10-24 to align with the Post-Implementation Audit (POST_IMPLEMENTATION_AUDIT.md, D‑4). All previously phantom routes have been corrected to their actual canonical route equivalents.

---

## 1. Executive Summary

OgroniEdu is designed to provide seamless, secure, and transparent educational interactions for the Bangladeshi tuition ecosystem. The platform enforces strict role boundaries while ensuring seamless collaboration between students, guardians, tutors, and administrative personnel.

```
       +-----------------------------------------------------------+
       |                        OgroniEdu                          |
       |  +-----------+  +------------+  +---------+  +---------+  |
       |  |  Student  |  |  Guardian  |  |  Tutor  |  |  Admin  |  |
       |  +-----+-----+  +-----+------+  +----+----+  +----+----+  |
       +--------|--------------|--------------|------------|-------+
                |              |              |            |
                v              v              v            v
      Learn & Submit    Pay & Supervise   Teach & Earn   Audit & Triage
```

---

## 2. Journey 1: The Student Journey

_Visual Reference:_ `docs/diagrams/student-journey.mmd`

### 2.1 Persona & Context

- **Persona:** Tanvir, a Class 10 SSC candidate seeking a higher mathematics tutor.
- **Entry Point:** Public discovery (`/tutors`) or guardian invitation link.
- **Goals:** Find a verified tutor, attend interactive sessions in the digital classroom, complete assignments, and track grades.

### 2.2 Journey Stages & Experience Flow

#### Stage 1: Discovery & Evaluation

1. **Directory Search (`/tutors`):** Tanvir filters tutors by Subject ("Higher Mathematics"), Curriculum ("National Curriculum - English Version"), District ("Dhaka / Dhanmondi"), and Budget ("BDT 800 - 1500 / hr").
2. **Profile Inspection (`/tutors/[id]`):** Reads verified credentials badge, university background (e.g. BUET / DU), student reviews, and introduction video.
3. **Session Booking Proposal:** Selects preferred weekly schedule (e.g., Sun/Tue/Thu 5:00 PM). If Tanvir is under 18, the system flags the booking for Guardian Consent before proceeding to payment.

#### Stage 2: Onboarding & Guardian Linking

1. **Onboarding (`/onboarding`):** Tanvir completes single-step account onboarding.
2. **Guardian Linking (`/dashboard/guardian/children`):** Guardian initiates linking via 8-character pairing code or enters Tanvir's registered phone number. Tanvir accepts the pairing from his account, enabling minor protection mode.

#### Stage 3: Interactive Classroom

1. **Classroom Entry (`/classroom/[id]`):** 10 minutes prior to session start, Tanvir enters the live classroom via Google Meet integration link.
2. **Teaching Canvas:** Uses the personal teaching canvas with mathematical drawing tools (not real-time collaborative — see RLD-003).
   - Canvas snapshots are saved to session records.

#### Stage 4: Homework Submission & Feedback

1. **Assignment Portal (`/dashboard/student/learning`):** Downloads problem sets uploaded by the tutor; views assignment list.
2. **Submission:** Uploads completed homework photos/PDFs before the due date.
3. **Grading & Review:** Receives push notification when the tutor publishes grades and constructive feedback.
4. **Post-Session Review:** Rates the tutor (1-5 stars) and submits private feedback via `/api/v1/feedback` (modal, not a standalone page).

---

## 3. Journey 2: The Guardian Supervisory Journey

_Visual Reference:_ `docs/diagrams/guardian-journey.mmd`

### 3.1 Persona & Context

- **Persona:** Rafiq, parent of Tanvir (Class 10).
- **Entry Point:** Direct registration (`/register`) or SMS invitation code.
- **Goals:** Ensure child safety, approve tutoring expenses, pay securely via mobile financial services (bKash/Nagad), monitor academic attendance and grades, and utilize replacement guarantees if needed.

### 3.2 Journey Stages & Experience Flow

#### Stage 1: Child Account Pairing

1. **Initiate Pairing (`/dashboard/guardian/children`):** Rafiq navigates to "My Children" and generates an 8-character pairing alphanumeric token or enters Tanvir's registered phone number.
2. **Verification:** System validates Tanvir's acceptance. Rafiq is assigned supervisory rights over Tanvir's account.

#### Stage 2: Booking Approval & Escrow Funding

1. **Booking Review (`/dashboard/guardian/children/[studentId]`):** When Tanvir or a tutor initiates a booking request, Rafiq receives an alert detailing subject, tutor rate, schedule, and cancellation policies.
2. **Escrow Checkout (`/dashboard/guardian/payments`):**
   - Rafiq selects payment method: bKash, Nagad, or Credit/Debit Card (SSLCommerz).
   - BDT 6,000 for 8 sessions is charged and locked in Platform Escrow (TRANSACTION_TYPE = ESCROW_HOLD).
   - Funds are not transferred to the tutor; they remain locked until individual sessions are completed.

#### Stage 3: Academic Supervision & Transparency

1. **Cockpit Overview (`/dashboard/guardian`):** Visual cards show attendance percentage (e.g. 95%), upcoming classes, and tutor feedback.
2. **Academic Progress Reports (`/dashboard/guardian/learning`):** Inspects monthly performance trends, homework completion rates, and test scores.

#### Stage 4: Dispute & Tutor Replacement Guarantee

1. **Filing a Claim (`/tutor-replacements`):**
   - If the tutor misses a session or pedagogical performance is unsatisfactory, Rafiq clicks "Request Tutor Replacement".
   - Selects reason: "Tutor No-Show", "Curriculum Incompatibility", or "Unprofessional Behavior".
2. **Operations SLA:** Operations matching team presents 2 verified replacement candidates within 24 hours.
3. **Escrow Rollover or Refund:** Rafiq approves replacement (escrow migrates to new tutor) or chooses an unconditional 100% refund of unearned escrow balance.

---

## 4. Journey 3: The Professional Tutor Journey

_Visual Reference:_ `docs/diagrams/tutor-journey.mmd`

### 4.1 Persona & Context

- **Persona:** Nusrat, a Physics graduate and experienced tutor.
- **Entry Point:** Tutor landing page (`/register?role=tutor`).
- **Goals:** Establish verified professional identity, set availability, accept high-value tuition jobs, conduct interactive classes, and receive prompt, guaranteed payouts.

### 4.2 Journey Stages & Experience Flow

#### Stage 1: Registration & Credential Verification

1. **Onboarding (`/onboarding`):** Fills in academic pedigree, university, subjects taught, hourly rates, and biographical overview.
2. **Credential Dossier Upload (`/dashboard/tutor/verification`):**
   - Uploads National ID (NID) front/back.
   - Uploads Bachelor's degree certificate and academic transcripts.
   - System validates file formats (PDF/JPEG), runs virus scan, and enqueues in administrative review queue.
3. **Verification Approval:** Compliance team reviews documents; Nusrat's profile receives the Verified ID and Academic Verified badges.

#### Stage 2: Availability & Job Discovery

1. **Schedule Matrix (`/dashboard/tutor/profile`):** Sets weekly recurring availability (e.g., 4:00 PM – 9:00 PM weekdays) and marks blackout dates.
2. **Booking Requests (`/dashboard/tutor/requests`):**
   - Browses incoming tuition requests from students/guardians.
   - Reviews requests and accepts within 48 hours.

#### Stage 3: Teaching & Delivery

1. **Booking Acceptance (`/dashboard/tutor/requests`):** Reviews incoming student requests and accepts within 48 hours.
2. **Session Delivery (`/classroom/[id]`):**
   - Launches interactive teaching canvas with mathematical drawing tools.
   - Shares screen, draws diagrams, and solves exercises.
   - Uses Google Meet for real-time collaboration.
3. **Session Completion:** Nusrat signs off at session end; attendance is logged with timestamps.

#### Stage 4: Financial Settlement & Withdrawal

1. **Milestone Unlocking:** After each session and the expiration of the 24-hour dispute window, BDT 92% of the session fee is credited to Nusrat's payable balance (8% platform fee).
2. **Payout Request (`/dashboard/tutor/payments`):**
   - Nusrat requests withdrawal of BDT 4,500 to her registered bKash personal/merchant wallet.
   - Finance team approves batch disbursement; funds arrive with zero deduction fees.

---

## 5. Journey 4: The Administrative Operations Journey

_Visual Reference:_ `docs/diagrams/admin-journey.mmd`

### 5.1 Persona & Context

- **Persona:** Farhan, Platform Compliance & Operations Lead.
- **Entry Point:** Administrative portal (`/dashboard/admin`).
- **Goals:** Maintain platform trust and safety, verify tutor credentials, triage safeguarding reports, arbitrate billing disputes, and moderate tuition postings.

### 5.2 Journey Stages & Experience Flow

#### Stage 1: Tutor Verification Queue (`/dashboard/admin/verification`)

1. Farhan opens pending tutor submissions.
2. Compares NID data against uploaded government identity scans.
3. Verifies university degree credentials against institutional databases or transcripts.
4. Approves profile (activates public directory visibility) or rejects with specific corrective instructions.

#### Stage 2: Safeguarding & Safety Case Triage (`/dashboard/admin/disputes`)

1. **Incident Intake:** An alert fires when a user submits a safety report tagged HARASSMENT or INAPPROPRIATE_BEHAVIOR.
2. **Protective Hold:** Farhan verifies automatic protective hold on the reported tutor, preventing new sessions while investigating.
3. **Investigation:** Inspects chat logs, session timestamps, and submitted evidence.
4. **Resolution:** Farhan logs case findings, issues formal warnings, or enacts permanent bans.

#### Stage 3: Dispute Arbitration (`/dashboard/admin/disputes`)

1. Triage open disputes where student/guardian claims tutor no-show or partial attendance.
2. Inspects session audit logs: Check-in/check-out timestamps, WebRTC telemetry, and classroom activity.
3. Issues binding ruling:
   - **Full Refund:** 100% escrow returned to guardian.
   - **Partial Release:** 50% split based on partial delivery.
   - **Tutor Upheld:** 100% released to tutor if claim is demonstrably false.

---

## 6. Journey 5: The Super Administrator & Governance Journey

_Visual Reference:_ `docs/diagrams/super-admin-journey.mmd`

### 6.1 Persona & Context

- **Persona:** Chief Technology Officer / Managing Director.
- **Entry Point:** Administrative portal (`/dashboard/admin`).
- **Goals:** Financial ledger proof (debits == credits), system configuration, feature toggles, security audit logs, and audited diagnostic impersonation.

### 6.2 Key Capabilities & Controls

1. **Financial Ledger Reconciliation (`/dashboard/admin/finance`):**
   - Real-time automated query checks invariant: SELECT SUM(debit) - SUM(credit) FROM ledger_entries == 0.
   - Generates daily escrow liability versus bank cash balance reports.
2. **Security Audit Log Explorer (`/dashboard/admin/audit-logs`):**
   - Filterable immutable audit trail recording every state-changing API invocation: Actor ID, IP address, user agent, target entity, before/after JSON deltas.
3. **Audited User Impersonation (`/dashboard/admin/users`):**
   - Generates a strictly time-bound (15-minute) cryptographic impersonation token.
   - Used exclusively to troubleshoot reported user UI bugs.
   - Payout triggers and credential modifications are blocked in impersonation mode.
   - Every action during the impersonation session is logged with is_impersonation = true and impersonator_id.

---

## 7. Canonical Route Reference (for all journeys above)

| Journey Stage              | Actual Canonical Route                     |
| -------------------------- | ------------------------------------------ |
| Tutor directory (public)   | `/tutors`                                  |
| Tutor profile (public)     | `/tutors/[id]`                             |
| Onboarding (all roles)     | `/onboarding`                              |
| Guardian child linking     | `/dashboard/guardian/children`             |
| Guardian child detail      | `/dashboard/guardian/children/[studentId]` |
| Student learning hub       | `/dashboard/student/learning`              |
| Student session list       | `/dashboard/student/sessions`              |
| Student booking requests   | `/dashboard/student/requests`              |
| Student payments           | `/dashboard/student/payments`              |
| Guardian learning hub      | `/dashboard/guardian/learning`             |
| Guardian payments          | `/dashboard/guardian/payments`             |
| Live classroom             | `/classroom/[id]`                          |
| Messages inbox             | `/messages`                                |
| Notifications              | `/notifications`                           |
| Tutor verification         | `/dashboard/tutor/verification`            |
| Tutor profile/availability | `/dashboard/tutor/profile`                 |
| Tutor booking requests     | `/dashboard/tutor/requests`                |
| Tutor learning desk        | `/dashboard/tutor/learning`                |
| Tutor lesson plans         | `/dashboard/tutor/lesson-plans`            |
| Tutor payments             | `/dashboard/tutor/payments`                |
| Admin dashboard            | `/dashboard/admin`                         |
| Admin verification queue   | `/dashboard/admin/verification`            |
| Admin disputes/safety      | `/dashboard/admin/disputes`                |
| Admin bookings             | `/dashboard/admin/bookings`                |
| Admin taxonomy             | `/dashboard/admin/taxonomy`                |
| Admin finance              | `/dashboard/admin/finance`                 |
| Admin users/impersonation  | `/dashboard/admin/users`                   |
| Admin audit logs           | `/dashboard/admin/audit-logs`              |
| Tutor replacement claims   | `/tutor-replacements`                      |
| New replacement case       | `/tutor-replacements/new`                  |

---

_End of `USER_JOURNEYS.md` — updated for accuracy per POST_IMPLEMENTATION_AUDIT.md (2026-10-24)._
