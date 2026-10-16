# OgroniEdu — Testing Strategy & Quality Assurance Architecture

**Date:** 2026-10-10  
**Test Frameworks:** Vitest / Jest (Unit & Integration), Supertest (API Integration), Playwright (E2E)  
**Status:** Approved Quality Standard

---

## 1. Testing Pyramid & Layered Defense

```
                /\
               /  \
              / E2E\            Playwright Browser Automation
             /------\           (User Journeys, Toasts, Locales)
            /  Integ \          Supertest & Socket Integration Tests
           /----------\         (API Contracts, DB Persistence, Real-Time Rooms)
          /    Unit    \        Vitest / Jest
         /--------------\       (Domain Rules, Validation Schemas, Calculators)
```

### 1.1 Unit Testing (Fast, Isolated, Deterministic)

- **Scope:** Pure functions, Zod contract schemas, business rule calculators, notification registry validation, template interpolation, financial ledger debits/credits calculation.
- **Rules:** No network I/O, no active database connections. Executes in milliseconds.

### 1.2 Integration Testing (Component & Persistence Verification)

- **Scope:** NestJS controllers, TypeORM entity repositories, database transactions, concurrency locking (PostgreSQL GiST constraints), and Redis queue jobs.
- **Rules:** Executes against a real or containerized PostgreSQL test instance. Each test suite runs in an isolated transaction or truncated test database.

### 1.3 WebSocket & Real-Time Integration Testing

- **Scope:** Authenticated Socket.IO handshakes, room isolation, notification delivery, unread count synchronization, and reconnection recovery.
- **Negative Testing:** Proves that Socket A (User 1) never receives events dispatched to Socket B (User 2), and unauthorized subscription attempts are rejected with `401 Unauthorized`.

### 1.4 End-to-End (E2E) Testing (Playwright)

- **Scope:** Complete end-user browser workflows running on Chromium, Firefox, and WebKit (including mobile viewport emulation):
  - Guardian onboarding & student linking.
  - Tutor discovery, filtering, and booking submission.
  - Real-time toast notification appearance on recipient screen without page reload.
  - Opening Notification Center and marking notifications as read.
  - Bilingual language toggle (`bn` <-> `en`).

---

## 2. Mandatory Test Coverage Rules

1. **Negative Security Scenarios:**
   - Every protected API endpoint must feature at least one automated negative test verifying that unauthenticated or unauthorized users receive `401` or `403`.
2. **Idempotency Verification:**
   - Financial and booking endpoints must include automated tests asserting that repeating the same request with an identical `Idempotency-Key` yields an identical response without double-charging or creating duplicate records.
3. **No Skipped Tests:**
   - CI failure threshold: Zero skipped or commented-out tests permitted on `main` branch.
