# OgroniEdu — Core Business Rules & Operational Policies

**Date:** 2026-10-10  
**Status:** Approved Operational Standard

---

## 1. Booking State Machine & Lifecycle Rules

```
                      +-------------------+
                      |     requested     |
                      +---------+---------+
                                |
               +----------------+----------------+
               |                                 |
        Tutor Declines                    Tutor Accepts
               |                                 |
               v                                 v
      +-----------------+              +--------------------+
      |    declined     |              |  awaiting_payment  |
      +-----------------+              +---------+----------+
                                                 |
                                  Payment Succeeded (Within 24h)
                                                 |
                                                 v
                                       +--------------------+
                                       |     confirmed      |
                                       +---------+----------+
                                                 |
                                      Session Time Arrived
                                                 |
                                                 v
                                       +--------------------+
                                       |    in_progress     |
                                       +---------+----------+
                                                 |
                                         Session Completed
                                                 |
                                                 v
                                       +--------------------+
                                       |     completed      |
                                       +--------------------+
```

### Transition Invariants:

- A booking in `awaiting_payment` automatically transitions to `expired` if payment is not received within 24 hours of acceptance.
- Sessions can only be scheduled within the confirmed booking duration and subject rate.
- Any state transition emits a durable domain event through the Transactional Outbox.

---

## 2. Cancellation & Refund Policy Matrix

| Initiating Actor       | Time of Cancellation                   | Refund to Guardian / Student                 | Compensation to Tutor  | Platform Fee Treatment      | Penalty to Initiator                    |
| ---------------------- | -------------------------------------- | -------------------------------------------- | ---------------------- | --------------------------- | --------------------------------------- |
| **Guardian / Student** | > 24 Hours before session              | **100% Refund** (Full credit or cash return) | 0%                     | Retained as platform credit | None                                    |
| **Guardian / Student** | 4 – 24 Hours before session            | **80% Refund**                               | 20% Base compensation  | Waived                      | None                                    |
| **Guardian / Student** | < 4 Hours before session               | **0% Refund**                                | 80% (minus commission) | Platform retains 20%        | Recorded on cancellation history        |
| **Guardian / Student** | No-Show (>15 mins late without notice) | **0% Refund**                                | 80%                    | Platform retains 20%        | Strike 1 recorded                       |
| **Tutor**              | > 24 Hours before session              | **100% Refund** + Free Reschedule option     | 0%                     | Full refund                 | 1 reliability point deducted            |
| **Tutor**              | < 24 Hours before session              | **100% Refund** + Priority Replacement       | 0%                     | Full refund                 | 3 reliability points deducted + Warning |
| **Tutor**              | No-Show (>15 mins late without notice) | **100% Refund** + Instant Tutor Replacement  | 0%                     | Full refund                 | Account suspended pending review        |

---

## 3. Tutor Replacement Guarantee Policy

1. **Eligibility Criteria:**
   - A Guardian/Student is eligible for a guaranteed replacement if:
     - The assigned tutor cancels or fails to show up for a scheduled session.
     - The student is dissatisfied following the first trial/introductory session and requests a replacement within 48 hours.
     - The tutor's profile is suspended by the platform for compliance or verification reasons.
2. **Replacement Protocol:**
   - The platform operations matching team identifies and offers up to 2 alternate verified tutors matching the same subject, class, curriculum, and budget within **24 hours**.
   - If the guardian accepts the replacement, any existing escrow balance transfers seamlessly to the new booking agreement.
   - If no suitable tutor is available or accepted, the guardian receives a **100% unconditional refund** to their original payment method within 3 business days.

---

## 4. Escrow & Tutor Payout Lifecycle

1. **Escrow Hold:**
   - When a booking is paid, 100% of the funds are held in the platform escrow account.
   - Neither the tutor nor the platform recognizes earned revenue at this stage.
2. **Milestone Unlocking:**
   - Upon completion of each individual tutoring session, the tutor submits attendance and session notes.
   - A 24-hour dispute observation window begins.
   - If no dispute is filed within 24 hours, the session fee (minus the 8% platform service commission) is credited to the tutor's ledger payable balance.
3. **Disbursement Payouts:**
   - Automated bi-weekly payouts (1st and 15th of every month) disburse balances exceeding BDT 500 via bKash, Nagad, or direct BEFTN/NPSB bank transfer.
   - Payout transactions are strictly idempotent and signed by platform finance controllers.

---

## 5. Review & Rating Moderation Policy

- Only guardians or students with completed, paid bookings can submit a review and numerical rating (1–5 stars) for a tutor.
- Reviews enter `pending` status and pass through automated profanity and contact information filters.
- Reviews cannot be deleted or manipulated by tutors. Tutors have the right to post one public, respectful response per review.
