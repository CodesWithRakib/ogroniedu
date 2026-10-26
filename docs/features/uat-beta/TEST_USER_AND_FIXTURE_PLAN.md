# Phase 12: User Acceptance Testing, Beta Launch & Stabilization — Test User & Fixture Plan

## 1. Fixture Design Principles & Safety Invariants

All test fixtures and accounts created for User Acceptance Testing (UAT) adhere to strict synthetic data generation rules:

- **100% Synthetic Data:** No real customer names, NID numbers, phone numbers, email addresses, or payment credentials are ever used.
- **Production Isolation Guard:** Test fixture seed scripts strictly refuse execution if `NODE_ENV === 'production'` or `DB_NAME === 'ogroniedu_prod'`.
- **Bangladeshi Context Realism:** Synthetic identities use culturally authentic Bangladeshi names, educational institutions (e.g. BUET, Dhaka University, Viqarunnisa, Notre Dame College), and standard curricula (Bangla Medium, English Medium, English Version).

---

## 2. Canonical Synthetic Test Accounts

The following deterministic synthetic test personas are provisioned in the isolated development/staging database (`ogroniedu_dev`):

| Canonical Role        | Synthetic Name   | Test Email                      | Test Phone       | Initial Status | Profile Details                                |
| :-------------------- | :--------------- | :------------------------------ | :--------------- | :------------: | :--------------------------------------------- |
| `student`             | Abrar Ahmed      | `student.demo@ogroniedu.com`    | `+8801711000001` |     Active     | HSC 2nd Year, Science, Notre Dame College      |
| `student` (New)       | Sadia Rahman     | `student2.demo@ogroniedu.com`   | `+8801711000002` |     Active     | Class 9, English Version, Viqarunnisa Noon     |
| `guardian`            | Farhana Karim    | `guardian.demo@ogroniedu.com`   | `+8801811000001` |     Active     | Parent of Abrar Ahmed & Sadia Rahman           |
| `tutor` (Verified)    | Rashed Karim     | `tutor.demo@ogroniedu.com`      | `+8801911000001` | Fully Verified | BUET EEE '22, Physics & Higher Math (3 Badges) |
| `tutor` (Pending)     | Nabila Hossain   | `tutor2.demo@ogroniedu.com`     | `+8801911000002` |  Under Review  | DU Chemistry, Pending Academic Verification    |
| `support_agent`       | Kamal Hasan      | `support.demo@ogroniedu.com`    | `+8801611000001` |     Active     | Customer Support Desk Level 1                  |
| `compliance_reviewer` | Advocate Shirin  | `compliance.demo@ogroniedu.com` | `+8801511000001` |     Active     | Child Safety & Safeguarding Legal Officer      |
| `admin`               | Tariqul Islam    | `ops.demo@ogroniedu.com`        | `+8801311000001` |     Active     | Platform Operations & Category Manager         |
| `super_admin`         | Mahmudul Hasan   | `admin.demo@ogroniedu.com`      | `+8801711000000` |     Active     | Platform Architect & Security Administrator    |
| `organization_owner`  | Dr. Moniruzzaman | `retina.owner@ogroniedu.com`    | `+8801811000002` |     Active     | Founder, Retina Medical Coaching Academy       |
| `organization_staff`  | Asif Mahmud      | `retina.staff@ogroniedu.com`    | `+8801811000003` |     Active     | Academic Coordinator, Retina Coaching          |

> [!NOTE]
> All synthetic demo accounts in development utilize the standard local dev credentials documented in [`apps/web/e2e/README.md`](file:///C:/Sofof_tech_2026/ogroniedu/apps/web/e2e/README.md).

---

## 3. Workflow State Fixture Configurations

### 3.1 Tutor Verification States

1. **Fully Verified Tutor (`tutor.demo`):**
   - Level 1 (Identity): Approved (Synthetic NID: `19951234567890123`).
   - Level 2 (Academic): Approved (Synthetic B.Sc. Certificate from BUET).
   - Level 3 (Background): Approved (Synthetic Police Clearance certificate).
   - Search Ranking Multiplier: Active (`badges: 3`).
2. **Pending Applicant (`tutor2.demo`):**
   - Level 1: Approved.
   - Level 2: Submitted (under review by compliance).
   - Level 3: Unsubmitted.

### 3.2 Bookings in Diverse States

1. **Requested:** New booking request from `student.demo` to `tutor2.demo` awaiting response.
2. **Accepted / Awaiting Escrow:** Booking accepted by `tutor.demo`; payment order generated.
3. **Funded / Active:** Booking funded via sandbox bKash; 4 weekly sessions generated in calendar.
4. **Completed / Settled:** Past session with attendance recorded and escrow milestone settled.
5. **Cancelled with Refund:** Booking cancelled $>24\text{h}$ in advance; 100% refund ledger journal posted.

### 3.3 Learning Sessions & Attendance Telemetry

1. **Upcoming Session:** Scheduled for tomorrow at 10:00 AM UTC; WebRTC classroom token ready.
2. **Completed Session:** 60 scheduled minutes, 55 minutes attended ($91.6\%$ duration); auto-verified.
3. **Disputed Session:** 60 scheduled minutes, 20 minutes attended ($33.3\%$ duration); below $80\%$ threshold, hold placed on milestone payout.

### 3.4 Safeguarding Incident Test Fixtures

- **Synthetic Incident Case (`rep-synthetic-01`):**
  - Reporter: `student.demo`
  - Accused: `tutor2.demo`
  - Category: `off_platform_payment`
  - Narrative: "Tutor requested direct cash payment outside the platform."
  - Clearance: Restricted to `compliance_reviewer` and `super_admin`.

---

## 4. Teardown & Deterministic Reset

- Dev/staging test databases can be restored at any point using the standard idempotent migration and seed runner:
  ```bash
  pnpm db:migrate && pnpm db:seed
  ```
- All foreign keys cascade predictably, preserving ledger invariance without orphan records.
