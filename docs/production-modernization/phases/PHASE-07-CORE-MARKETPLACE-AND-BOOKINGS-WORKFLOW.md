# Phase 07 — Core Marketplace & Tutoring Lifecycle Hardening

**Phase ID:** `PHASE-07`  
**Phase Name:** Core Marketplace & Tutoring Lifecycle Hardening  
**Estimated Effort:** 1 Day (Days 3–4)  
**Status:** READY  
**Owner:** Full-Stack Lead & Product Architect

---

## 1. Objective and Business Justification
Verify and harden the core marketplace engine representing the primary revenue model of OgroniEdu:
> **Discovery → Booking Request → Tutor Acceptance → Escrow Checkout → Session Scheduling → Replacement Guarantee**
Ensure state transitions are deterministic, concurrency-safe, and ledger-balanced.

---

## 2. Current-State Findings and Evidence
- Tutor search catalog renders in `features/tutor-discovery/` and routes to `/[locale]/tutors`.
- Booking lifecycle state machine managed by `BookingsService` and `SessionsService`.
- Expiry sweepers run on 5-minute intervals in `BookingExpiryService`.
- PostgreSQL exclusion constraints prevent double-booking a tutor for overlapping time slots.
- Financial escrow holds funds in `platform_escrow` ledger account until session completion.
- Tutor replacement guarantee wizard operates under `/[locale]/tutor-replacements/new`.

---

## 3. Exact Scope
1. Verify student and guardian booking request flows end-to-end.
2. Verify tutor request response (accept, decline, withdraw) and notification generation.
3. Verify automated 48-hour unaccepted request cancellation and 24-hour unpaid booking cancellation.
4. Verify session scheduling, rescheduling approval flow, and no-show penalties.
5. Verify SSLCommerz, bKash, and Nagad sandbox escrow checkout and balanced double-entry ledger posting.
6. Verify tutor replacement claim submission, candidate scoring, and arbitration.

---

## 4. Explicit Exclusions
- Live production payment credentials (external provisioning blocker; sandbox adapters used).
- Live SMS provider credentials (mocked via outbox event log).

---

## 5. Prerequisite Phases
- `PHASE-02-FRONTEND-MODULARIZATION-PAGES.md`
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`
- `PHASE-06-DATABASE-INTEGRITY-AND-MIGRATIONS.md`

---

## 6. Tasks and Unique Task IDs
- `MKT-001`: Verify tutor discovery search filtering and public profile SSR rendering.
- `MKT-002`: Verify booking request submission with student and linked guardian contexts.
- `MKT-003`: Verify booking status state machine transitions and expiry sweeper execution.
- `MKT-004`: Verify escrow payment order creation, webhook handling, and ledger balance.
- `MKT-005`: Verify session cancellation, rescheduling, and conflict exclusion constraints.
- `MKT-006`: Verify tutor replacement guarantee candidate scoring and dispute arbitration.

---

## 7. Actual Affected Files and Modules
- `apps/web/src/features/tutor-discovery/**/*`
- `apps/web/src/features/bookings/**/*`
- `apps/web/src/features/payments/**/*`
- `apps/web/src/features/trust/**/*`
- `apps/api/src/modules/tutors/**/*`
- `apps/api/src/modules/bookings/**/*`
- `apps/api/src/modules/payments/**/*`
- `apps/api/src/modules/trust/**/*`

---

## 8. Files Created, Split, Moved, or Removed
- Modified: Feature components and services under marketplace modules.

---

## 9. Frontend Work
- Ensure booking request modal handles validation errors smoothly.
- Ensure payment checkout clearly displays escrow safety guarantee badges.

---

## 10. Backend Work
- Verify transaction boundaries across `BookingsService.createRequest()` and `LedgerService.postJournal()`.

---

## 11. Database and Migration Work
- Verify exclusion constraints in migration 019 (`booking_scheduling_integrity.sql`).

---

## 12. Event-Driven Architecture Work
- Emit `booking.requested`, `booking.accepted`, `booking.confirmed`, `session.rescheduled`.

---

## 13. Security Requirements
- Ensure students cannot confirm bookings without completing payment.
- Ensure only session participants or authorized guardians can reschedule sessions.

---

## 14. Unit Test Requirements
- `apps/api/test/booking-lifecycle-phase07.spec.ts` passes 10/10 tests.
- `apps/api/test/tutor-replacement.service.spec.ts` passes 24/24 tests.
- `apps/api/test/payments.service.spec.ts` passes 18/18 tests.

---

## 15. Integration Test Requirements
- `apps/api/test/e2e-tutoring-lifecycle.spec.ts` passes 5/5 tests.

---

## 16. Browser Automation and E2E Scenarios
- `apps/web/e2e/journey.booking.spec.ts` passes end-to-end in browser.

---

## 17. Required Commands
```pwsh
pnpm --filter @ogroniedu/api test test/e2e-tutoring-lifecycle.spec.ts
pnpm --filter @ogroniedu/api test test/booking-lifecycle-phase07.spec.ts
pnpm --filter @ogroniedu/web test test/tutoring-lifecycle-phase07.spec.ts
```

---

## 18. Acceptance Criteria
1. Complete booking journey executes from search to confirmation without errors.
2. Escrow payment posts balanced ledger entry with zero discrepancy.
3. Expiry sweepers cancel overdue requests and unpaid bookings accurately.
4. Tutor replacement guarantee resolves candidates within SLA.

---

## 19. Failure and Rollback Considerations
- Rollback any state machine changes that break existing booking status transitions.

---

## 20. Definition of Done
- All marketplace test suites pass, booking lifecycle verified in browser.

---

## 21. Expected Evidence
- Test logs for `e2e-tutoring-lifecycle.spec.ts`.

---

## 22. Known Risks and Blockers
- None.

---

## 23. Estimated Effort
- 1 Day.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-08-LEARNING-LMS-AND-CLASSROOM-WORKFLOW.md` and `PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md`.
