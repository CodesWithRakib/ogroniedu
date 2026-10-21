# Phase 08: Communication & Real-Time Messaging System — Audit

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08  
**Date:** October 20, 2026  
**Auditor:** Senior Full-Stack Engineer, Real-Time Systems Architect, Application Security Engineer  

---

## 1. Executive Summary

OgroniEdu requires a real-time, participant-scoped, child-safe messaging and communication infrastructure connecting students, tutors, guardians, and support staff. Communication in an educational setting in Bangladesh involves sensitive child safety mandates (The Children Act 2013 / শিশু আইন ২০১৩) and platform financial protections (preventing disintermediation and direct off-platform cash transactions that bypass escrow).

This audit reviews the current communication implementation, evaluates architectural gaps, and specifies the technical plan for Phase 08.

---

## 2. Baseline Architecture & Current State

### 2.1 Existing Database Schema
- **`booking_messages` Table** (created in `005_notifications_and_communication.sql`):
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

### 2.2 Existing Backend Services & Gateways
- **`BookingMessagesService`** (`apps/api/src/modules/notifications/booking-messages.service.ts`):
  - Provides `sendMessage` with basic content safety regex (Bangladeshi phone numbers, bKash/Nagad solicitations, external links).
  - Provides `getMessages` with cursor-based pagination (oldest→newest display order).
  - Enforces participant-scoped ABAC (student, requester guardian, tutor, admin).
  - Emits notification outbox event and asynchronous notification dispatch (`chat.message`).
- **`NotificationGateway`** (`apps/api/src/modules/notifications/notification.gateway.ts`):
  - Socket.IO gateway on namespace `/notifications`.
  - Authenticates connection via JWT Bearer token and joins `user:${userId}` room.
  - Broadcasts notifications and unread counters.

### 2.3 Existing Frontend Components
- **`BookingChatView`** (`apps/web/src/components/notifications/BookingChatView.tsx`):
  - UI presentation of chat thread with message bubbles, redaction warning badges, read checkmarks, and message input form.
- **`BookingChatContainer`** (`apps/web/src/features/messaging/components/bookingChatContainer.tsx`):
  - Wrapper providing cursor history pagination ("Load older messages").
- **`useBookingChat`** (`apps/web/src/features/messaging/hooks/use-booking-chat.ts`):
  - Hook backed by RTK Query cursor requests.

---

## 3. Gap Analysis for Phase 08

| Area | Current Behavior | Required Phase 08 Behavior | Severity |
| :--- | :--- | :--- | :--- |
| **Real-Time Push in Active Chat** | REST polling / manual refetch only. No live broadcast to open thread. | Socket.IO room `booking_chat:${bookingId}` with immediate message broadcast upon send. | **CRITICAL** |
| **Typing Indicators** | Not implemented. | Real-time `chat.typing` events broadcasting sender typing state with debouncing. | **HIGH** |
| **Live Read Receipts** | Read status only updated via HTTP PATCH; sender does not see live checkmark update. | Socket.IO event `chat.read_receipt` broadcasting read status to open room. | **HIGH** |
| **Learning Material Attachments** | Text only (`content TEXT`). | Support for verified file attachments (`attachment_asset_ids` / metadata) for homework, notes, PDFs, images. | **HIGH** |
| **Advanced Anti-Circumvention** | Standard regex misses Bengali numerals (`০১৭১...`), spaced digits (`0 1 7...`), and social apps (Telegram, WhatsApp, IMO). | Comprehensive regex and heuristic filters covering Bengali numerals, spelled-out digits, social handles, and off-platform cash. | **CRITICAL** |
| **Centralized Messages Inbox** | Chat only accessible per individual booking page (`/bookings/[id]`). | Centralized inbox (`/dashboard/messages`) listing all active conversation threads with unread counts and recent snippet. | **HIGH** |
| **Guardian Live Oversight** | Guardians get notified via general notification, but no dedicated oversight mode in the live chat UI. | Guardian badge in thread, real-time message stream for minor's guardian, and transparent oversight indicator. | **CRITICAL** |

---

## 4. Remediation & Action Plan

1. **Database Migration (`026_realtime_messaging_and_attachments.sql`)**:
   - Add `attachment_asset_ids UUID[] DEFAULT '{}'` to `booking_messages`.
   - Add `metadata JSONB DEFAULT '{}'` to `booking_messages` (for system notices, message edit history if applicable).
2. **Real-Time Chat Gateway (`ChatGateway` / `BookingMessagesGateway`)**:
   - Provide dedicated Socket.IO handlers for:
     - `join_thread` (ABAC authenticated).
     - `leave_thread`.
     - `typing` (`isTyping: boolean`, `bookingId`).
     - `mark_thread_read` (`bookingId`).
   - Broadcast `message_received`, `typing_indicator`, and `thread_read` to all active participants in `booking_chat:${bookingId}` room.
3. **Enhanced Content Safety & Redaction Engine**:
   - Normalizer converting Bengali numerals (`০-৯`) to ASCII digits before phone regex inspection.
   - Whitespace and punctuation stripped normalization to catch obfuscated phone numbers (`0 1 7 . . .`).
   - Social media circumvention detection (`wa.me`, `t.me`, `@username`, `facebook.com/`).
   - Structured security audit logging for all redactions.
4. **Conversations Inbox API**:
   - `GET /api/v1/bookings/conversations/inbox`: Aggregates active chats for the current user with unread counters, partner profile details, and last message snippet.
5. **Frontend Modernization**:
   - Real-time Socket.IO subscription in `use-booking-chat.ts`.
   - Visual typing indicator ("Tutor is typing...").
   - Instant double blue checkmark update on read receipt.
   - Attachment picker supporting images and PDFs with size validation.
   - Responsive Conversations Hub page (`/dashboard/messages`) with bilingual toggle support.
