# OgroniEdu — System Architecture & Engineering Blueprint

**Date:** 2026-10-10  
**Pattern:** Modular Monolith with Shared Contracts & Event-Driven Outbox  
**Status:** Approved Architecture Standard

---

## 1. High-Level Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                      Next.js 16/15 App Router Frontend                    |   |
|   |   (Server Components, Client Islands, shadcn/ui, next-intl, RTK Query)    |   |
|   +-------------------------------------+-------------------------------------+   |
+-----------------------------------------|-----------------------------------------+
                                          | HTTPS / REST & WSS (Socket.IO)
+-----------------------------------------v-----------------------------------------+
|                               API GATEWAY & REVERSE PROXY                         |
|                                    (Nginx / Cloudflare)                           |
+-----------------------------------------|-----------------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                            MODULAR MONOLITH BACKEND (NestJS 12)                   |
|                                                                                   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|  |   IdentityModule   |  |   GuardianModule   |  |     TutorProfileModule     |   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|  |   BookingModule    |  |   LearningModule   |  |    Payment&LedgerModule    |   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|  | NotificationModule |  |  FileStorageModule |  |      AdminAuditModule      |   |
|  +--------------------+  +--------------------+  +----------------------------+   |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |               Transactional Outbox & Domain Event Dispatcher                |  |
|  +-----------------------------------------------------------------------------+  |
+--------------------------+-------------------------------+------------------------+
                           |                               |
                           v                               v
+--------------------------------------+      +-------------------------------------+
|         POSTGRESQL 18 DATABASE       |      |          REDIS 7 CACHE & QUEUE      |
|                                      |      |                                     |
|  - Users, Roles & Permissions        |      |  - Socket.IO Multi-Node Adapter     |
|  - Tutors, Subjects & Curricula      |      |  - Search Result Query Cache        |
|  - Bookings & Attendance             |      |  - BullMQ Background Job Queue      |
|  - Double-Entry Financial Ledger     |      |  - Rate Limiter Sliding Windows     |
|  - Outbox Events & Notifications     |      +-------------------------------------+
|  - GiST Schedule Exclusion Locks     |
+--------------------------------------+
```

---

## 2. Backend Module Structure & Boundaries

The NestJS backend (`apps/api`) is organized strictly into bounded contexts. Modules communicate through **explicit exported application services** or **domain events**, never by directly querying repositories of another module.

### Core Modules:

1. **`AuthModule` & `UserModule`:** Token issuance, session management, password hashing, and user lifecycle.
2. **`GuardianModule`:** Guardian-child links, minor student access permissions, and parental consents.
3. **`TutorModule`:** Tutor profile publication, credential verification, subject catalogs, and service areas.
4. **`SchedulingModule` & `BookingModule`:** Calendar availability, GiST slot exclusion locking, booking state transitions.
5. **`LearningModule`:** Session attendance, assignments, homework submissions, and student progress reports.
6. **`PaymentModule` & `LedgerModule`:** Payment gateway webhooks, escrow state, and double-entry immutable financial ledger.
7. **`NotificationModule`:** Centralized notification catalog, persistent in-app storage, and real-time Socket.IO gateway.
8. **`OutboxModule`:** Reliable event publisher reading unhandled events from `outbox_events` and dispatching to consumers.

---

## 3. The Transactional Outbox Pattern

To ensure zero event loss between database mutations and asynchronous real-time deliveries, every state-changing business transaction writes to the domain table and the `outbox_events` table within the **same atomic database transaction**:

```typescript
await this.dataSource.transaction(async (manager) => {
  // 1. Mutate domain entity
  booking.status = BookingStatus.CONFIRMED;
  await manager.save(booking);

  // 2. Persist outbox event
  const outboxEvent = manager.create(OutboxEvent, {
    eventType: 'booking.confirmed',
    aggregateType: 'Booking',
    aggregateId: booking.id,
    payload: {
      bookingId: booking.id,
      requesterUserId: booking.requesterUserId,
      tutorUserId: booking.tutorUserId,
      amountMinor: booking.pricePerSessionMinor,
    },
  });
  await manager.save(outboxEvent);
});
// 3. Outbox worker polls/listens and dispatches to NotificationService & BullMQ
```

---

## 4. Real-Time Socket.IO Architecture

- **Gateway Port & Path:** Runs over the unified HTTP/WebSocket port with path `/socket.io`.
- **Handshake Authentication:** Validates JWT access token passed via `auth.token` or HTTP-only cookie. Rejects invalid connections with `401 Unauthorized`.
- **Room Strategy:**
  - `user:<userId>`: Each authenticated user is automatically joined to their private server-governed room upon connection.
  - Broadcasts to a user always target `this.server.to(`user:${userId}`).emit('notification', payload)`.
  - Clients cannot join arbitrary rooms directly. All room memberships are assigned exclusively by the server.
- **Connection Recovery:** Supports automatic client reconnect with backoff; on reconnect, client fetches missed notifications using `lastReadTimestamp`.
