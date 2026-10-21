# Phase 08: Communication & Real-Time Messaging System — Notification Integration

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Status:** Approved & Implemented  

---

## 1. Overview & Architecture

The Messaging System integrates with the platform's Centralized Notification Service via the **Transactional Outbox Pattern**. This ensures high reliability: messages are never persisted without a corresponding notification event, and notifications are never fired for messages that failed to commit to the database.

```mermaid
flowchart TD
    subgraph Transaction["Single DB Transaction"]
        Msg[INSERT INTO booking_messages]
        Outbox[INSERT INTO notification_outbox]
    end

    Msg --> Outbox
    Transaction -->|Committed| EventBus[Event Emitter / Socket Gateway]
    
    EventBus -->|Immediate Push| LiveChat[Socket Room: booking_chat:id]
    EventBus -->|Toast Notification| RecipientRoom[Socket Room: user:recipientId]

    subgraph OutboxWorker["Asynchronous Outbox Dispatcher"]
        Poll[Poll notification_outbox WHERE status = 'pending']
        Dedupe{Is Recipient In Active Chat?}
        SendPush[Dispatch Web Push / FCM]
        SendEmail[Send Email Digest]
        MarkDone[UPDATE outbox SET status = 'processed']
    end

    Outbox --> Poll
    Poll --> Dedupe
    Dedupe -->|Yes (Read within 30s)| MarkDone
    Dedupe -->|No (Offline / Inactive)| SendPush --> SendEmail --> MarkDone
```

---

## 2. Transactional Outbox Event Specification

When `BookingMessagesService.sendMessage` executes, it records the following outbox row:

```json
{
  "id": "e4f5a6b7-0000-0000-0000-000000000001",
  "eventType": "booking.message_sent",
  "recipientUserId": "11111111-1111-1111-1111-111111111111",
  "idempotencyKey": "booking_message:c1a2b3c4-0000-0000-0000-000000000002",
  "payload": {
    "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
    "messageId": "c1a2b3c4-0000-0000-0000-000000000002",
    "senderUserId": "22222222-2222-2222-2222-222222222222",
    "senderName": "Rahim Ahmed",
    "snippet": "Here is the homework worksheet for tomorrow.",
    "hasAttachments": true,
    "isRedacted": false
  },
  "status": "pending",
  "createdAt": "2026-10-20T17:40:00.000Z"
}
```

---

## 3. Real-Time vs. Offline Notification Deduplication

To prevent annoying users who are already actively engaged in an open chat session with duplicate pushes, SMS, or emails:
1. **Active Window Suppression**:
   - When a message is sent, `NotificationGateway` emits `new_chat_message` directly to the `booking_chat:${bookingId}` room.
   - If the recipient's socket client has active focus on `booking_chat:${bookingId}`, it immediately sends back a lightweight `messages_read` receipt.
2. **Outbox Delay Grace Period**:
   - The outbox dispatcher delays processing email and external push notifications for chat events by **45 seconds**.
   - If `booking_messages.read_at` is populated before the 45-second window elapses, the outbox processor marks the email/push delivery as `suppressed_already_read`, preventing notification fatigue.

---

## 4. Guardian Mirroring Policy

Under Child Safety and Safeguarding protocols:
- If a message is sent to or from a student user who is a minor:
  - An additional notification outbox event is automatically created for every active guardian linked to that student in `guardian_students`.
  - Guardian payload:
    ```json
    {
      "eventType": "guardian.student_message_notification",
      "recipientUserId": "33333333-3333-3333-3333-333333333333",
      "payload": {
        "studentName": "Tahmid Ahmed",
        "tutorName": "Dr. Nusrat Jahan",
        "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
        "notice": "A new message was exchanged in your ward's tutoring session."
      }
    }
    ```
- Guardians receive real-time push notifications and can jump straight into the thread in oversight mode.

---

## 5. Reconnection & Offline State Synchronization

When a mobile or web client temporarily loses internet connectivity (e.g., poor mobile coverage in regional Bangladesh):
1. **Automatic Socket Reconnection**: The Socket.IO client automatically attempts reconnection with exponential backoff (`reconnectionDelay: 1000`, `reconnectionDelayMax: 5000`).
2. **Resubscription**: On socket `connect` event, the client re-authenticates and invokes `join_booking_chat` for the currently displayed thread.
3. **Catch-up Sync**: The client queries `GET /api/v1/conversations/:bookingId/messages?cursor=<lastKnownMessageId>&direction=forward` to pull any messages that arrived while disconnected.
4. **Idempotent Merge**: Incoming messages are deduplicated by `id` on the client state, preventing duplicate bubbles.
