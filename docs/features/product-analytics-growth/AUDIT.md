# OgroniEdu — Phase 14: Product Analytics & Growth Audit

## 1. Executive Summary

This audit assesses the state of product analytics, behavioral telemetry, reporting, and retention measurement across the **OgroniEdu (অগ্রণী এডু)** platform.

The objective is to establish an evidence-driven, privacy-conscious analytics foundation that measures actual user journeys—from registration and onboarding to tutor discovery, booking, payments, and learning engagement—without relying on invented numbers, fake dashboards, or intrusive third-party trackers.

---

## 2. Monorepo Capabilities Inventory

| Domain | Existing Implementation | Analytics Capability | Data Source / Table | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Users** | Multi-role registration (Student, Tutor, Guardian), OTP verification, magic links | User count by role, onboarding status, registration date | `users` | **Persisted** |
| **Tutor Verification** | Academic dossier submission, verification review, subject tagging | Verification status (`unverified`, `pending`, `verified`, `rejected`) | `tutor_profiles`, `tutor_dossiers` | **Persisted** |
| **Tutor Discovery** | Full-text and taxonomy subject search, location filter, hourly rate filter | Search queries, zero-result searches, profile views | `product_analytics_events` (Migration 030) | **Implemented** |
| **Booking Funnel** | Request -> Confirm -> Escrow Pay -> Complete / Cancel / Dispute | Funnel stages, conversion rate, cancellation rate, decline rate | `bookings`, `booking_status_events` | **Persisted** |
| **Financial Ledger** | Double-entry bookkeeping, SSLCOMMERZ / bKash sandbox, escrow, payouts | GMV, refunds, platform commissions (8%), ledger reconciliation | `payment_orders`, `payment_refunds`, `ledger_entries` | **Persisted** |
| **Learning Management** | Sessions, attendance, assignments, homework submissions, grading | Attendance rate, homework submission rate, review rate | `booking_sessions`, `assignments`, `assignment_submissions` | **Persisted** |
| **Trust & Safety** | Bilingual reviews, tutor replacement cases, safeguarding emergency SOS | Average rating, replacement rate, safety incidents | `reviews`, `tutor_replacement_cases`, `safety_reports` | **Persisted** |
| **Multi-Tenancy** | Organizations, member tutors, organization invitations | Organization member counts, org booking volume, student reach | `organizations`, `organization_members` | **Persisted** |
| **Reporting & Export** | Formula-safe CSV export with anti-formula injection sanitization | Admin reports for users, bookings, financials, tutors, organizations | `analytics.service.ts` (`exportReport`) | **Persisted** |

---

## 3. Identified Gaps & Operational Limitations

| Finding ID | Domain | Severity | Gap Description | User / Business Impact | Required Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD-14-01** | Discovery Telemetry | High | Search queries and profile views were not tracked, preventing measurement of zero-result searches or discovery drop-offs | Unable to identify missing tutors or ineffective subject tags in specific districts | Added `product_analytics_events` table (Migration 030) and `tutor_search_performed` event | **RESOLVED** |
| **AUD-14-02** | Multi-Stage Funnel | Medium | Funnel analytics was limited to booking status transitions and omitted top-of-funnel discovery actions | Incomplete visibility into whether users drop off before requesting a booking | Added 7-stage funnel query in `AnalyticsService.getFunnelAnalytics()` | **RESOLVED** |
| **AUD-14-03** | Role Activation | High | Activation was not formally defined or calculated per role (Student, Guardian, Tutor) | Inability to evaluate onboarding effectiveness for different personas | Implemented `AnalyticsService.getActivationAnalytics()` tracking role-specific milestones | **RESOLVED** |
| **AUD-14-04** | Learning Engagement | Medium | LMS assignment submission and grading rates were not aggregated into operational reports | No platform visibility into student academic engagement or tutor grading timeliness | Implemented `AnalyticsService.getLearningEngagementAnalytics()` | **RESOLVED** |
| **AUD-14-05** | Tenant Analytics | High | Organizations lacked dedicated, tenant-isolated analytics endpoints | Organization managers could not measure their member tutors' collective performance | Implemented `AnalyticsService.getOrganizationAnalytics()` with strict IDOR prevention | **RESOLVED** |
| **AUD-14-06** | Client Event Forgery | Critical | Client event endpoints could allow users to forge business outcomes (e.g. claiming a booking was confirmed) | Corrupted business metrics and potential fraud | Implemented `CLIENT_PERMITTED_EVENTS` allowlist; server-authoritative events restricted to backend | **RESOLVED** |
| **AUD-14-07** | PII Leakage in Events | Critical | Free-text search or custom event properties could accidentally ingest sensitive data (passwords, OTPs, phone numbers) | Privacy violations and compliance breach | Implemented `sanitizeAnalyticsProperties()` stripping all sensitive keys | **RESOLVED** |

---

## 4. Privacy & Authorization Assessment

1. **Data Minimization:** No unnecessary personal data (passwords, OTPs, auth tokens, credit cards, full addresses, private messages) is accepted by the analytics ingestion service.
2. **Account Deletion Safety:** The `product_analytics_events` table references `users(id)` with `ON DELETE SET NULL`, ensuring that when a user exercises their right to erasure (`/api/v1/users/me/delete-account`), their personal link is destroyed while preserving aggregated statistical integrity.
3. **Third-Party Tracker Absence:** Zero external tracking scripts (Google Tag Manager, Meta Pixel, Hotjar, Mixpanel) are bundled into `@ogroniedu/web`. All telemetry is first-party, self-hosted, and transparently governed.
