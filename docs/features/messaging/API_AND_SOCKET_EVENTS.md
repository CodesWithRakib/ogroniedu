# Phase 08: Communication & Real-Time Messaging System — API & Socket.IO Events Specification

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Status:** Approved & Implemented  

---

## 1. HTTP REST Endpoints

All HTTP endpoints require authentication via Bearer JWT in the `Authorization` header (`Bearer <token>`).

### 1.1 `GET /api/v1/conversations`
Aggregates all active conversation threads for the authenticated user with conversation metadata, partner details, unread counts, and last message snippet.

- **Permissions**: `student`, `guardian`, `tutor`, `admin`, `super_admin`, `support_agent`.
- **Query Parameters**: None.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": [
    {
      "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
      "bookingStatus": "confirmed",
      "partner": {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Dr. Nusrat Jahan",
        "role": "tutor",
        "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Nusrat"
      },
      "subject": "Higher Mathematics",
      "unreadCount": 2,
      "lastMessage": {
        "id": "99999999-9999-9999-9999-999999999999",
        "content": "Please review page 45 before our session tomorrow.",
        "senderUserId": "11111111-1111-1111-1111-111111111111",
        "createdAt": "2026-10-20T17:30:00.000Z",
        "isRedacted": false
      },
      "updatedAt": "2026-10-20T17:30:00.000Z"
    }
  ]
}
```

---

### 1.2 `GET /api/v1/conversations/:bookingId/messages`
Retrieves cursor-paginated messages for a given booking thread.

- **Permissions**: Booking participants (student, tutor, requester), linked guardians, or authorized staff.
- **Path Parameters**:
  - `bookingId` (`UUID`): Booking identifier.
- **Query Parameters**:
  - `cursor` (`UUID`, optional): Cursor ID for pagination.
  - `limit` (`number`, optional, default 50, max 100): Number of records.
  - `direction` (`'forward' | 'backward'`, optional, default `'forward'`): Pagination direction.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "c1a2b3c4-0000-0000-0000-000000000001",
        "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
        "senderUserId": "22222222-2222-2222-2222-222222222222",
        "recipientUserId": "11111111-1111-1111-1111-111111111111",
        "content": "Hello teacher, I have completed the calculus exercises.",
        "isRedacted": false,
        "redactionReason": null,
        "attachmentAssetIds": ["77777777-7777-7777-7777-777777777777"],
        "metadata": {},
        "readAt": "2026-10-20T17:35:00.000Z",
        "createdAt": "2026-10-20T17:32:00.000Z"
      }
    ],
    "hasMore": false,
    "nextCursor": null
  }
}
```

---

### 1.3 `POST /api/v1/conversations/:bookingId/messages`
Submits a new message to the conversation thread. Performs automated content safety checks and initiates real-time Socket.IO and outbox notification dispatches.

- **Permissions**: Active booking participants (Student, Tutor, Requester Guardian).
- **Request Body**:
```json
{
  "content": "Here is the homework worksheet for tomorrow.",
  "recipientUserId": "11111111-1111-1111-1111-111111111111",
  "attachmentAssetIds": ["77777777-7777-7777-7777-777777777777"],
  "metadata": {}
}
```
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-0000-0000-0000-000000000002",
    "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
    "senderUserId": "22222222-2222-2222-2222-222222222222",
    "recipientUserId": "11111111-1111-1111-1111-111111111111",
    "content": "Here is the homework worksheet for tomorrow.",
    "isRedacted": false,
    "redactionReason": null,
    "attachmentAssetIds": ["77777777-7777-7777-7777-777777777777"],
    "metadata": {},
    "readAt": null,
    "createdAt": "2026-10-20T17:40:00.000Z"
  }
}
```
- **Safety Redaction Response (`201 Created` with Redaction Flag)**:
  If a phone number or payment solicitation is detected, the message is stored with sanitized content:
```json
{
  "success": true,
  "data": {
    "id": "c1a2b3c4-0000-0000-0000-000000000003",
    "content": "Call me on [REDACTED CONTACT NUMBER] or pay via [REDACTED PAYMENT SOLICITATION]",
    "isRedacted": true,
    "redactionReason": "PHONE_NUMBER_SHARING, PAYMENT_SOLICITATION"
  }
}
```

---

### 1.4 `POST /api/v1/conversations/:bookingId/read-all`
Marks all unread messages received by the current user in the thread as read in a single transactional query and emits a `messages_read` WebSocket event.

- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "markedReadCount": 3,
    "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
    "readAt": "2026-10-20T17:45:00.000Z"
  }
}
```

---

### 1.5 Legacy Backward-Compatible Endpoints
- `GET /api/v1/learning/bookings/:id/messages` -> Maps directly to thread message pagination.
- `POST /api/v1/learning/bookings/:id/messages` -> Maps directly to message submission.
- `PATCH /api/v1/learning/bookings/:id/messages/:messageId/read` -> Single message read receipt.

---

## 2. Real-Time Socket.IO Events

- **Namespace**: `/notifications`
- **Handshake Authentication**: `auth: { token: "Bearer <jwt>" }`

### 2.1 Client-to-Server Events

#### `join_booking_chat`
Subscribes the socket client to the room `booking_chat:${bookingId}`.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2"
}
```
- **Server Verification**: The server performs an ABAC check ensuring the socket's authenticated `userId` is the student, tutor, requester guardian, linked guardian, or admin for this booking. If unauthorized, emits `chat_error`.

#### `leave_booking_chat`
Unsubscribes the socket client from the room `booking_chat:${bookingId}`.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2"
}
```

#### `chat_typing`
Signals typing activity in a thread.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
  "isTyping": true
}
```
- **Debouncing Rule**: The client debounces this event with a 2.5-second timeout. If no new keystroke occurs within 2.5 seconds, client sends `isTyping: false`.

#### `mark_thread_read`
Allows a client viewing the thread over WebSockets to trigger a real-time read receipt.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2"
}
```

---

### 2.2 Server-to-Client Events

#### `new_chat_message`
Broadcast when a new message is posted to a booking thread. Emitted to room `booking_chat:${bookingId}` and direct room `user:${recipientUserId}`.
- **Payload**: Full `BookingMessageRecord`.
```json
{
  "id": "c1a2b3c4-0000-0000-0000-000000000002",
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
  "senderUserId": "22222222-2222-2222-2222-222222222222",
  "recipientUserId": "11111111-1111-1111-1111-111111111111",
  "content": "Here is the homework worksheet for tomorrow.",
  "isRedacted": false,
  "redactionReason": null,
  "attachmentAssetIds": ["77777777-7777-7777-7777-777777777777"],
  "metadata": {},
  "readAt": null,
  "createdAt": "2026-10-20T17:40:00.000Z"
}
```

#### `user_typing`
Broadcast to everyone in `booking_chat:${bookingId}` except the sender.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
  "userId": "11111111-1111-1111-1111-111111111111",
  "isTyping": true
}
```

#### `messages_read`
Broadcast to room `booking_chat:${bookingId}` when messages in the thread are marked read.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
  "readerId": "11111111-1111-1111-1111-111111111111",
  "readAt": "2026-10-20T17:45:00.000Z"
}
```

#### `chat_error`
Sent directly to the requesting socket client when an unauthorized room join or validation failure occurs.
- **Payload**:
```json
{
  "bookingId": "80cecf5f-2590-486b-a184-b4e35ef1c0e2",
  "message": "Unauthorized access to booking chat room"
}
```
