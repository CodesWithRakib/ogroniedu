# OgroniEdu — Release Regression Verification Checklist

**Document Reference:** `docs/REGRESSION_CHECKLIST.md`  
**Last Updated:** 2026-10-22  
**Status:** Mandatory Release Quality Protocol  
**Enforcement:** Must be executed and verified before any staging/production release or phase sign-off.

---

## 1. Pre-Deployment & Environment Verification

- [ ] **Environment Variables:** Verify all required variables are set and non-empty in `.env` (JWT secrets, DB connection string, Redis URL).
- [ ] **Database Migrations:** Run `pnpm --filter @ogroniedu/api migration:run` and verify all migrations apply without error (`030_product_analytics_events.sql` or latest).
- [ ] **Build Validation:** Run `pnpm build` across monorepo and ensure zero compilation or bundle errors.
- [ ] **Typecheck Validation:** Run `pnpm typecheck` and verify 0 TypeScript diagnostics.
- [ ] **Linter Validation:** Run `pnpm lint` and verify 0 ESLint errors/warnings.
- [ ] **Automated Test Suite:** Run `pnpm test` and verify 100% pass rate (baseline: 1,175 / 1,175 tests).
- [ ] **Smoke Test Probes:** Execute `node scripts/smoke-test.mjs --target local` and confirm 8/8 probes green.

---

## 2. Core Business Journeys Verification

### 2.1 Authentication & Profile Lifecycle
- [ ] **Phone & Email Login:** Test user login via email/password and phone OTP.
- [ ] **Password Reset:** Request password reset link; verify single-use 15m expiration.
- [ ] **Token Refresh:** Confirm expired access token is automatically refreshed via HTTP-only cookie without user logout.
- [ ] **Role Protection:** Verify student cannot access `/dashboard/admin/*` or `/dashboard/tutor/*` routes.
- [ ] **Onboarding Stepper:** Verify newly registered user is routed through role-specific onboarding wizard.

### 2.2 Guardian-Student Relationship & Minor Consent
- [ ] **Pairing Flow:** Guardian generates pairing code; student accepts pairing code.
- [ ] **Minor Booking Guard:** Student under 18 cannot complete booking without guardian approval.
- [ ] **Parental Supervision:** Guardian dashboard accurately reflects linked child's attendance and grade reports.
- [ ] **Unlink Guard:** System prevents unlinking guardian if child has an active/unsettled booking.

### 2.3 Tutor Onboarding & Credential Verification
- [ ] **Dossier Upload:** Tutor can upload NID, university degree, and police clearance documents.
- [ ] **Admin Triage Queue:** Admin can view submitted files, approve verification tier, or reject with reason.
- [ ] **Public Badge Rendering:** Verified tutor displays `Verified ID` or `Academic Verified` badge in public directory.
- [ ] **Availability Matrix:** Tutor can configure weekly recurring schedule slots and blackout dates.

### 2.4 Search, Discovery & Booking Concurrency
- [ ] **Faceted Search:** Filter tutors by Subject, Class/Curriculum, District, and Hourly Rate.
- [ ] **Booking Creation:** Student/Guardian submits booking request for specific timetable slots.
- [ ] **Concurrency Lock:** Attempting to book an overlapping slot for the same tutor immediately returns error.
- [ ] **Auto-Expiry:** Unanswered booking requests expire after 48 hours; unpaid bookings expire after 24 hours.

### 2.5 Digital Classroom & Study Room
- [ ] **Session Check-In:** Student and tutor enter session room; attendance timestamp is persisted.
- [ ] **Whiteboard Synchronization:** Collaborative drawing strokes render on both screens in real-time (<80ms).
- [ ] **Tool Palette:** Pen, highlighter, eraser, text, rectangle, circle, and clear board tools function correctly.
- [ ] **Session Wrap-Up:** Tutor signs off, logs session summary notes, and triggers 24-hour dispute window.

### 2.6 Escrow Payments, Disputes & Ledger Balance
- [ ] **Escrow Hold:** Payment via bKash/SSLCommerz creates `ESCROW_HOLD` ledger entry.
- [ ] **Milestone Release:** Completed session without dispute releases 92% to tutor and 8% to platform commission.
- [ ] **Dispute Filing:** Guardian can submit dispute within 24 hours; freezes milestone release.
- [ ] **Replacement Guarantee:** Guardian can request replacement tutor; unspent escrow transfers seamlessly.
- [ ] **Ledger Invariant Proof:** Executing `SELECT SUM(debit) - SUM(credit) FROM ledger_entries` yields exactly 0.

### 2.7 Safeguarding & Emergency Intervention
- [ ] **Safety Report Submission:** User submits harassment/safety incident report.
- [ ] **Automated Protective Hold:** Tutor account is immediately placed on hold (`is_suspended = true`).
- [ ] **Operations Triage:** Compliance reviewer can inspect session chat logs, canvas history, and resolve report.
- [ ] **Chat Masking:** Direct messages containing phone numbers or WhatsApp links are flagged/masked.

---

## 3. UI, Responsive & Accessibility Checks

- [ ] **Full-Width Canvas:** Dashboard content utilizes full container width on wide/4K displays.
- [ ] **Gradient Buttons:** Action buttons harmonize with hero/tutor page gradient styling.
- [ ] **Shadcn Dialog Modals:** Confirmation and action modals use unified system styling, not dark/black defaults.
- [ ] **Mobile Viewport (375px - 414px):** Navigation hamburger drawer, collapsible search filters, and responsive tables.
- [ ] **Tablet Viewport (768px - 1024px):** Sidebar collapses to compact icon mode or drawer; layout maintains readability.
- [ ] **Language Toggle:** Switching between English (`en`) and Bengali (`bn-BD`) updates all visible UI strings.
- [ ] **Keyboard Navigation:** Tab navigation flows logically across forms, modal dialogs, and interactive buttons.

---

## 4. Operational & Observability Verification

- [ ] **Health Endpoints:**
  - `GET /api/health` -> HTTP 200 `{ status: "ok" }`
  - `GET /api/health/ready` -> HTTP 200 (DB & Redis connected)
  - `GET /api/health/live` -> HTTP 200
- [ ] **Audit Trail:** Every state-modifying action creates an immutable row in `audit_logs`.
- [ ] **Impersonation Guard:** Staff impersonation tokens expire after 15 minutes; payouts blocked during impersonation.
- [ ] **Error Handling:** API errors return standardized JSON envelopes (`statusCode`, `message`, `error`, `timestamp`).
- [ ] **Browser Console:** Zero unhandled errors or rejected promises in browser console during user journeys.
