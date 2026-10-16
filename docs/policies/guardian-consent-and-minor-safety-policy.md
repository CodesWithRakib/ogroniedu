# OgroniEdu — Guardian Consent and Minor Safety Policy

**Policy Identifier:** `POL-SEC-004`  
**Current Approved Version:** `v1.0-bd-minor-consent`  
**Effective Date:** 2026-10-10  
**Jurisdiction:** People's Republic of Bangladesh  
**Status:** Approved Operational Policy

---

## 1. Statutory Context & Legal Baseline

In accordance with the statutory framework of Bangladesh:

1. **The Children Act, 2013 (শিশু আইন, ২০১৩):**
   - Section 4 defines every human being below the age of **18 (eighteen) years** as a child (minor).
   - The State mandates that all decisions, contracts, and digital services concerning children prioritize the best interests of the child.
2. **The Contract Act, 1872:**
   - Under Section 11, minors are legally incompetent to contract. Contracts for educational services, paid tutoring sessions, and financial obligations must be executed with a competent parent or legal guardian.
3. **Cyber Protection & Privacy Duty of Care:**
   - Minor students are entitled to heightened digital privacy protections. Educational platforms must minimize the collection and dissemination of child personally identifiable information (PII).

---

## 2. Policy-Dependent Consent (`v1.0-bd-minor-consent`)

### 2.1 Explicit Guardian Consent Requirement

- Any learner under 18 years of age is classified as a **Minor Student**.
- A Minor Student cannot independently enter into paid tutoring arrangements, confirm booking sessions, or authorize escrow payments.
- When an account for a minor is created or linked by a guardian, the platform requires an explicit affirmation of legal guardianship:
  - `"I hereby declare and affirm under penalty of applicable law that I am the biological parent or legally appointed guardian of the minor student, and I grant explicit consent for their participation in educational tutoring through OgroniEdu under policy version v1.0-bd-minor-consent."`
- The system immutably logs:
  - `consent_policy_version`: `'v1.0-bd-minor-consent'`
  - `consent_recorded_at`: UTC ISO-8601 timestamp
  - `guardian_user_id`: UUID of the consenting guardian
  - `student_user_id`: UUID of the minor learner
  - `relationship_type`: Allowed values: `father`, `mother`, `legal_guardian`.

### 2.2 Independent Learner Exception

- Learners who are **18 years of age or older** (verified via date of birth or National ID verification) are classified as **Independent Learners**.
- Independent Learners may self-manage profile visibility, select subjects, book tutors directly, and execute checkout transactions without guardian mediation.

---

## 3. Relationship Scoping & Attribute-Based Access Control (ABAC)

1. **Strict Relationship Scoping:**
   - A guardian may manage multiple children simultaneously (multi-child support).
   - A guardian is **strictly prohibited** from viewing, accessing, or inspecting educational, attendance, or personal records of any learner who is not linked to their account via an active record in `guardian_student_links`.
   - Any query attempting to access `/api/v1/guardians/children/:studentId/*` evaluates:
     ```sql
     SELECT 1 FROM guardian_student_links
     WHERE guardian_user_id = :guardianId
       AND student_user_id = :studentId
       AND status = 'active';
     ```
   - Absence of an active relationship immediately terminates the request with HTTP `403 Forbidden` (or HTTP `404 Not Found` in sensitive resource contexts).

2. **Relationship Lifecycle States:**
   - `pending`: Guardian initiated a link request or registered a child with verification pending.
   - `active`: Link confirmed with mutual consent or parent registration verification. Full academic supervision active.
   - `rejected`: Link request declined by student or platform administrator.
   - `revoked`: Link terminated by either party. Immediately terminates guardian visibility into the student's ongoing records.

---

## 4. Minimal Child PII Architecture

To minimize risk and prevent child exploitation:

1. **Redacted Direct Contact Information:**
   - Minor learners do not have public profile URLs.
   - Tutors never receive the direct personal mobile phone number or residential address of minor students.
   - All communications occur through in-app verified channels.
2. **Access-Scoped Academic Data:**
   - Academic records exposed to verified tutors are restricted to educational taxonomy: Curriculum (e.g. NCTB Bangla Medium), Education Level (Class 8), Subjects (General Science, Mathematics), and stated Learning Goals.
3. **Data Export & Right to Erasure:**
   - Guardians of minor students may request a complete export of the minor's educational data (`GET /api/v1/users/me/export`).
   - Account deletion requests transition the account to `deletion_pending` for a standard 30-day compliance hold, after which all PII is permanently redacted or cryptographically scrambled.
