# Phase 08: Communication & Real-Time Messaging System — Implementation Plan

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08  
**Date:** October 20, 2026  
**Status:** In Progress

---

## 1. Architectural Objectives

1. **Enterprise Real-Time WebSocket Infrastructure**:
   - Deliver sub-100ms real-time messaging using Socket.IO rooms.
   - Support active thread subscriptions, live message arrival, typing indicators, and immediate read receipt synchronization.
2. **Child Safety, Minor Protection & Statutory Compliance**:
   - Protect minors under _The Children Act 2013_ (শিশু আইন ২০১৩).
   - Guardian oversight mechanism allowing guardians of minor students to monitor tuition conversations transparently.
3. **Escrow Protection & Anti-Circumvention Content Moderation**:
   - Normalize and inspect all messages before persistence.
   - Detect and redact Bangladeshi phone numbers across ASCII digits, Bengali numerals (`০-৯`), spaced/dotted obfuscations, and spelled-out numerals.
   - Detect and redact off-platform payment solicitations (bKash personal, Nagad personal, Rocket, Upay, direct cash handover).
   - Detect and redact social media bypasses (WhatsApp direct links `wa.me`, Telegram `t.me`, Imo, Facebook, Discord).
4. **Learning Materials & File Attachments**:
   - Allow students and tutors to share homework questions, handwritten notes, diagrams, and PDFs.
   - Restrict to allowed MIME types (PDF, PNG, JPEG) and max file sizes (10MB) via `FilesService` integration.
5. **Centralized Conversations Hub**:
   - Provide a unified Conversations Inbox view (`GET /api/v1/bookings/conversations/inbox` and `/dashboard/messages`) showing all ongoing tuition threads, recent messages, and unread counters.

---

## 2. Work Breakdown Structure (WBS)

```
Phase 08: Communication & Real-Time Messaging System
├── 1. Database & Migrations
│   ├── Migration 026: Add attachment_asset_ids and metadata to booking_messages
│   └── Apply migration & update TypeORM BookingMessageEntity
│
├── 2. Contracts (@ogroniedu/contracts)
│   ├── Messaging schemas (SendMessageDto, ConversationInboxItem, SocketChatEvents)
│   └── Bilingual notification templates & translation dictionaries
│
├── 3. Backend Real-Time Infrastructure (@ogroniedu/api)
│   ├── ChatGateway: Socket.IO gateway for real-time thread rooms, typing, and read receipts
│   ├── Enhanced ContentSafetyService / Sanitizer (Bengali digits, obfuscations, social bypass)
│   ├── BookingMessagesService: attach attachments, broadcast live events, conversations inbox
│   └── BookingMessagesController: inbox endpoint, attachment handling
│
├── 4. Frontend Experience (@ogroniedu/web)
│   ├── RTK Query hooks for conversations inbox and attachments
│   ├── Real-time socket event integration in useBookingChat (live messages, typing, read receipts)
│   ├── Upgraded BookingChatView (attachment display, typing indicator, file upload button)
│   ├── Conversations Inbox Page (/dashboard/messages) with split-pane thread selector
│   └── 100% Bilingual dictionary key parity (en.json & bn.json)
│
├── 5. Verification & Testing
│   ├── Unit tests for content moderation & anti-circumvention normalizer
│   ├── Gateway integration tests for room authentication, typing, and read receipts
│   ├── Security tests: ABAC boundary, non-participant rejection, guardian oversight
│   └── Browser inspection with Chrome DevTools MCP
│
└── 6. Canonical Documentation
    ├── AUDIT.md
    ├── IMPLEMENTATION_PLAN.md
    ├── REALTIME_CHAT_ARCHITECTURE.md
    ├── CONTENT_SAFETY_MODERATION.md
    ├── GUARDIAN_OVERSIGHT_POLICY.md
    ├── ATTACHMENTS_AND_FILE_POLICY.md
    ├── TEST_PLAN.md
    └── IMPLEMENTATION_REPORT.md
```

---

## 3. Technology Stack & Dependencies

- **WebSocket Engine:** NestJS WebSockets with Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` v4.8+).
- **Client Socket:** `socket.io-client` v4.8.4.
- **ORM / Database:** PostgreSQL 18 with TypeORM.
- **Frontend Framework:** Next.js 16.4.0 (Turbopack) with Redux Toolkit & RTK Query.
- **Design System:** Tailwind CSS, Radix UI, Lucide React icons.
