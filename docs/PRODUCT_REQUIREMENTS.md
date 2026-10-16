# OgroniEdu — Product Requirements Document (PRD)

**Version:** 1.0.0 (Phase 0 Baseline)  
**Target Market:** Bangladesh (Class 1–12, Bangla & English Medium/Version, Madrasah, University Admission Preparation)  
**Primary Language:** Bengali (`bn`) & English (`en`)  
**Status:** Approved Engineering Baseline

---

## 1. Product Vision & Problem Statement

In Bangladesh, finding competent, trustworthy, and verified private tutors is predominantly reliant on informal word-of-mouth networks, roadside posters, or unvetted social media groups. This poses major risks:

- Guardians face safety concerns regarding unvetted adults visiting their homes or teaching minors online.
- Tutors suffer from erratic payments, sudden cancellations without compensation, and exploitation.
- Students lack structured tracking of their academic progression, attendance, and homework.
- In regional divisions, districts, and upazilas outside Dhaka, access to high-caliber tutors for science groups and university admission preparation is severely limited.

**OgroniEdu** bridges this gap by providing a trusted tutoring marketplace combined with a structured learning management and tutor workspace platform.

---

## 2. User Personas & Core Journeys

### 2.1 The Guardian (অভিভাবক)

- **Profile:** Parent managing one or more school-going children (Class 1–12).
- **Core Need:** Safety, verified qualifications of the tutor, transparent fee structure, real-time schedule tracking, attendance alerts, and bi-weekly progress reports.
- **Key Flow:** Registers -> Adds child profiles -> Searches/filters verified tutors by subject & locality -> Sends booking request -> Pays securely via bKash/Nagad/Cards -> Receives real-time attendance and homework notifications -> Reviews progress reports.

### 2.2 The Independent Student (শিক্ষার্থী - ১৮+)

- **Profile:** College student (HSC) or university admission seeker aged 18 or above.
- **Core Need:** Direct access to specialized subject tutors (Physics, Chemistry, Higher Math, English, Admission GK/Science).
- **Key Flow:** Registers directly -> Browses tutors -> Books trial/recurring sessions -> Submits assignments -> Attends online/in-person classes -> Leaves ratings and reviews.

### 2.3 The Tutor (শিক্ষক)

- **Profile:** University student (e.g., BUET, DU, Medical, DMC, CU, RU) or professional educator.
- **Core Need:** Fair, reliable income, protected schedules, automated payment payouts, and tools to manage students without administrative friction.
- **Key Flow:** Completes onboarding -> Uploads NID and Academic Credentials -> Sets availability calendar, hourly/monthly rates, and service areas -> Accepts booking requests -> Conducts sessions -> Logs attendance & assignments -> Receives bi-weekly bank/MFS payouts.

### 2.4 The Platform Administrator & Reviewer

- **Profile:** Internal trust, safety, and operations team.
- **Core Need:** Verify tutor credentials within 48-hour SLA, moderate reviews, arbitrate disputes, monitor financial ledger balance, and manage system catalogs.

---

## 3. Prioritized Functional Requirements Matrix

| ID         | Module / Area       | Priority     | Requirement Description & Acceptance Criteria                                                                                                                                                                         |
| ---------- | ------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-001** | Discovery           | P1 (MVP)     | Public visitor can search published, approved tutor profiles filtered by Subject, Class/Level, Curriculum, Mode (In-person, Online, Hybrid), District/Upazila, and Hourly Rate without exposing private contact info. |
| **FR-002** | Profile             | P1 (MVP)     | Tutor profile displays verification badge, bio, educational background, teaching modes, verified subjects, pricing in BDT, response time, and moderation-approved reviews.                                            |
| **FR-003** | Auth & Identity     | P0 (Core)    | Multi-role authentication supporting Mobile Number (E.164 +880) and Email with secure password hashing (Argon2id/bcrypt), refresh token rotation in HTTP-only cookies, and session management.                        |
| **FR-004** | Guardian Links      | P0 (Core)    | Guardian can link multiple children. Access to child bookings, attendance, notes, and payments strictly restricted to verified guardians via server-side ABAC authorization.                                          |
| **FR-005** | Tutor Verification  | P0 (Core)    | Tutors submit NID/Birth Certificate and Academic Certificates. Dedicated admin review workflow with approval, rejection with reason code, or request for information. Profiles cannot be published without approval.  |
| **FR-006** | Availability Engine | P0 (Core)    | Tutors configure recurring weekly time slots and blocked dates. PostgreSQL GiST exclusion constraints prevent overlapping sessions across concurrent bookings.                                                        |
| **FR-007** | Booking Lifecycle   | P0 (Core)    | State machine: `requested` -> `accepted` -> `awaiting_payment` -> `confirmed` -> `in_progress` -> `completed` (or `cancelled`, `declined`, `disputed`). All transitions auditable.                                    |
| **FR-008** | Real-Time Notify    | P0 (Phase 0) | Centralized notification engine emitting authenticated Socket.IO in-app events for all booking changes, attendance, and announcements, backed by persistent PostgreSQL storage.                                       |
| **FR-009** | Learning Mgmt       | P1 (MVP)     | Tutors record session attendance (`present`, `late`, `absent`, `excused`), create assignments with due dates, review submissions, and generate periodic progress reports.                                             |
| **FR-010** | Payments & Escrow   | P0 (Core)    | Server-verified digital payments (SSLCOMMERZ / bKash / Nagad). Escrow hold until session completion. Immutable double-entry financial ledger recording all debits, credits, commissions, and payouts in poisha.       |
| **FR-011** | Trust & Disputes    | P1 (MVP)     | Guardian/Student can file dispute or request tutor replacement. Admin review queue with evidence tracking and deterministic refund resolution.                                                                        |
| **FR-012** | Admin Governance    | P0 (Core)    | Role-Based Access Control (`admin`, `super_admin`, `support_agent`) with comprehensive audit logging of all sensitive data access and mutations.                                                                      |

---

## 4. Non-Functional Requirements (NFR)

- **NFR-001: Data Isolation & Minor Protection:** Zero cross-tenant data leakage. Student data cannot be accessed by unlinked guardians or unrelated tutors.
- **NFR-002: Concurrency & Idempotency:** Financial and booking mutations must provide idempotency keys. Double-booking is strictly prohibited by database constraints.
- **NFR-003: Performance:** 95th percentile response time < 250ms for search queries; Socket.IO message delivery latency < 100ms.
- **NFR-004: Localization:** 100% complete Bengali (`bn`) and English (`en`) user interface with locale-aware date, currency (৳), and number formatting.
- **NFR-005: Security & Privacy:** OWASP Top 10 compliance, no raw PII in logs, Bcrypt/Argon2 password hashing, SSL/TLS encryption in transit, AES-256 for sensitive files at rest.
- **NFR-006: High Availability:** 99.9% uptime target, automated database backups every 6 hours with Point-In-Time Recovery (PITR).
