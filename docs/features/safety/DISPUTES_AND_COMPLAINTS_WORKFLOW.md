# Disputes and Complaints Workflow

**Document Identifier:** `POL-DISPUTE-001`  
**Policy Version:** `v1.0-dispute-resolution`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Dispute Eligibility & Scope

A student or parent/guardian may formally open a Booking Dispute under any of the following grounds:
1. `tutor_no_show`: Assigned tutor failed to attend the scheduled class session.
2. `unfulfilled_hours`: Tutor ended the class prematurely or delivered fewer hours than contracted.
3. `poor_quality`: Demonstrable failure to follow curriculum or lack of academic competence.
4. `curriculum_mismatch`: Mismatch between learner's syllabus (e.g. Cambridge IGCSE vs NCTB) and lesson delivery.
5. `inappropriate_conduct`: Unprofessional demeanor, abusive speech, or breach of conduct.
6. `billing_dispute`: Incorrect session deductions, disputed hours, or contested ledger charges.
7. `other`: Extenuating circumstances accompanied by written explanation.

---

## 2. Dispute State Machine

```
               ┌───────────┐
               │  opened   │
               └─────┬─────┘
                     │ (Staff Triaged)
                     ▼
             ┌───────────────┐
             │ under_review  │◄────────────┐
             └───────┬───────┘             │
                     │                     │ (Evidence Submitted)
         ┌───────────┴───────────┐         │
         │ (Need more info)      │         │
         ▼                       ▼         │
┌──────────────────┐    ┌─────────────────┐│
│evidence_requested│───►│ evidence_added  ├┘
└──────────────────┘    └─────────────────┘
         │
         │ (Triage Resolution Executed)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      TERMINAL STATES                        │
├─────────────────────────┬───────────────────────────────────┤
│ • resolved_refund       │ Full or agreed refund to customer │
│ • resolved_tutor_upheld │ Tutor delivered; funds restored   │
│ • resolved_replacement  │ Alternate tutor assigned (FR-011) │
│ • dismissed             │ Frivolous or unsupported claim    │
└─────────────────────────┴───────────────────────────────────┘
```

---

## 3. Financial Invariant: Automated Escrow Freeze

1. **Immediate Freeze:**
   - As soon as a dispute is opened, the parent booking transitions to `status = 'disputed'`.
   - **Escrow Settlement Freeze Invariant:** While a booking is in `'disputed'` status, the financial service [`SettlementService.settleMilestone`](file:///C:/Sofof_tech_2026/ogroniedu/apps/api/src/modules/payments/services/settlement.service.ts) is strictly blocked from releasing any held escrow funds to the tutor's payable balance.
2. **Releasing the Freeze Upon Resolution:**
   - **Refund Outcome (`resolved_refund`):** Escrow funds are refunded back to the customer's bKash/Nagad/card via [`RefundsService`](file:///C:/Sofof_tech_2026/ogroniedu/apps/api/src/modules/payments/services/refunds.service.ts).
   - **Tutor Upheld Outcome (`resolved_tutor_upheld`):** The booking returns to `completed` or `in_progress`, restoring settlement eligibility.
   - **Replacement Outcome (`resolved_replacement`):** Escrow balances transfer cleanly to the replacement tutor's booking agreement.

---

## 4. Resolution SLAs & Escalation Matrix

| Priority | Criteria | Triage SLA | Target Resolution SLA |
| :--- | :--- | :--- | :--- |
| **High** | Child safety allegations, harassment, large monetary dispute (> ৳10,000) | **1 hour** | **12 hours** |
| **Medium** | Tutor no-show, unfulfilled hours, trial dissatisfaction | **4 hours** | **24 hours** |
| **Standard** | General pedagogical feedback, schedule confusion | **8 hours** | **48 hours** |
