# Financial Dispute Integration

**Document Identifier:** `ARCH-SAFEGUARDING-FINANCE-001`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Escrow Settlement Freeze Invariant

To ensure platform accountability and prevent premature payout of disputed tuition fees:

1. When a booking dispute or safeguarding complaint linked to a tuition booking is opened, the booking status transitions to `disputed`.
2. In `SettlementService.settleMilestone()`, settlement is strictly blocked if `booking.status === 'disputed'`:
   ```typescript
   if (booking.status === 'disputed') {
     throw new ConflictException(
       `Cannot settle milestone ${milestoneId}: Booking ${booking.id} is in disputed status.`,
     );
   }
   ```
3. Milestone escrow balances remain protected in the platform escrow account until formal dispute adjudication is reached.

---

## 2. Authorized Administrative Refund Processing

1. When an authorized administrator or compliance reviewer resolves a dispute with outcome `refund` or `partial_refund`:
   - The dispute service invokes `RefundsService.requestAndApproveForAdmin()`.
   - The double-entry ledger posts matching balanced journals (`debit: Escrow / credit: Refund Clearing / Student`).
   - A `payment_refunds` record is linked to `booking_disputes.refund_id`.
2. **Duplicate Prevention:**
   - Database unique constraint prevents duplicate active disputes on a single booking.
   - Idempotency keys prevent double execution of refunds.
   - Disallowed states reject re-adjudication of already resolved disputes.
