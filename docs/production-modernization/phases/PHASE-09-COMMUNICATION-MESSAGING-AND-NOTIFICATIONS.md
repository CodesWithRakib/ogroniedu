# Phase 09 — Communication, Messaging & Notifications

**Phase ID:** `PHASE-09`  
**Phase Name:** Communication, Messaging & Notifications  
**Estimated Effort:** 1 Day (Day 4)  
**Status:** READY  
**Owner:** Real-Time Systems Engineer & Backend Lead

---

## 1. Objective and Business Justification

Harden the real-time communication stack powering student-tutor messaging, automated safety redaction, and multi-channel notifications (in-app, WebSocket, fallback SMS/Email). Prevent platform disintermediation (off-platform contact sharing) and guarantee real-time delivery.

---

## 2. Current-State Findings and Evidence

- WebSocket gateway: `NotificationGateway` (`src/modules/notifications/notification.gateway.ts`, 361 lines) handles room joins, typing indicators, read receipts.
- Booking chat service: `BookingMessagesService` (`src/modules/notifications/booking-messages.service.ts`, 576 lines) stores messages with cursor pagination and applies regex redaction for phone numbers, payment terms, and external URLs.
- In-app notification bell and preferences view operate in `features/notifications/`.

---

## 3. Exact Scope

1. Verify Socket.IO gateway authentication and room authorization (`user:<userId>`, `booking_chat:<bookingId>`).
2. Verify automated content safety redaction: mask Bangladeshi phone numbers (`01[3-9]\d{8}`), payment trigger words (e.g. "bKash personal", "direct cash"), and unsafe links.
3. Verify cursor pagination for message history (`nextCursor`, ascending order).
4. Verify user notification channel preferences (in-app, SMS, email).
5. Verify dead expression removal in `booking-messages.service.ts:221`.

---

## 4. Explicit Exclusions

- Live external SMS gateway delivery (mocked via outbox event log for MVP).

---

## 5. Prerequisite Phases

- `PHASE-02-FRONTEND-MODULARIZATION-PAGES.md`
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`
- `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`

---

## 6. Tasks and Unique Task IDs

- `COM-001`: Verify Socket.IO authentication and unauthorized connection rejection.
- `COM-002`: Verify booking chat cursor pagination, read receipts, and attachments.
- `COM-003`: Verify automated phone and payment keyword redaction in chat messages.
- `COM-004`: Verify in-app notification center, unread count badge, and preference updates.

---

## 7. Actual Affected Files and Modules

- `apps/web/src/features/messaging/**/*`
- `apps/web/src/features/notifications/**/*`
- `apps/api/src/modules/notifications/**/*`

---

## 8. Files Created, Split, Moved, or Removed

- Modified: `booking-messages.service.ts`, `notification.gateway.ts`, test specs.

---

## 9. Frontend Work

- Ensure chat view renders redacted messages with appropriate tooltip explanation.
- Ensure notification bell sounds trigger only when user preference allows audio.

---

## 10. Backend Work

- Verify room membership checks reject non-participants with 403 / socket warning.

---

## 11. Database and Migration Work

- Verify migration 026 (`realtime_messaging_and_attachments.sql`).

---

## 12. Event-Driven Architecture Work

- Emit `message.sent`, `message.read`, `notification.dispatched`.

---

## 13. Security Requirements

- BOLA check: Users cannot join or listen to booking chat rooms for bookings they do not own.

---

## 14. Unit Test Requirements

- `apps/api/test/communication-notifications-phase09.spec.ts` passes 15/15 tests.
- `apps/api/test/notification.socket.spec.ts` passes 5/5 tests.
- `apps/api/test/content-safety.util.spec.ts` passes 12/12 tests.
- `apps/web/test/communication-notifications-phase09.spec.ts` passes 6/6 tests.

---

## 15. Integration Test Requirements

- Socket connection, message broadcast, and read receipt roundtrip verified.

---

## 16. Browser Automation and E2E Scenarios

- Playwright E2E verifies booking chat message delivery and UI rendering.

---

## 17. Required Commands

```pwsh
pnpm --filter @ogroniedu/api test test/communication-notifications-phase09.spec.ts
pnpm --filter @ogroniedu/api test test/content-safety.util.spec.ts
pnpm --filter @ogroniedu/web test test/communication-notifications-phase09.spec.ts
```

---

## 18. Acceptance Criteria

1. Socket connection rejects unauthenticated tokens.
2. Messages with phone numbers are automatically redacted.
3. Read receipts update accurately in real time.
4. Notification preferences persist and control dispatch behavior.

---

## 19. Failure and Rollback Considerations

- If WebSocket disconnected, frontend falls back to HTTP REST polling.

---

## 20. Definition of Done

- Real-time communications verified, content safety redaction passing, tests green.

---

## 21. Expected Evidence

- Test logs for `communication-notifications-phase09.spec.ts` and `content-safety.util.spec.ts`.

---

## 22. Known Risks and Blockers

- None.

---

## 23. Estimated Effort

- 1 Day.

---

## 24. Next-Phase Dependencies

- Unblocks `PHASE-10-ROLE-DASHBOARDS-AND-ADMIN-GOVERNANCE.md` and `PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md`.
