# Phase 11: End-to-End Business Workflow Validation — Role & Permission Test Matrix

## 1. Canonical Roles Overview

The platform implements 9 distinct roles with granular authorization policies enforced via `@Roles(...)` and custom guards in NestJS:

1. `student`
2. `guardian`
3. `tutor`
4. `support_agent`
5. `compliance_reviewer`
6. `admin`
7. `super_admin`
8. `organization_owner`
9. `organization_staff`

---

## 2. Granular Role & Permission Access Matrix

The matrix below documents both allowed access (**ALLOW**) and prohibited access (**DENY** / 403 Forbidden) across the platform's core operational endpoints:

| Functional Endpoint / Action                | Student  | Guardian |  Tutor   | Support Agent | Compliance Reviewer |  Admin   | Super Admin | Org Owner | Org Staff |
| :------------------------------------------ | :------: | :------: | :------: | :-----------: | :-----------------: | :------: | :---------: | :-------: | :-------: |
| **Search Tutors & View Public Profiles**    |  ALLOW   |  ALLOW   |  ALLOW   |     ALLOW     |        ALLOW        |  ALLOW   |    ALLOW    |   ALLOW   |   ALLOW   |
| **Submit Tutor Application & Evidence**     |   DENY   |   DENY   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Review & Approve Tutor Verification**     |   DENY   |   DENY   |   DENY   |     DENY      |        ALLOW        |  ALLOW   |    ALLOW    |   DENY    |   DENY    |
| **Manage Dependent Child Accounts**         |   DENY   |  ALLOW   |   DENY   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Create Booking Request**                  |  ALLOW   |  ALLOW   |   DENY   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Accept/Reject/Counter Booking**           |   DENY   |   DENY   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |  ALLOW*   |  ALLOW*   |
| **Fund Escrow Payment Order**               |  ALLOW   |  ALLOW   |   DENY   |     DENY      |        DENY         |   DENY   |    DENY     |   ALLOW   |   DENY    |
| **Join WebRTC Classroom & Mark Attendance** |  ALLOW   |   DENY   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Submit Homework Assignment**              |  ALLOW   |   DENY   |   DENY   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Grade Assignment & Settle Milestone**     |   DENY   |   DENY   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **Request Tutor Payout Disbursement**       |   DENY   |   DENY   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |  ALLOW*   |   DENY    |
| **Trigger Emergency Session SOS**           |  ALLOW   |  ALLOW   |  ALLOW   |     DENY      |        DENY         |   DENY   |    DENY     |   DENY    |   DENY    |
| **File Child Safeguarding Incident**        |  ALLOW   |  ALLOW   |  ALLOW   |     ALLOW     |        ALLOW        |  ALLOW   |    ALLOW    |   ALLOW   |   ALLOW   |
| **View Unredacted Safeguarding Reports**    | **DENY** | **DENY** | **DENY** |   **DENY**    |      **ALLOW**      | **DENY** |  **ALLOW**  | **DENY**  | **DENY**  |
| **Inspect Financial Double-Entry Ledger**   |   DENY   |   DENY   |   DENY   |     DENY      |        DENY         |  ALLOW   |    ALLOW    |   DENY    |   DENY    |
| **Manage Multi-Tenant Org & Staff**         |   DENY   |   DENY   |   DENY   |     DENY      |        DENY         |   DENY   |    ALLOW    |   ALLOW   |   DENY    |
| **Modify System Settings & Flags**          |   DENY   |   DENY   |   DENY   |     DENY      |        DENY         |   DENY   |  **ALLOW**  |   DENY    |   DENY    |

_\*Note: `organization_owner` and `organization_staff` can manage bookings for tutors assigned to their institutional roster._

---

## 3. Critical Security Boundaries

### 3.1 Safeguarding Firewall (Zero-Trust Model)

- **Rule:** Unredacted child safeguarding reports contain sensitive minor disclosures, victim allegations, and confidential digital evidence.
- **Enforcement:** The endpoint `GET /api/v1/safeguarding/reports` rejects any request lacking either `compliance_reviewer` or `super_admin`.
- **Negative Assertion:** Even platform `admin` users receive HTTP 403 Forbidden on confidential safeguarding endpoints.

### 3.2 Financial Ledger Isolation

- **Rule:** Double-entry journal entries must remain tamper-proof.
- **Enforcement:** Only `admin` and `super_admin` can read raw ledger journals and accounts. No role (including `super_admin`) has write or update access to posted journals — all adjustments must pass through compensating transaction services.

### 3.3 Multi-Tenant Agency Boundary

- **Rule:** An `organization_owner` of Organization A cannot view the tutors, students, financial disbursements, or commission rates of Organization B (Strict Tenant ID Scoping).
- **Enforcement:** Queries automatically inject `WHERE organization_id = :actorOrgId`.

---

## 4. Test Verification Strategy

The authorization matrix is validated through automated integration tests that iterate over all 9 role tokens and assert:

1. HTTP 200/201 on authorized actions.
2. HTTP 403 Forbidden on unauthorized actions.
3. HTTP 401 Unauthorized when an unauthenticated token or expired signature is presented.
