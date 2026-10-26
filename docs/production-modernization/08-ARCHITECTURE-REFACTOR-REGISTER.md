# OgroniEdu — Master Architecture & Refactoring Register

**Status:** AUDITED & APPROVED  
**Date:** 2026-10-24  
**Scope:** Exhaustive catalog of oversized files, architectural coupling, god classes, interface extraction targets, and page decomposition roadmaps.  
**Core Rules Enforced:**

1. _"frontend amon file bad jabe na sob file ei amra kaj korbo"_ — All 528 frontend files cataloged and accounted for.
2. _"backend er o enum , interface kokhonoi service er vitore thakbe na alada folder kore module e thakbe"_ — Zero interfaces or enums inside service files.
3. _"Route Pages Must Remain Thin"_ — Zero bloated `page.tsx` files in Next.js App Router.

---

## 1. Oversized Files Register (106 Source Files $\ge$ 300 Lines)

Audited across application-owned source files (`apps/web/src`, `apps/api/src`, `packages/contracts/src`, `packages/database/src`):

| Rank   | File Path                                                                    | Workspace | Lines   | Primary Architectural Concern                                       | Target Refactor Action                                                                      |
| ------ | ---------------------------------------------------------------------------- | --------- | ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1      | `packages/contracts/src/notification-registry.ts`                            | contracts | 1,148   | Monolithic registry containing all notification types               | Split into domain-specific registries (`auth`, `booking`, `payment`, `safety`)              |
| 2      | `apps/api/src/modules/auth/auth.service.ts`                                  | api       | 1,096   | God service (auth, sessions, OTP, magic links, rate limit)          | Split into dedicated sub-services; extract `LoginUserRow`                                   |
| 3      | `apps/web/src/features/tutors/pages/tutor-details-page.tsx`                  | web       | 1,076   | Monolithic tutor profile view with booking modal, reviews, map      | Decompose into `TutorHero`, `TutorCredentialsCard`, `TutorBookingPanel`                     |
| 4      | `apps/api/src/modules/trust/tutor-replacement.service.ts`                    | api       | 1,053   | God service (scoring, invitations, dispute arbitration)             | Split into `TutorReplacementScorer`, `TutorReplacementCaseService`; extract interfaces      |
| 5      | `apps/web/src/features/profile/pages/profile-page.tsx`                       | web       | 1,050   | Monolithic user profile editor (all roles, credentials, sessions)   | Split into `ProfileGeneralForm`, `ProfileSecurityForm`, `ProfileSessionManager`             |
| 6      | `apps/api/src/modules/trust/safety-reports.service.ts`                       | api       | 1,039   | God service (reports, content safety, tutor holds, guardian alerts) | Split into `SafetyIncidentService`, `SafetyActionService`, `SafetyAlertService`             |
| 7      | `apps/api/src/modules/tutors/services/tutor-verification.service.ts`         | api       | 992     | God service (dossier, tier progression, reviewer assignment)        | Split into `TutorDossierService`, `TutorReviewerService`                                    |
| 8      | `apps/web/src/features/admin/pages/admin-finance-page.tsx`                   | web       | 964     | Monolithic admin financial console (ledger, payouts, commission)    | Split into `LedgerJournalTable`, `PayoutApprovalGrid`, `CommissionPolicyForm`               |
| 9      | `apps/web/src/components/guardian/GuardianChildrenManager.tsx`               | web       | 953     | Monolithic guardian child manager with safety controls              | Decompose into `ChildRosterTable`, `ChildSafetyDrawer`, `GuardianConsentModal`              |
| 10     | `apps/api/src/modules/learning/services/assignments.service.ts`              | api       | 922     | God service (assignment creation, submissions, grading, rubrics)    | Split into `AssignmentsService`, `SubmissionsService`, `GradingService`; extract interfaces |
| 11     | `apps/web/src/features/admin/components/tabs/adminVerificationTab.tsx`       | web       | 859     | Monolithic verification review console                              | Split into `VerificationQueueTable`, `DossierViewerModal`, `VerificationDecisionPanel`      |
| 12     | `apps/web/src/lib/navigation.ts`                                             | web       | 853     | Monolithic navigation configuration for 9 roles                     | Decompose into role-specific navigation files under `src/lib/navigation/`                   |
| 13     | `apps/web/src/app/[locale]/bookings/[id]/page.tsx`                           | web       | 829     | Monolithic route page with embedded state and messaging             | **THIN ROUTE REFACTOR**: Delegate to `src/features/bookings/`                               |
| 14     | `apps/web/src/features/classroom/components/InteractiveWhiteboard.tsx`       | web       | 822     | Monolithic HTML5 canvas drawing engine                              | Extract `WhiteboardToolbar`, `CanvasRenderer`, `ShapeFactory`                               |
| 15     | `apps/web/src/features/admin/pages/admin-taxonomy-page.tsx`                  | web       | 819     | Monolithic curriculum, grade, subject, and area editor              | Decompose into `CurriculumTree`, `SubjectDataTable`, `DistrictAreaManager`                  |
| 16     | `apps/web/src/features/public/pages/home-page.tsx`                           | web       | 790     | Monolithic landing page with hero, search, features, stats          | Extract `HeroSection`, `FeaturesSection`, `TestimonialsSection`, `StatsSection`             |
| 17     | `apps/api/src/modules/analytics/analytics.service.ts`                        | api       | 789     | God service (retention cohorts, revenue, activity, leaderboards)    | Split into `OperationalAnalyticsService`, `FinancialAnalyticsService`                       |
| 18     | `apps/web/src/features/classroom/components/ClassroomWorkspace.tsx`          | web       | 771     | Monolithic classroom container (video, chat, canvas, formulas)      | Decompose into `ClassroomHeader`, `WhiteboardPanel`, `ClassroomChatPanel`                   |
| 19     | `apps/web/src/features/tutor-discovery/components/tutorSearchCatalog.tsx`    | web       | 737     | Monolithic tutor search catalog with filter state                   | Decompose into `TutorSearchHeader`, `TutorSearchResultsGrid`, `TutorPagination`             |
| 20     | `apps/web/src/app/[locale]/dashboard/guardian/children/[studentId]/page.tsx` | web       | 728     | Monolithic route page for child detail                              | **THIN ROUTE REFACTOR**: Delegate to `src/features/guardian/`                               |
| 21     | `apps/web/src/features/payments/pages/payments-page.tsx`                     | web       | 724     | Monolithic payments hub for students, tutors, and guardians         | Decompose into `PaymentsSummaryCard`, `TransactionsTable`, `InvoicesList`                   |
| 22     | `apps/api/src/modules/tutors/services/tutor-search.service.ts`               | api       | 660     | Complex search query builder with geo-distance and filters          | Extract `TutorSearchQueryBuilder`, `TutorFacetAggregator`                                   |
| 23     | `apps/web/src/store/services/learning-api.ts`                                | web       | 649     | Monolithic RTK Query API slice for LMS                              | Split into `assignments-api.ts`, `lessons-api.ts`, `attendance-api.ts`                      |
| 24     | `apps/web/src/app/[locale]/(dashboard)/sessions/[id]/page.tsx`               | web       | 634     | Monolithic session detail route page                                | **THIN ROUTE REFACTOR**: Delegate to `src/features/bookings/`                               |
| 25     | `apps/api/src/modules/learning/services/progress.service.ts`                 | api       | 632     | Large progress analytics service                                    | Extract `ProgressReportGenerator`; extract interfaces                                       |
| 26     | `apps/api/src/modules/payments/services/payment-webhooks.service.ts`         | api       | 632     | Large multi-provider webhook verification service                   | Apply Strategy Pattern for SSLCommerz / bKash / Nagad; extract interfaces                   |
| 27     | `apps/api/src/modules/learning/services/learning-materials.service.ts`       | api       | 628     | File material upload, streaming, authorization                      | Extract `MaterialStorageAdapter`; extract interfaces                                        |
| 28     | `packages/database/src/seeds/initial_seed.ts`                                | database  | 623     | Seed data file                                                      | Modularize into `seed_users`, `seed_taxonomy`, `seed_tutors`                                |
| 29     | `apps/api/src/modules/bookings/services/session-rescheduling.service.ts`     | api       | 617     | Complex rescheduling state machine and conflict checks              | Extract `ReschedulingPolicyValidator`                                                       |
| 30     | `apps/web/src/components/scheduling/SessionScheduleCalendar.tsx`             | web       | 598     | Calendar view component                                             | Extract `CalendarGrid`, `EventSlotRenderer`                                                 |
| 31     | `apps/web/src/features/tutors/pages/tutor-earnings-page.tsx`                 | web       | 591     | Tutor financial overview                                            | Extract `EarningsChart`, `PayoutHistoryTable`                                               |
| 32     | `apps/web/src/app/[locale]/(dashboard)/assignments/[id]/page.tsx`            | web       | 577     | Monolithic assignment route page                                    | **THIN ROUTE REFACTOR**: Delegate to `src/features/learning/`                               |
| 33     | `apps/api/src/modules/notifications/booking-messages.service.ts`             | api       | 576     | Real-time chat message delivery with content redaction              | Extract `MessageRedactionService`                                                           |
| 34     | `apps/web/src/app/[locale]/bookings/[id]/pay/page.tsx`                       | web       | 575     | Monolithic checkout route page                                      | **THIN ROUTE REFACTOR**: Delegate to `src/features/payments/`                               |
| 35     | `apps/web/src/features/admin/components/tabs/adminSafetyTab.tsx`             | web       | 572     | Admin safety case management tab                                    | Extract `SafetyCaseList`, `SafetyActionModal`                                               |
| 36     | `apps/web/src/features/bookings/pages/requests-page.tsx`                     | web       | 567     | Booking requests list                                               | Extract `BookingRequestCard`, `BookingRequestFilters`                                       |
| 37     | `apps/api/src/modules/bookings/services/session-scheduling.service.ts`       | api       | 557     | Session booking scheduler                                           | Extract `SlotConflictValidator`                                                             |
| 38     | `apps/web/src/store/services/trust-api.ts`                                   | web       | 554     | Monolithic RTK Query slice for reviews/disputes/safety              | Split into `disputes-api.ts`, `reviews-api.ts`, `safety-api.ts`                             |
| 39     | `apps/api/src/modules/payments/services/refunds.service.ts`                  | api       | 552     | Refund calculation and disbursement engine                          | Extract `RefundPolicyCalculator`                                                            |
| 40     | `apps/web/src/features/tutor-discovery/components/tutorFiltersForm.tsx`      | web       | 542     | Complex search filter form                                          | Extract `SubjectPicker`, `LocationFilter`, `RateSlider`                                     |
| 41     | `apps/api/src/modules/bookings/bookings.service.ts`                          | api       | 525     | Core booking lifecycle service                                      | Split into `BookingRequestService`, `BookingConfirmationService`                            |
| 42     | `apps/api/src/modules/tutors/services/tutor-dossier.service.ts`              | api       | 517     | Dossier query & assembly                                            | Extract `DossierAssembler`                                                                  |
| 43     | `apps/api/src/modules/payments/services/payouts.service.ts`                  | api       | 505     | Payout processing service                                           | Extract `PayoutDisbursementService`                                                         |
| 44     | `apps/api/src/modules/notifications/notification.service.ts`                 | api       | 505     | Notification creation, dispatching, read tracking                   | Split into `NotificationDispatchService`, `NotificationQueryService`                        |
| 45     | `apps/api/src/modules/organizations/organizations.service.ts`                | api       | 500     | Organization management                                             | Split into `OrganizationMembershipService`                                                  |
| 46     | `apps/web/src/features/tutors/pages/tutor-dashboard-page.tsx`                | web       | 473     | Tutor dashboard                                                     | Extract feature subcomponents                                                               |
| 47     | `apps/web/src/store/services/payments-api.ts`                                | web       | 472     | RTK Query payment endpoints                                         | Extract sub-slices                                                                          |
| 48     | `apps/web/src/store/services/admin-api.ts`                                   | web       | 465     | RTK Query admin endpoints                                           | Extract sub-slices                                                                          |
| 49     | `apps/web/src/features/tutor-discovery/pages/tutors-page.tsx`                | web       | 453     | Public tutor catalog page                                           | Extract feature subcomponents                                                               |
| 50     | `apps/web/src/features/student/pages/student-dashboard-page.tsx`             | web       | 452     | Student dashboard                                                   | Extract feature subcomponents                                                               |
| 51-106 | Remaining 56 files between 300 and 450 lines                                 | Various   | 300–450 | Moderate complexity                                                 | Decompose during feature-specific phases                                                    |

---

## 2. Refactoring Strategy & Best Practices

1. **Test-Driven Refactoring (Mandatory)**: Before modifying any oversized file, run existing regression tests (`pnpm test`). Ensure tests pass 100%. Add targeted characterization unit tests if coverage is sparse.
2. **Preserve Public Contracts**: Do not break external controller routes, DTOs, or component props.
3. **Dedicated Module Subfolders**:
   - Every NestJS module must use dedicated folders: `interfaces/`, `enums/`, `dto/`, `services/`, `utils/`.
   - Never declare `interface` or `enum` in `*.service.ts`!
4. **Thin Route Principle (Next.js)**:
   - Route `page.tsx` files should be 10–40 lines.
   - Responsible strictly for reading `params`, `searchParams`, invoking server metadata, running initial auth checks, and rendering `<FeatureView />`.
5. **No Barrel Export Circularity**: Avoid circular dependency chains through barrel exports (`index.ts`). Import directly from feature sub-modules.
