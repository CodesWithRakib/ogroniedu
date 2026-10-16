# Phase 12 — Notifications and Communication Audit Report

**Date of Audit:** 2026-10-10 15:25:00 BST  
**Auditor:** Principal Communications Architect & Lead Platform Systems Engineer (AI Pair Programmer)  
**Project:** OgroniEdu — Enterprise Tutoring and Educational Management Platform (Bangladesh)  
**Repository Working Directory:** `c:\Sofof_tech_2026\ogroniedu`  
**Phase Objective:** Implement notification preferences, asynchronous transactional outbox worker with exponential backoff and error sanitization, participant-scoped ABAC messaging between students/guardians/tutors, content safety and contact redaction filters (child and escrow protection), SSLCOMMERZ sandbox gateway integration with live ngrok tunnel, and bilingual preferences/chat web UI.

---

## 1. Executive Summary

Phase 12 successfully delivered the notification preferences, asynchronous outbox dispatcher, and participant-scoped messaging subsystems in strict compliance with `prompts/12-notifications-and-communication.md`:

1. **Definition of Done Enforced — "Delivery failure cannot corrupt committed business state":**
   - Domain mutations (booking creation, acceptance, payment capture, milestone settlement) write domain entities and transactional `outbox_events` within the primary database transaction.
   - The asynchronous `OutboxWorkerService` processes outbox events out-of-band. Upstream push provider, SMS provider, or email delivery failures (e.g., HTTP 5xx, socket timeouts, TLS errors) **never** roll back or corrupt committed bookings, payments, or ledger journals.
   - Failed delivery attempts are caught, sanitized (redacting secrets/tokens), and marked with exponential backoff (`nextAttemptAt = now + 2^attempts * 1000ms`), advancing status from `pending` to `retrying` to `failed` upon reaching `maxAttempts = 5`.
2. **Granular Notification Preferences Across Categories & Channels:**
   - Introduced `notification_preferences` with composite unique constraint `(user_id, category, channel)`.
   - Users can toggle delivery preferences across categories (`academic`, `booking`, `payment`, `security`, `marketing`) and channels (`in_app`, `email`, `sms`, `push`).
   - Critical security notifications bypass preference suppressions.
   - Notification dispatch pipeline inspects user preferences in real time; disabled channels are logged and cleanly bypassed (`[SUPPRESSED BY USER PREFERENCE]`).
3. **Participant-Scoped ABAC Booking Messaging:**
   - Created `booking_messages` scoped strictly to participants of a confirmed booking (student, requester guardian, assigned tutor, and platform admin).
   - Any external user attempting to read or send messages is immediately rejected with `403 ForbiddenException`.
4. **Child Safety, Escrow Protection & Contact Redaction Filter:**
   - Implemented automated content sanitization regex filters in `BookingMessagesService`:
     - Bangladeshi phone numbers (`01[3-9]\d{8}`) redacted to `[REDACTED CONTACT NUMBER]` to safeguard minor safety and maintain escrow protection.
     - Direct off-platform payment solicitations (e.g., personal bKash/Nagad cashouts) redacted to `[REDACTED PAYMENT SOLICITATION]`.
     - Suspicious external URLs redacted to `[REDACTED EXTERNAL LINK]`.
   - Emits structured security audit logs (`communication.contact_redacted`) and dispatches proactive notifications to linked guardians when students receive messages.
5. **SSLCOMMERZ Sandbox Gateway & Ngrok Live Tunnel:**
   - Implemented `SslcommerzSandboxAdapter` utilizing registered Sandbox Store ID `ogron6ac9fcef6d321` and API/Secret `ogron6ac9fcef6d321@ssl`.
   - Integrated live ngrok HTTP tunnel daemon on port 4000:
     - Public URL: `https://undone-unsure-twisting.ngrok-free.dev`
     - IPN Webhook: `https://undone-unsure-twisting.ngrok-free.dev/api/v1/payments/webhook/sslcommerz`
   - Added `scripts/tunnel.js` and `pnpm run tunnel` execution command.
6. **Frontend UI & 100% Bilingual Parity:**
   - Created [`NotificationPreferencesView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/notifications/NotificationPreferencesView.tsx) for managing channel/category preferences.
   - Created [`BookingChatView`](file:///c:/Sofof_tech_2026/ogroniedu/apps/web/src/components/notifications/BookingChatView.tsx) with safety warning banner, real-time message bubble display, read status indicators, and redaction alerts.
   - Added 28 new localization keys across `apps/web/messages/en.json` and `apps/web/messages/bn.json` with 100% key parity.
7. **Automated Verification:**
   - 31 new tests authored across API, database, and web packages.
   - Full monorepo test suite stands at **305 total passed tests, 0 failures, 0 skipped**.

---

## 2. Requirement Traceability Matrix (Phase 12 Scope)

| Requirement ID | Requirement Name | Implementation Files | Test Suite | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-008** | **Centralized Real-Time Notifications & Communication** | `apps/api/src/modules/notifications/notification.service.ts`<br>`apps/api/src/modules/notifications/outbox-worker.service.ts`<br>`apps/api/src/modules/notifications/booking-messages.service.ts`<br>`apps/api/src/modules/notifications/notification.controller.ts`<br>`apps/api/src/modules/notifications/booking-messages.controller.ts`<br>`apps/web/src/components/notifications/NotificationPreferencesView.tsx`<br>`apps/web/src/components/notifications/BookingChatView.tsx` | `notification.service.spec.ts`<br>`notification.authorization.spec.ts`<br>`notification.socket.spec.ts`<br>`notification-preferences.spec.ts`<br>`outbox-worker.spec.ts`<br>`booking-messages.spec.ts`<br>`booking-messages.controller.spec.ts`<br>`communication.spec.ts`<br>`migration.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-001** | **No Cross-User Data Access (ABAC Scoping)** | `booking-messages.service.ts` (Participant scoping check: `studentUserId`, `requesterUserId`, `tutorUserId`) | `booking-messages.spec.ts`<br>`booking-messages.controller.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-002** | **Concurrency & Idempotency** | `OutboxWorkerService` exponential retry & transactional processing | `outbox-worker.spec.ts` | **COMPLETED & VERIFIED** |
| **NFR-004** | **Bilingual Bengali & English** | `apps/web/messages/en.json`<br>`apps/web/messages/bn.json` | `i18n.spec.ts`<br>`communication.spec.ts` | **COMPLETED & VERIFIED (100% Key Parity)** |

---

## 3. Database Schema & Migration Changes

Applied canonical migration `packages/database/src/migrations/005_notifications_and_communication.sql`:

```sql
-- 1. Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('academic', 'booking', 'payment', 'security', 'marketing')),
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_pref_cat_chan UNIQUE (user_id, category, channel)
);

-- 2. Booking Messages (Participant-scoped Communication)
CREATE TABLE IF NOT EXISTS booking_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    is_redacted BOOLEAN NOT NULL DEFAULT false,
    redaction_reason TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Backend Failure Isolation & Outbox Architecture

### 4.1 Invariant Assertion: Committed Business State Remains Intact

```
[Domain Action: Booking Confirmed / Payment Succeeded]
        │
        ▼ (Single DB Transaction)
[Commit Booking / Payment Entity] ─── AND ─── [Insert Outbox Event]
                                                       │
                                                       ▼ (Commit OK)
                                            [Committed State Saved]
                                                       │
                                   (Out-of-band asynchronous processing)
                                                       │
                                                       ▼
                                            [OutboxWorkerService]
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
                   [Upstream Success]                                      [Upstream Failure]
                           │                                                       │
                  Status -> 'processed'                                   [Catch & Sanitize Error]
                  Attempts Incremented                                             │
                                                                           Next Attempt -> 2^N * 1000ms
                                                                           Status -> 'retrying' / 'failed'
                                                                           ───────────────────────────────────
                                                                           * Committed State NEVER Rolled Back
```

Unit test assertion from [`apps/api/test/outbox-worker.spec.ts`](file:///c:/Sofof_tech_2026/ogroniedu/apps/api/test/outbox-worker.spec.ts):
- Upstream network errors and credential secrets are redacted from error logs.
- Event status advances to `retrying` with exponential backoff timestamp.
- Verified that committed transaction state is unaffected by notification delivery errors.

---

## 5. Child Safety & Content Redaction Architecture

To preserve child welfare, protect escrow guarantees, and prevent disintermediation:

1. **Bangladeshi Phone Number Regex:** `/(?:\+?880|0)?1[3-9]\d{8}\b/g` -> Replaced with `[REDACTED CONTACT NUMBER]`.
2. **Off-Platform Payment Solicitations Regex:** `/\b(?:send\s+money|send\s+cash|bkash\s+number|nagad\s+number|rocket\s+number|personal\s+number|টাকা\s+পাঠান|বিকাশ\s+নাম্বার|নগদ\s+নাম্বার)\b/gi` -> Replaced with `[REDACTED PAYMENT SOLICITATION]`.
3. **Suspicious External Links Regex:** `/(?:https?:\/\/|www\.)[^\s]+/gi` -> Replaced with `[REDACTED EXTERNAL LINK]`.
4. **Guardian Notification:** When a message is sent to a student participant, active linked guardians receive immediate notifications.

---

## 6. Monorepo Test Results Summary

| Package | Test Files Passed | Tests Passed | Failures | Status |
| :--- | :--- | :--- | :--- | :--- |
| `@ogroniedu/database` | 2 | 11 | 0 | **PASSED** |
| `@ogroniedu/contracts` | Built clean | Built clean | 0 | **PASSED** |
| `@ogroniedu/api` | 30 | 250 | 0 | **PASSED** |
| `@ogroniedu/web` | 11 | 44 | 0 | **PASSED** |
| **Total Monorepo Suite** | **43** | **305** | **0** | **100% GREEN** |

---

## 7. Next Phase Readiness

Phase 12 is fully verified and canonical documentation is intact. The codebase is prepared to transition to **Phase 13: Reviews and Trust & Safety Audit** (`prompts/13-reviews-ratings-and-moderation.md`).
