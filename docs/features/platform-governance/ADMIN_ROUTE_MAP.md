# Phase 09: Admin Operations, Organization Management & Platform Governance — Administrative Route Map

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Status:** Approved & Implemented

---

## 1. Route Map Inventory

All routes are mounted under the localized route group `/[locale]/dashboard/admin` and `/[locale]/dashboard/organization`.

| #      | Route Path                        | Purpose                                         | Authorized Roles                                               | Data Source / Backend API                                                 | Key Actions                                                                         | State Handling                                                    |       Status       |
| :----- | :-------------------------------- | :---------------------------------------------- | :------------------------------------------------------------- | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- | :---------------------------------------------------------------- | :----------------: |
| **1**  | `/dashboard/admin`                | Master Operational Overview Dashboard           | `admin`, `super_admin`, `support_agent`, `compliance_reviewer` | `GET /api/v1/admin/dashboard`                                             | Metric summaries, pending queues, quick jump links                                  | Loading skeleton, zero-state cards, API error banner              |    **Existing**    |
| **2**  | `/dashboard/admin/users`          | Platform Users Directory & Account Management   | `admin`, `super_admin`                                         | `GET /api/v1/admin/users`                                                 | Search, role filter, status filter, suspend user, reactivate user                   | Empty results state, pagination controls, confirmation modal      |    **Existing**    |
| **3**  | `/dashboard/admin/users/[id]`     | User Dossier & Account History                  | `admin`, `super_admin`                                         | `GET /api/v1/admin/users/:id/dossier`                                     | View verified credentials, booking stats, audit events, assign roles (super_admin)  | Skeleton loader, 404 Not Found, audited action buttons            |    **Existing**    |
| **4**  | `/dashboard/admin/verification`   | Tutor Verification & Document Review Queue      | `admin`, `super_admin`, `compliance_reviewer`                  | `GET /api/v1/admin/tutors/pending`                                        | Approve tier, reject tier with notes, inspect identity/education evidence           | Empty queue celebration card, document preview modal              |    **Existing**    |
| **5**  | `/dashboard/admin/organizations`  | Organizations & Institutional Agency Governance | `admin`, `super_admin`                                         | `GET /api/v1/admin/organizations`                                         | Review pending coaching centers, approve agency, suspend organization, view members | Filterable tabs, approve/suspend modal, pagination                | **NEW (Phase 09)** |
| **6**  | `/dashboard/admin/bookings`       | Bookings Oversight & Emergency Intervention     | `admin`, `super_admin`                                         | `GET /api/v1/admin/bookings`                                              | Search bookings, emergency cancellation, trigger refund request                     | Filter by student/tutor/status, cancellation justification dialog |    **Existing**    |
| **7**  | `/dashboard/admin/finance`        | Financial Health, Commission Rates & Ledger     | `admin`, `super_admin`                                         | `GET /api/v1/admin/reconciliation`, `GET /api/v1/analytics/financials`    | Inspect double-entry balance, audit trial balance, view escrow totals               | Ledger discrepancy alert, currency formatting                     |    **Existing**    |
| **8**  | `/dashboard/admin/disputes`       | Booking Disputes & Support Triage Queue         | `admin`, `super_admin`, `support_agent`                        | `GET /api/v1/admin/support-tickets`, `GET /api/v1/disputes`               | Assign ticket, update ticket status, review dispute evidence, resolve ticket        | Assigned filter, status filter, resolution note form              |    **Existing**    |
| **9**  | `/dashboard/admin/analytics`      | Advanced Analytics & Reporting Hub              | `admin`, `super_admin`                                         | `GET /api/v1/analytics/overview`, `GET /api/v1/admin/reports/export`      | Date-range filters, cohort retention graphs, CSV report export                      | Date picker, interactive charts, formula-safe download            |    **Enhanced**    |
| **10** | `/dashboard/admin/audit-logs`     | Immutable Audit Logs Stream                     | `admin`, `super_admin`                                         | `GET /api/v1/admin/audit-logs`                                            | Filter by actor, resource, action, date range; view sanitized metadata              | Paginated table, PII-redacted chips, details drawer               |    **Existing**    |
| **11** | `/dashboard/admin/settings`       | Platform Business Configuration Hub             | `admin` (view), `super_admin` (edit)                           | `GET /api/v1/admin/settings`, `PUT /api/v1/admin/settings/:key`           | Update commission rate, cancellation window, trial hours                            | Read-only state for admin, confirmation dialog for super_admin    |    **Existing**    |
| **12** | `/dashboard/admin/settings/flags` | Feature Flags & Canary Deployment Toggles       | `admin` (view), `super_admin` (edit)                           | `GET /api/v1/admin/feature-flags`, `PUT /api/v1/admin/feature-flags/:key` | Toggle maintenance mode, instant matching, strict PNR                               | Live toggle switch, canary rules JSON editor                      |    **Existing**    |
| **13** | `/dashboard/organization`         | Organization Owner & Staff Hub                  | `organization_owner`, `organization_staff`                     | `GET /api/v1/organizations/:id`                                           | View agency profile, member count, affiliated tutors                                | Loading skeleton, empty state for new organizations               | **NEW (Phase 09)** |
| **14** | `/dashboard/organization/members` | Organization Member & Staff Management          | `organization_owner`, `organization_staff`                     | `GET /api/v1/organizations/:id/members`                                   | Invite tutor/staff, remove member, transfer ownership (owner only)                  | Member table, invitation modal, role selector                     | **NEW (Phase 09)** |

---

## 2. Navigation Architecture & Role Scoping

Navigation links are dynamically computed in `apps/web/src/lib/navigation.ts` (`navSectionsForRole`):

1. **Platform Administrators (`admin`, `super_admin`)**:
   - Master Console (`/dashboard/admin`)
   - Platform Analytics (`/dashboard/admin/analytics`)
   - Tutor Verification (`/dashboard/admin/verification`)
   - Organizations (`/dashboard/admin/organizations`)
   - Tuition Bookings (`/dashboard/admin/bookings`)
   - Users & Staff Hub (`/dashboard/admin/users`)
   - Finance & Payouts (`/dashboard/admin/finance`)
   - Support & Disputes (`/dashboard/admin/disputes`)
   - Audit Logs (`/dashboard/admin/audit-logs`)
   - Platform Settings (`/dashboard/admin/settings`)
2. **Support Agents (`support_agent`)**:
   - Support Console (`/dashboard/admin/disputes`)
   - Users Directory (Read-only, for verification of ticket submitters)
3. **Compliance Reviewers (`compliance_reviewer`)**:
   - Compliance Console (`/dashboard/admin/verification`)
   - Confidential Safeguarding Reports (`/safety-reports`)
4. **Organization Users (`organization_owner`, `organization_staff`)**:
   - Organization Hub (`/dashboard/organization`)
   - Members & Tutors (`/dashboard/organization/members`)
   - Organization Profile & Settings (`/dashboard/organization/settings`)

---

## 3. UI Quality & Error Handling Contract

- **Zero Fabricated Data**: If an API endpoint fails, display a clear, accessible error card with a retry button. Never render synthetic fallback metrics.
- **Debounced Search**: Search input on Users, Bookings, and Organizations tables is debounced by 350ms to minimize backend pressure.
- **Pagination**: Offset/limit pagination with explicit total record counts and page size limits (default 20, max 100).
- **Destructive Action Guards**: Suspension, role updates, organization status changes, and emergency cancellations require two-step confirmation dialogs with mandatory justification text.
