# Phase 03 — Backend Service Modularization & Interface Extraction

**Phase ID:** `PHASE-03`  
**Phase Name:** Backend Service Modularization & Interface Extraction  
**Estimated Effort:** 1.5 Days (Day 4)  
**Status:** READY  
**Owner:** Backend Lead & System Architect

---

## 1. Objective and Business Justification

Enforce the core user-defined non-negotiable rule: _"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"_. Business service files must only contain application logic and use case orchestration. Enums, interfaces, contracts, and DTOs must be located in dedicated module subfolders (`interfaces/`, `enums/`, `types/`, `contracts/`, `dto/`). Furthermore, monolithic god services (>600 lines) must be decomposed into single-responsibility sub-services.

---

## 2. Current-State Findings and Evidence

- 27 backend services in `apps/api/src/modules/` contain inline interface definitions directly inside `*.service.ts`:
  - `auth.service.ts` (`LoginUserRow`)
  - `rate-limiter.service.ts` (`RateLimitRecord`)
  - `otp-delivery.service.ts` (`OtpDeliveryConfiguration`)
  - `account-access.service.ts` (`AccountAccessSnapshot`)
  - `booking-expiry.service.ts` (`BookingExpirySweepResult`)
  - `session-reminder.service.ts` (`ReminderGenerationResult`)
  - `session-series.service.ts` (`SeriesMutationResult`)
  - `guardian-access.service.ts` (`BookingParties`)
  - `assignments.service.ts` (`AssignmentView`, `SubmissionView`)
  - `attendance.service.ts` (`AttendanceSummary`)
  - `learning-access.service.ts` (`LearningBookingScope`)
  - `learning-goals.service.ts` (`LearningGoalView`)
  - `learning-materials.service.ts` (`LearningMaterialView`, `MaterialDownload`)
  - `lesson-plans.service.ts` (`LessonPlanView`)
  - `progress.service.ts` (`StudentProgressView`)
  - `onboarding.service.ts` (`OnboardingRow`, `SystemStepContext`)
  - `ledger.service.ts` (`JournalEntryInput`, `PostJournalParams`, `LedgerIntegrityCheckResult`)
  - `payment-orders.service.ts` (`PaymentReceiptDto`)
  - `payment-webhooks.service.ts` (`ConfirmedPayment`)
  - `settlement.service.ts` (`ReconciliationReport`)
  - `disputes.service.ts` (`DisputeListResponse`)
  - `reviews.service.ts` (`PublicReviewView`)
  - `tutor-replacement.service.ts` (`ReplacementRepos`, `ReplacementListResponse`)
  - `saved-tutors.service.ts` (`SavedTutorItemDto`)
  - `tutor-availability.service.ts` (`AvailabilitySlotInput`, `BlockedPeriodInput`)
  - `tutor-verification-expiry.service.ts` (`VerificationExpirySweepResult`)
  - `tutor-verification-reviewer-directory.service.ts` (`VerificationReviewerRecipient`)
- 6 services exceed 600 lines with high cyclomatic complexity and multiple competing concerns (`auth.service.ts` 1,096 lines, `tutor-replacement.service.ts` 1,053 lines, `safety-reports.service.ts` 1,039 lines, `tutor-verification.service.ts` 992 lines, `assignments.service.ts` 922 lines, `analytics.service.ts` 789 lines).

---

## 3. Exact Scope

1. Extract all 30+ internal interfaces and types out of the 27 services into dedicated `interfaces/` folders within each owning NestJS module.
2. Update all imports across controllers, services, and test specifications.
3. Decompose the 6 god services into focused single-responsibility domain sub-services.
4. Maintain backward compatibility of public service methods and NestJS dependency injection tokens.
5. Verify that all 1,026 backend tests pass with zero regressions.

---

## 4. Explicit Exclusions

- Do not extract modules into external monorepo packages (e.g. no `@ogroniedu/auth` package churn); keep domain modules cleanly separated within `apps/api/src/modules/<domain>/`.
- Do not alter database table schemas or API HTTP endpoints.

---

## 5. Prerequisite Phases

- `PHASE-01-ARCHITECTURE-AND-TDD-FOUNDATION.md` (Green baseline).

---

## 6. Tasks and Unique Task IDs

- `BE-001`: Extract `LoginUserRow` from `auth.service.ts` to `auth/interfaces/login-user-row.interface.ts`.
- `BE-002`: Extract `RateLimitRecord` from `rate-limiter.service.ts` to `auth/interfaces/`.
- `BE-003`: Extract `OtpDeliveryConfiguration` from `otp-delivery.service.ts` to `auth/interfaces/`.
- `BE-004`: Extract `AccountAccessSnapshot` from `account-access.service.ts` to `auth/interfaces/`.
- `BE-005`: Extract `BookingExpirySweepResult` from `booking-expiry.service.ts` to `bookings/interfaces/`.
- `BE-006`: Extract `ReminderGenerationResult` from `session-reminder.service.ts` to `bookings/interfaces/`.
- `BE-007`: Extract `SeriesMutationResult` from `session-series.service.ts` to `bookings/interfaces/`.
- `BE-008`: Extract `BookingParties` from `guardian-access.service.ts` to `guardians/interfaces/`.
- `BE-009`: Extract `AssignmentView`, `SubmissionView` from `assignments.service.ts` to `learning/interfaces/`.
- `BE-010`: Extract `AttendanceSummary` from `attendance.service.ts` to `learning/interfaces/`.
- `BE-011`: Extract `LearningBookingScope` from `learning-access.service.ts` to `learning/interfaces/`.
- `BE-012`: Extract `LearningGoalView` from `learning-goals.service.ts` to `learning/interfaces/`.
- `BE-013`: Extract `LearningMaterialView`, `MaterialDownload` from `learning-materials.service.ts` to `learning/interfaces/`.
- `BE-014`: Extract `LessonPlanView` from `lesson-plans.service.ts` to `learning/interfaces/`.
- `BE-015`: Extract `StudentProgressView` from `progress.service.ts` to `learning/interfaces/`.
- `BE-016`: Extract `OnboardingRow`, `SystemStepContext` from `onboarding.service.ts` to `onboarding/interfaces/`.
- `BE-017`: Extract `JournalEntryInput`, `PostJournalParams` from `ledger.service.ts` to `payments/interfaces/`.
- `BE-018`: Extract `PaymentReceiptDto` from `payment-orders.service.ts` to `payments/interfaces/`.
- `BE-019`: Extract `ConfirmedPayment` from `payment-webhooks.service.ts` to `payments/interfaces/`.
- `BE-020`: Extract `ReconciliationReport` from `settlement.service.ts` to `payments/interfaces/`.
- `BE-021`: Extract `DisputeListResponse` from `disputes.service.ts` to `trust/interfaces/`.
- `BE-022`: Extract `PublicReviewView` from `reviews.service.ts` to `trust/interfaces/`.
- `BE-023`: Extract `ReplacementRepos`, `ReplacementListResponse` from `tutor-replacement.service.ts` to `trust/interfaces/`.
- `BE-024`: Extract `SavedTutorItemDto` from `saved-tutors.service.ts` to `tutors/interfaces/`.
- `BE-025`: Extract `AvailabilitySlotInput`, `BlockedPeriodInput` from `tutor-availability.service.ts` to `tutors/interfaces/`.
- `BE-026`: Extract `VerificationExpirySweepResult` from `tutor-verification-expiry.service.ts` to `tutors/interfaces/`.
- `BE-027`: Extract `VerificationReviewerRecipient` from `tutor-verification-reviewer-directory.service.ts` to `tutors/interfaces/`.
- `BE-028`: Decompose god service `auth.service.ts` into sub-services.
- `BE-029`: Decompose god service `tutor-replacement.service.ts`.
- `BE-030`: Decompose god service `safety-reports.service.ts`.
- `BE-031`: Decompose god service `tutor-verification.service.ts`.
- `BE-032`: Decompose god service `assignments.service.ts`.
- `BE-033`: Decompose god service `analytics.service.ts`.

---

## 7. Actual Affected Files and Modules

- `apps/api/src/modules/auth/**/*`
- `apps/api/src/modules/bookings/**/*`
- `apps/api/src/modules/guardians/**/*`
- `apps/api/src/modules/learning/**/*`
- `apps/api/src/modules/onboarding/**/*`
- `apps/api/src/modules/payments/**/*`
- `apps/api/src/modules/trust/**/*`
- `apps/api/src/modules/tutors/**/*`

---

## 8. Files Created, Split, Moved, or Removed

- Created: Dedicated interface files in `src/modules/<domain>/interfaces/`.
- Split: God services decomposed into SRP sub-services.

---

## 9. Frontend Work

- None.

---

## 10. Backend Work

- Pure backend modularization following SOLID and Clean Architecture principles.

---

## 11. Database and Migration Work

- None.

---

## 12. Event-Driven Architecture Work

- Preserve all domain event emission points.

---

## 13. Security Requirements

- Ensure no security checks, role verifications, or password hashing rounds are diluted.

---

## 14. Unit Test Requirements

- All 1,026 backend unit and integration tests must pass cleanly.

---

## 15. Integration Test Requirements

- Supertest controller specs verify that all API response envelopes remain unchanged.

---

## 16. Browser Automation and E2E Scenarios

- N/A for backend refactoring; covered in regression phase.

---

## 17. Required Commands

```pwsh
pnpm --filter @ogroniedu/api typecheck
pnpm --filter @ogroniedu/api test
pnpm --filter @ogroniedu/api lint
```

---

## 18. Acceptance Criteria

1. AST scan confirms zero interfaces and zero enums declared inside any `*.service.ts` file in `apps/api/src/modules/`.
2. All 27 services cleanly import contracts and interfaces from `interfaces/`, `enums/`, or `dto/`.
3. All 1,026 backend tests pass.
4. `pnpm typecheck` returns 0 errors.

---

## 19. Failure and Rollback Considerations

- Work is executed module by module. Run tests after each module refactor before proceeding to the next.

---

## 20. Definition of Done

- Zero interfaces in services, god classes decomposed, tests green.

---

## 21. Expected Evidence

- Regex scan output showing zero matches for `interface` or `enum` in `*.service.ts`.

---

## 22. Known Risks and Blockers

- Circular imports if interfaces are placed in incorrect folders. Always use separate `interfaces/` files without runtime dependencies.

---

## 23. Estimated Effort

- 1.5 Days.

---

## 24. Next-Phase Dependencies

- Unblocks `PHASE-04-SECURITY-HARDENING-AND-STORAGE-ACCESS.md`.
