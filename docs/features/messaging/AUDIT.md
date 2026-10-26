# Phase 08: Communication & Real-Time Messaging System — Audit

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Auditor:** Senior Full-Stack Engineer, Real-Time Systems Architect, Application Security Engineer

---

## 1. Executive Summary & Purpose

OgroniEdu is a premier tutoring and learning management platform designed for the educational ecosystem of Bangladesh. Reliable, secure, participant-scoped, and child-safe communication is paramount. Educational communication in this context presents two fundamental requirements:

1. **Child Safety and Safeguarding**: Under The Children Act 2013 (_শিশু আইন ২০১৩_) and platform safety policies (established in Phase 07), communications involving minor students must be transparent to authorized guardians, audit-logged, and protected against harassment, abuse, and grooming.
2. **Platform Financial Protection & Anti-Circumvention**: Disintermediation—where participants attempt to exchange contact information to arrange off-platform cash, bKash, or Nagad transactions—deprives the platform of escrow protections, breaks dispute guarantees, and exposes users to fraud.

This audit reviews the monorepo architecture, existing database schemas, real-time Socket.IO infrastructure, authorization layers, file storage, and identifies all gaps that must be resolved in Phase 08.

---

## 2. Monorepo & Technology Stack Inspection

| Layer                     | Technology                 | Version                        | Location / Package                                           |
| :------------------------ | :------------------------- | :----------------------------- | :----------------------------------------------------------- |
| **Monorepo Manager**      | Turborepo                  | 2.5.8                          | Root `turbo.json`                                            |
| **Package Manager**       | pnpm                       | 9.x                            | `pnpm-workspace.yaml`                                        |
| **Backend Framework**     | NestJS                     | 10.x                           | `apps/api`                                                   |
| **Database**              | PostgreSQL                 | 18 (Alpine/Debian)             | Port 5432, DB `ogroniedu_dev`                                |
| **ORM / Query Layer**     | TypeORM                    | 0.3.x                          | `apps/api/src/database`                                      |
| **WebSocket / Real-Time** | Socket.IO                  | 4.x                            | `apps/api/src/modules/notifications/notification.gateway.ts` |
| **Frontend Framework**    | Next.js                    | 16.4.0 (Turbopack, App Router) | `apps/web`                                                   |
| **State Management**      | Redux Toolkit (RTK Query)  | 2.x                            | `apps/web/src/store`                                         |
| **Styling**               | Tailwind CSS v4 + Radix UI | Latest                         | `apps/web/src/components/ui`                                 |
| **Shared Contracts**      | TypeScript / Zod           | 3.23.x                         | `packages/contracts`                                         |

---

## 3. Existing Messaging & Real-Time Infrastructure

### 3.1 Existing Database Architecture

- **Table: `booking_messages`** (established initially in `005_notifications_and_communication.sql`):
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE`
  - `sender_user_id UUID NOT NULL REFERENCES users(id)`
  - `recipient_user_id UUID NOT NULL REFERENCES users(id)`
  - `content TEXT NOT NULL`
  - `is_redacted BOOLEAN NOT NULL DEFAULT false`
  - `redaction_reason TEXT`
  - `read_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Indexes: `idx_booking_messages_thread (booking_id, created_at ASC)` and `idx_booking_messages_unread (recipient_user_id, read_at) WHERE read_at IS NULL`.

### 3.2 Existing WebSocket Gateway

- `NotificationGateway` (`apps/api/src/modules/notifications/notification.gateway.ts`) operates on namespace `/notifications`.
- Authenticates incoming socket connections via JWT Bearer token extracted from `handshake.auth.token` or `handshake.headers.authorization`.
- On successful handshake, automatically joins the client to room `user:${userId}`.
- Emits events `notification.new` and `unread_count_update`.
- **Finding:** The gateway lacked chat-specific room joining (`booking_chat:${bookingId}`), room-level access authorization, typing indicators, and real-time read receipt broadcasts.

### 3.3 Existing Services and Controllers

- `BookingMessagesService` (`apps/api/src/modules/notifications/booking-messages.service.ts`):
  - Provided `sendMessage` with basic ASCII phone regex and keyword checks.
  - Provided `getMessages` with cursor-based pagination.
  - Emitted notification outbox event `booking.message_sent`.
- `BookingMessagesController` exposed `POST /api/v1/learning/bookings/:id/messages` and `GET /api/v1/learning/bookings/:id/messages`.
- **Finding:** Chat endpoints were buried under `/learning/bookings/:id/messages` rather than a unified conversation hub (`/api/v1/conversations`). Furthermore, there was no bulk mark-read endpoint, causing clients to make per-message PATCH calls.

### 3.4 Existing Guardian & Child Safeguarding Controls

- `GuardianAccessService` (`apps/api/src/modules/guardians/guardian-access.service.ts`):
  - Maps active guardian-student relationships via `guardian_students` join table.
  - Methods: `findActiveStudentIds(guardianId)` and `findActiveGuardianIds(studentId)`.
- **Finding:** While the backend permitted guardians to query booking messages for their linked children, the frontend lacked real-time guardian oversight indicators, and guardians lacked a dedicated view to monitor messages transparently.

---

## 4. Architectural & Safety Gap Analysis

| Category                                  | Prior State                                                                                   | Phase 08 Requirement                                                                                                          | Risk / Impact                                                                                 |
| :---------------------------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **Real-Time Delivery**                    | Polling / manual refresh over REST. Sockets were only used for generic notifications.         | Dedicated Socket.IO room `booking_chat:${bookingId}` delivering messages instantly to both participants.                      | High latency, poor UX, out-of-sync message order.                                             |
| **Typing Indicators**                     | Completely absent.                                                                            | Transient `chat_typing` socket event broadcast as `user_typing` with a 2.5s client-side debounce.                             | Users cannot tell if the other party is actively responding.                                  |
| **Read Receipts**                         | Asynchronous HTTP PATCH per message; no real-time notification to the sender.                 | Socket event `messages_read` broadcast to `booking_chat:${bookingId}` updating double-check icons in real-time.               | Senders unaware if their messages have been seen.                                             |
| **Anti-Circumvention (Bengali Numerals)** | Standard regex only matched ASCII digits `0-9`.                                               | Normalizer mapping Bengali digits (`০-৯` -> `0-9`) prior to inspection; whitespace-tolerant phone matching.                   | **CRITICAL SECURITY RISK:** Users easily bypassed filters by writing `০১৭১...` or `০ ১ ৭...`. |
| **Anti-Circumvention (Cash & Socials)**   | Partial keywords (`bkash`, `nagad`). Missed spaced words and shortlinks.                      | Redaction of cash solicitation (`cash`, `nogod`, `rocket`, `direct pay`) and social bypass links (`wa.me`, `t.me`, `fb.com`). | **CRITICAL FINANCIAL RISK:** Escrow disintermediation and platform fee avoidance.             |
| **Attachments Support**                   | Only `content TEXT` existed. No attachment metadata or foreign keys.                          | Migration `026` adding `attachment_asset_ids UUID[]` and `metadata JSONB` supporting PDFs and images up to 10MB.              | Tutors and students could not share homework, lecture slides, or exercise sheets.             |
| **Conversations Hub**                     | No centralized inbox. Chat was only accessible deep within an individual booking detail page. | Centralized hub (`/api/v1/conversations` and `/[locale]/messages`) with responsive split-pane inbox and unread badges.        | Friction in navigating multiple ongoing tutoring engagements.                                 |
| **Role Authorization**                    | Coarse 3-role check (student, tutor, admin).                                                  | Fine-grained Attribute-Based Access Control (ABAC) covering all 9 canonical platform roles.                                   | Authorization leaks or improper blocks for support and compliance personnel.                  |

---

## 5. Audit Conclusions & Recommendations

1. **Re-use Existing Socket.IO Infrastructure**: Rather than deploying a separate WebSocket gateway on a distinct port (which would complicate firewall rules and require duplicate authentication handshakes), extend `NotificationGateway` on `/notifications` with dedicated chat room listeners.
2. **Bengali Digit Normalization**: Implement a pure functional utility `inspectAndRedactContent` that normalizes Bengali digits to ASCII before applying regex rules for Bangladeshi phone numbers (`013-019`), social handles, and payment methods.
3. **Database Schema Enhancement**: Add `attachment_asset_ids UUID[]` and `metadata JSONB` via migration `026_realtime_messaging_and_attachments.sql`.
4. **Preserve Legacy Endpoints**: Retain `/api/v1/learning/bookings/:id/messages` for backward compatibility while introducing `/api/v1/conversations` for modern multi-thread inbox navigation.
5. **Enforce 9-Role Access Control**: Explicitly document and test permissions for `student`, `guardian`, `tutor`, `admin`, `super_admin`, `support_agent`, `compliance_reviewer`, `organization_owner`, and `organization_staff`.
