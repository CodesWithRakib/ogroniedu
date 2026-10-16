# OgroniEdu — Comprehensive Feature Catalog

**Date:** 2026-10-10  
**Status:** Canonical Reference

---

## 1. Domain 1: Identity, Authentication & Profile Governance

### Feature 1.1: Multi-Factor Registration & Credential Verification

- **Purpose:** Onboard Guardians, Independent Students, and Tutors securely with verified Bangladesh phone (+880) and email.
- **Actors:** Guest, System.
- **Preconditions:** Guest provides valid phone number or email and strong password (min 8 chars, 1 uppercase, 1 digit, 1 symbol).
- **Postconditions:** User record created in `pending_verification` status; verification token dispatched; audit entry logged.
- **Error Cases:** Duplicate phone/email returns user-friendly conflict; rate limit exceeded (max 5 requests per 10 minutes per IP).
- **Tests:** `auth.registration.spec.ts` (unit & integration), `auth.e2e.spec.ts` (Playwright).

### Feature 1.2: Guardian-Child Relationship Linkage

- **Purpose:** Allow parents/guardians to create and manage academic profiles for multiple children.
- **Actors:** Guardian, Student (if existing user).
- **Preconditions:** Guardian is authenticated and active.
- **Postconditions:** `guardian_student_links` entry created in `active` status; student profile initialized with grade/curriculum; notification emitted.
- **Error Cases:** Attempt to link non-existent student or link oneself as parent returns 400 Bad Request.
- **Tests:** `guardian.links.spec.ts`, negative authorization tests.

### Feature 1.3: Tutor Profile & Credential Submission

- **Purpose:** Enable tutors to craft rich profiles and upload NID and academic credentials for trust verification.
- **Actors:** Tutor, Reviewer.
- **Preconditions:** Tutor authenticated.
- **Postconditions:** Qualifications uploaded to private storage; tutor status transitioned to `submitted`; notification sent to Admin queue.
- **Error Cases:** File size > 10MB or disallowed MIME type rejected.
- **Tests:** `tutor.profile.spec.ts`, `file.upload.spec.ts`.

---

## 2. Domain 2: Discovery, Matching & Availability

### Feature 2.1: Multi-Facet Tutor Search & Directory

- **Purpose:** Empower parents and learners to locate verified tutors meeting exact academic criteria.
- **Actors:** Public Guest, Guardian, Student.
- **Filters:** Academic Subject, Class (1-12 / Admission), Curriculum (Bangla Medium, English Medium, English Version, Madrasah), Service Area (District, Upazila), Mode (Online, In-person, Hybrid), Price Range (BDT).
- **Preconditions:** Only tutors with `verification_status = 'approved'` and `publication_status = 'published'` appear in public search.
- **Postconditions:** Paginated tutor cards returned with cached response (Redis 5 min TTL).
- **Tests:** `discovery.search.spec.ts`.

### Feature 2.2: Tutor Availability Matrix & Concurrency Locks

- **Purpose:** Allow tutors to set weekly recurring time slots and block holidays; prevent overlapping sessions.
- **Actors:** Tutor, Booking Engine.
- **Preconditions:** Valid time slot definitions (`end_time > start_time`).
- **Postconditions:** Availability stored; PostgreSQL GiST exclusion constraint guards against overlapping bookings.
- **Error Cases:** Attempt to confirm a booking overlapping an existing scheduled session fails immediately with 409 Conflict.
- **Tests:** `scheduling.concurrency.spec.ts`.

---

## 3. Domain 3: Bookings, Scheduling & Service Agreements

### Feature 3.1: Scoped Booking Request & Acceptance Workflow

- **Purpose:** Guardian/Student initiates formal booking request specifying student, subject, schedule, and mode; tutor accepts or declines.
- **Actors:** Guardian/Student (Requester), Tutor.
- **Workflow:**
  1. Requester submits request (`status: requested`).
  2. System verifies tutor availability and dispatches real-time notification to tutor.
  3. Tutor accepts (`status: awaiting_payment`) or declines (`status: declined`).
  4. Requester completes payment within 24-hour expiration window; status becomes `confirmed`.
- **Tests:** `booking.lifecycle.spec.ts`.

### Feature 3.2: Session Attendance & Rescheduling

- **Purpose:** Track real-time attendance per session and allow orderly rescheduling.
- **Actors:** Tutor, Guardian, Student.
- **Attendance Statuses:** `present`, `late`, `absent`, `excused`.
- **Preconditions:** Reschedule request submitted >4 hours before session start time.
- **Postconditions:** Attendance recorded; guardian receives real-time notification; outbox event written.
- **Tests:** `session.attendance.spec.ts`.

---

## 4. Domain 4: Learning Management & Tutor Workspace

### Feature 4.1: Assignments & Homework Tracking

- **Purpose:** Tutors issue homework with due dates and attachments; students submit answers; tutors provide qualitative feedback.
- **Actors:** Tutor, Student, Guardian.
- **Workflow:** Tutor creates assignment -> Student receives notification -> Student submits before deadline -> Tutor grades & adds remarks -> Guardian reviews completed assignment.
- **Tests:** `learning.assignments.spec.ts`.

### Feature 4.2: Student Academic Progress Reports

- **Purpose:** Structured periodic evaluations assessing student concept clarity, exam performance, and areas of improvement.
- **Actors:** Tutor (Author), Guardian & Student (Readers).
- **Postconditions:** Progress report generated with attendance statistics and visual performance ratings; real-time alert dispatched to guardian.
- **Tests:** `learning.progress.spec.ts`.

---

## 5. Domain 5: Payments, Escrow & Financial Ledger

### Feature 5.1: Digital Gateway Checkout (SSLCOMMERZ / bKash / Nagad)

- **Purpose:** Securely accept lesson fees via Bangladesh digital financial instruments.
- **Actors:** Guardian / Student Payer, Payment Gateway.
- **Workflow:** Payer selects payment method -> Backend generates cryptographically signed order with idempotency key -> Payer completes transaction on gateway -> Gateway calls backend webhook -> Backend validates signature, verifies status server-to-server, credits escrow ledger, confirms booking, emits notifications.
- **Tests:** `payment.webhook.spec.ts`, `payment.idempotency.spec.ts`.

### Feature 5.2: Double-Entry Immutable Ledger

- **Purpose:** Absolute accounting integrity for all platform money movements.
- **Ledger Accounts:**
  - `1010` - Gateway Escrow Clearing (Asset)
  - `2010` - Tutor Payable Escrow (Liability)
  - `4010` - Platform Commission Revenue (Revenue)
  - `2020` - Refund Payable (Liability)
- **Invariant:** Sum of debits equals sum of credits for every posted journal.
- **Tests:** `ledger.balance.spec.ts`.

---

## 6. Domain 6: Real-Time Notifications (Required Foundation)

### Feature 6.1: Centralized Socket.IO Gateway & Notification Center

- **Purpose:** Deliver instantaneous in-app alerts, badge counters, and durable notification history for all system events.
- **Actors:** All Authenticated Users.
- **Channels:** In-app real-time WebSocket + Persistent PostgreSQL database history.
- **Features:** Authenticated user rooms (`user:<userId>`), unread counter sync, mark-as-read, mark-all-as-read, interactive notification dropdown/drawer, bilingual translation (bn/en).
- **Tests:** `notification.gateway.spec.ts`, `notification.service.spec.ts`, `notification.e2e.spec.ts`.
