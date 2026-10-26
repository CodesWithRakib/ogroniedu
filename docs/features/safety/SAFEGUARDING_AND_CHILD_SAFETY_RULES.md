# Safeguarding and Child Safety Rules

**Document Identifier:** `POL-SAFE-001`  
**Governing Standard:** The Children Act, 2013 (শিশু আইন, ২০১৩) & The Contract Act, 1872  
**Policy Version:** `v1.0-child-safety-reporting`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Zero-Tolerance Child Protection Principles

1. **Mandatory Reporting Duty:**
   - Any educator, parent, student, or platform administrator who observes, suspects, or is informed of child endangerment, harassment, inappropriate sexualized communication, grooming, physical discipline, or psychological abuse is under a strict duty to submit a safety report immediately.
2. **Immediate Emergency Escalation Invariant:**
   - Whenever a safety report is submitted with category `child_safety` or severity `critical`:
     - System automatically sets `escalation_level = 'urgent_child_safety'`.
     - System automatically sets `status = 'escalated'`.
     - An outbox event `safety.critical_escalation` is dispatched for high-priority webhook and operational alerts.
     - An emergency audit entry is written to `audit_logs`.
3. **Statutory Helpline Integration:**
   - In any critical or emergency situation, users are directly linked to government emergency services in Bangladesh:
     - **1098**: National Child Helpline (টোল-ফ্রি শিশু সুরক্ষা হেল্পলাইন)
     - **999**: Bangladesh Police & National Emergency Services
     - **109**: Violence Against Women and Children Prevention Cell

---

## 2. Minor Consent & Legal Guardianship (`v1.0-bd-minor-consent`)

1. **Age of Majority:**
   - Under Section 4 of The Children Act 2013, every individual below the age of **18 years** is a child (minor).
2. **Guardian Representation:**
   - Under Section 11 of The Contract Act 1872, minors cannot independently enter binding educational agreements or disburse financial funds.
   - Minor learners must be registered or linked by an adult parent or legally appointed guardian (`guardian_student_links`).
   - The guardian must affirm the formal consent declaration:
     > _"I hereby declare and affirm under penalty of applicable law that I am the biological parent or legally appointed guardian of the minor student, and I grant explicit consent for their participation in educational tutoring through OgroniEdu under policy version v1.0-bd-minor-consent."_
3. **Minor PII Protection:**
   - Tutors are strictly prohibited from soliciting or receiving the personal phone numbers, home street addresses, or private social media accounts of minor students.
   - All classroom communications, formula sharing, and homework discussions must take place within verified OgroniEdu channels.

---

## 3. Protective Safety Interventions (Tutor Safety Hold)

1. **Administrative Protective Hold:**
   - Authorized Trust & Safety staff have the power to place an immediate **Protective Safety Hold** on any tutor under investigation for child safety or serious misconduct (`safety_hold_status = 'safety_hold'`).
2. **Automated Enforcement:**
   - A tutor on safety hold cannot appear in public discovery search results.
   - A tutor on safety hold cannot accept new booking requests.
   - A tutor on safety hold is prevented from starting upcoming learning sessions (`SessionReschedulingService.startSession` throws `ForbiddenException`).
3. **Due Process & Auditability:**
   - The tutor is informed of the administrative hold and the general policy grounds without revealing the confidential identity of minor reporting parties.
   - Every hold application and release requires documented justification in `audit_logs`.

---

## 4. Confidentiality & Unrelated Case Denial (ABAC Invariant)

1. **Strict Reporter Anonymity:**
   - Safety reports are strictly confidential.
   - The reported tutor or student **never** receives direct access to the reporter's written narrative, attached files (`evidence_asset_ids`), or identity.
2. **ABAC Scoping:**
   - Only the original reporter and authorized administrators (`admin`, `super_admin`, `compliance_reviewer`, `support_agent`) can view a safety report (`GET /api/v1/safety-reports/:id`). Unrelated callers receive `403 ForbiddenException`.
