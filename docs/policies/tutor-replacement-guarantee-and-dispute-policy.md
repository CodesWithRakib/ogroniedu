# Tutor Replacement Guarantee and Dispute Resolution Policy

**Policy Document Identifier:** `POL-TRUST-002`  
**Current Policy Version:** `v1.0-tutor-replacement-guarantee`  
**Effective Date:** 2026-10-10  
**Scope:** All booking agreements, learners, guardians, and verified tutors operating on OgroniEdu across Bangladesh.

---

## 1. Institutional Guarantee Philosophy

Parents and students should never be trapped in an unsatisfactory tutoring arrangement. The **OgroniEdu Tutor Replacement Guarantee (FR-011)** ensures seamless academic continuity by pairing learners with verified alternate tutors without financial penalties or administrative friction.

---

## 2. Replacement Eligibility Criteria

A learner or guardian is fully entitled to invoke the Tutor Replacement Guarantee under any of the following verified conditions:

1. **Trial Session Dissatisfaction:**
   - The learner is dissatisfied following the first trial/introductory session and submits a replacement request within **48 hours**.
2. **Repeated Tutor Cancellation:**
   - The assigned tutor cancels more than two (2) scheduled classes within any 30-day billing cycle.
3. **Tutor No-Show:**
   - The tutor fails to attend a scheduled session without 24 hours prior emergency notification (more than 15 minutes late).
4. **Pedagogical or Curriculum Misalignment:**
   - Demonstrable mismatch between learner needs (e.g. Cambridge IGCSE Physics vs. NCTB Bangla Medium curriculum) and tutor expertise.
5. **Unprofessional or Inappropriate Conduct:**
   - Violation of professional standards, unpunctuality, or inappropriate communication.

---

## 3. Replacement Guarantee Workflow State Machine

Replacement cases progress through a deterministic, auditable state machine:

```
[requested] ──► [under_review] ──► [matching] ──► [offered] ──► [accepted]
                                                    │
                                                    ▼
                                          [rejected / closed]
```

1. **`requested`:** Case submitted by student or guardian with reason code and narrative description. Booking status transitions to `replacement_requested`.
2. **`under_review`:** Operations support evaluates class attendance, logs, and reason code within **4 hours SLA**.
3. **`matching`:** Platform matching team identifies verified candidate tutors matching subject, medium, locality, and hourly budget.
4. **`offered`:** Replacement candidate profile presented to student/guardian for approval.
5. **`accepted`:** Guardian accepts candidate. Booking agreement re-assigned to replacement tutor, status restored to `confirmed`, and escrow balance seamlessly transfers.
6. **`rejected / closed`:** Request denied (with documented rationale) or customer elects full refund.

---

## 4. Financial Escrow Protection During Replacement

- **Zero Additional Charge:** No administrative fee or surcharge is ever assessed for invoking the Replacement Guarantee.
- **Escrow Continuity:** Unspent advance session funds held in `2100 Student Advance Escrow Deposit Liability` transfer seamlessly to the replacement tutor's booking agreement upon acceptance.
- **Unconditional Refund Alternative:** If OgroniEdu cannot match an acceptable verified tutor within **48 hours**, the guardian may elect an immediate **100% refund** of all unspent escrow funds back to their original bKash/Nagad/card account.

---

## 5. Privacy, Confidentiality & Unrelated Case Denial (ABAC Invariant)

- All replacement guarantee claims, customer statements, and internal matching notes are strictly confidential.
- **Unrelated Case Denial Invariant:** Only the affected learner/guardian and authorized Trust & Safety staff have access to replacement records. Third-party users receive `403 ForbiddenException`.
- The replaced tutor is never provided access to sensitive internal guardian comments.

---

## 6. Child Safety & Emergency Escalation Protocol

- If any replacement request involves allegations of child endangerment, inappropriate physical contact, or sexual harassment:
  - System automatically flags `escalation_level = 'urgent_child_safety'` and status `'escalated'`.
  - Tutor's account is immediately suspended from accepting new bookings pending formal investigation.
  - Case is escalated to the Executive Child Safety Committee within **1 hour**.
