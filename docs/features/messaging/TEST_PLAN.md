# Phase 08: Communication & Real-Time Messaging System — Test Plan & Quality Gates

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Status:** Approved & Implemented

---

## 1. Test Strategy Overview

The testing methodology for Phase 08 spans five rigorous verification layers:

1. **Unit Testing**: Pure functions, Bengali numeral normalization, content safety regex engines, and DTO validators.
2. **Service & Database Integration Testing**: Transactional message saving, outbox registration, cursor-based pagination, and relationship access control.
3. **Real-Time WebSocket Gateway Testing**: Socket handshake authentication, ABAC room authorization, typing events, and message broadcasting.
4. **Security & Anti-Circumvention Penetration Testing**: Deliberate evasion attempts using Bengali numerals, spaced digits, obfuscated payment terms, and cross-site scripting (XSS).
5. **End-to-End Headful Browser Testing**: Headful verification via Chrome DevTools MCP verifying visual rendering, split-pane navigation, typing bubbles, and live redactions.

---

## 2. Test Suite Breakdown & Test Files

| Layer           | Test File                                           | Target Module               | Scope & Objectives                                                                                                                                         | Test Count |
| :-------------- | :-------------------------------------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------: |
| **Unit**        | `apps/api/test/content-safety.util.spec.ts`         | `content-safety.util.ts`    | Bengali digit normalizer, Bangladeshi mobile prefixes (013-019), bKash/Nagad solicitations, social bypass links, clean messages.                           |     12     |
| **Service**     | `apps/api/test/booking-messages.spec.ts`            | `BookingMessagesService`    | Send message, redaction tagging, participant verification, guardian access, cursor pagination, read receipt updates, inbox aggregation.                    |     18     |
| **Controller**  | `apps/api/test/booking-messages.controller.spec.ts` | `BookingMessagesController` | Legacy endpoints, HTTP status codes, error wrapping.                                                                                                       |     3      |
| **Controller**  | `apps/api/test/conversations.controller.spec.ts`    | `ConversationsController`   | Centralized inbox endpoint `GET /conversations`, `POST /conversations/:id/messages`, `POST /conversations/:id/read-all`.                                   |     3      |
| **Gateway**     | `apps/api/test/notification.socket.spec.ts`         | `NotificationGateway`       | Socket JWT authentication, room joining, typing indicator emission, message broadcasting.                                                                  |     5      |
| **Outbox**      | `apps/api/test/notification.service.spec.ts`        | `NotificationService`       | Notification creation, outbox event generation, preference dispatching.                                                                                    |     11     |
| **RBAC / ABAC** | `apps/api/test/messaging-nine-role-access.spec.ts`  | Authorization Matrix        | Explicit validation across all 9 canonical roles (student, guardian, tutor, admin, super_admin, support_agent, compliance_reviewer, org_owner, org_staff). |     9      |
| **Frontend**    | `apps/web` Test Suites (Jest/RTL)                   | Web Components              | 35 component and utility test suites covering state mappers, RTK Query, and UI rendering.                                                                  |    219     |

---

## 3. Security Penetration & Abuse Test Matrix

| #     | Attack / Abuse Vector                 | Injected Payload                                                    | Expected System Action                                                                                        |
| :---- | :------------------------------------ | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------ |
| **1** | **Bengali Digits Phone Evasion**      | `"আমার সাথে ০১৭৯৮৭৬৫৪৩২ নম্বরে যোগাযোগ করুন"`                       | Normalized to ASCII, detected as mobile number, redacted to `[REDACTED CONTACT NUMBER]`. `is_redacted: true`. |
| **2** | **Spaced & Obfuscated Digits**        | `"call me on 0 1 7 1 2 3 4 5 6 7 8"`                                | Whitespace stripped, detected as 11-digit mobile number, redacted to `[REDACTED CONTACT NUMBER]`.             |
| **3** | **Bangla Payment Evasion**            | `"বিকাশে টাকা পাঠিয়ে দিন ৫০% ডিসকাউন্ট পাবেন"`                     | Keyword `বিকাশ` / `বিকাশে` matched, redacted to `[REDACTED PAYMENT SOLICITATION]`.                            |
| **4** | **English bKash/Nagad Bypass**        | `"send advance via bkash or nogod personal"`                        | Keywords matched, redacted to `[REDACTED PAYMENT SOLICITATION]`.                                              |
| **5** | **Social Link Circumvention**         | `"add me on whatsapp wa.me/8801712345678 or t.me/tutor"`            | Redacted to `[REDACTED CONTACT NUMBER]`.                                                                      |
| **6** | **XSS Injection in Chat Bubble**      | `<script>alert('pwned')</script>` or `<img src=x onerror=alert(1)>` | Sanitized by React DOM rendering; escaped as inert text.                                                      |
| **7** | **Directory Traversal in Attachment** | File name `../../../../etc/passwd`                                  | Ignored. Server generates secure random UUID v4 key `attachments/{bookingId}/{uuid}.pdf`.                     |
| **8** | **Unauthorized Socket Room Join**     | Student joins `booking_chat:foreign-booking-id`                     | Gateway ABAC lookup fails; emits `chat_error`, does not join room.                                            |

---

## 4. End-to-End Browser Verification Protocol

Automated testing using Chrome DevTools MCP on `http://localhost:5000`:

1. **Inbox Navigation**:
   - Navigate to `/en/messages`.
   - Verify sidebar lists active bookings with partner avatar, subject title, and unread badge.
2. **Chat Rendering**:
   - Select conversation with Dr. Nusrat Jahan.
   - Verify previous message history renders cleanly in chat panel.
3. **Live Redaction Verification**:
   - Send test string `"Call me at 01712345678 or bKash me"`.
   - Verify message renders with `[REDACTED CONTACT NUMBER]` and `[REDACTED PAYMENT SOLICITATION]`.
   - Verify amber safety warning pill: _"Automated Safety Notice: Contact or payment information was redacted."_
4. **Typing & Read Receipt Check**:
   - Verify typing indicator disappears when typing stops.
   - Verify message tick marks render correctly.
