# OgroniEdu — Phase 14: Test Plan & Quality Assurance Strategy

## 1. Scope & Test Objectives

This test plan validates all components of the product analytics and retention system:
1. Event ingestion schema validation and property sanitization.
2. Prevention of client-side event forgery (blocking client claims of server-authoritative events).
3. Multi-stage booking funnel calculations and zero-denominator boundary handling.
4. Role-specific activation rates (Student, Guardian, Tutor).
5. Learning engagement analytics (attendance, homework submission, grading rates).
6. Multi-tenant organization analytics isolation (preventing cross-tenant IDOR).
7. Formula-safe CSV export generation with anti-formula injection sanitization.
8. Non-regression of existing authentication, booking, payment, and safeguarding workflows.

---

## 2. Test Execution Matrix

| Test Suite / Category | File Path | Focus & Assertions | Status |
| :--- | :--- | :--- | :--- |
| **Product Analytics & Growth Spec** | `apps/api/test/product-analytics-growth.spec.ts` | 13 comprehensive unit tests covering property sanitization, client event validation, server forgery prevention, funnel calculation, activation metrics, learning engagement, and tenant isolation | **13/13 PASS** |
| **Analytics Service Spec** | `apps/api/test/analytics.service.spec.ts` | 9 unit tests covering temporal validation, operational reconciliation, and CSV export | **9/9 PASS** |
| **Analytics Controller Spec** | `apps/api/test/analytics.controller.spec.ts` | 14 unit tests covering RBAC guards, role permission matrix, and controller endpoints | **14/14 PASS** |
| **Web Analytics Data Spec** | `apps/web/test/analytics-data.spec.ts` | 2 frontend tests verifying complete vs partial payload guards and deterministic export | **2/2 PASS** |
| **Web Analytics UI Spec** | `apps/web/test/analytics.spec.ts` | Frontend visual tests verifying light theme rendering and empty state safety | **PASS** |

---

## 3. Detailed Test Cases

### 3.1 Event Ingestion & Sanitization
- **TC-14-01:** Strips sensitive keys (`password`, `otp`, `auth_token`, `credit_card`, `phone_number`, `student_email`, `private_message`) from inbound event properties.
- **TC-14-02:** Truncates string properties longer than 256 characters and caps maximum properties at 20.
- **TC-14-03:** Accepts valid client-permitted events (`tutor_search_performed`, `tutor_profile_viewed`, `booking_started`).
- **TC-14-04 (Negative):** Rejects client-side attempt to emit server-authoritative events (`booking_confirmed`, `session_completed`) with `BadRequestException` (HTTP 400).
- **TC-14-05:** Database failure during server event tracking is isolated and does not abort business transactions.

### 3.2 Funnel & Activation Calculations
- **TC-14-06:** Calculates 7-stage funnel with step-by-step drop-offs, overall conversions, and zero-result search rate.
- **TC-14-07 (Boundary):** Zero denominators (0 searches, 0 bookings) produce `0.0%` without `NaN` or crashes.
- **TC-14-08:** Correctly aggregates role-specific activation rates for Students (onboarding + bookings), Guardians (linked children + child bookings), and Tutors (verification + accepted bookings).

### 3.3 Multi-Tenant Isolation (IDOR Defense)
- **TC-14-09:** Platform Admins can query analytics for any valid organization.
- **TC-14-10:** Organization Owners can query analytics for their own organization.
- **TC-14-11 (Security Negative):** Rejects unauthorized users attempting to view another organization's analytics with `ForbiddenException` (HTTP 403).
- **TC-14-12 (Negative):** Returns 404 `NotFoundException` if organization ID does not exist.

---

## 4. Execution Commands

```bash
# Execute Phase 14 dedicated test suite
pnpm --filter @ogroniedu/api test test/product-analytics-growth.spec.ts

# Execute all analytics test suites
pnpm --filter @ogroniedu/api test test/analytics.*.spec.ts

# Run entire monorepo test suite (129 test files)
pnpm test
```
