# Real-Time Chat & WebSocket Architecture

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Protocol:** Socket.IO v4 over WebSocket (with polling fallback)  
**Security:** JWT Bearer Handshake Authentication + Thread ABAC Authorization

---

## 1. Socket.IO Namespaces & Room Topography

The system utilizes two distinct, highly focused namespaces:

1. **`/notifications` (Existing):**
   - User-level broadcast room: `user:${userId}`.
   - Dispatches system announcements, booking status changes, billing alerts, and background reminders.
2. **`/chat` (Phase 08 Dedicated Gateway) or integrated chat namespace:**
   - Client establishes authenticated connection with JWT Bearer token in handshake auth headers.
   - Gateway authenticates JWT signature server-side.
   - Dedicated rooms:
     - `booking_chat:${bookingId}`: Scoped specifically to confirmed booking participants (Student, Tutor, Requester Guardian, and Platform Admin).
     - `user:${userId}`: For direct user messaging notifications and unread counters.

---

## 2. Real-Time Events Specification

### 2.1 Client to Server (Inbound)

| Event Name           | Payload                                                                 | Authorization Guard                                                                       | Description                                                                        |
| :------------------- | :---------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `join_booking_chat`  | `{ bookingId: string }`                                                 | ABAC check: socket user must be student, tutor, linked guardian, or admin of the booking. | Client joins `booking_chat:${bookingId}` room. Emits history sync or unread count. |
| `leave_booking_chat` | `{ bookingId: string }`                                                 | Open                                                                                      | Client leaves the booking room.                                                    |
| `send_chat_message`  | `{ bookingId: string, content: string, attachmentAssetIds?: string[] }` | ABAC check + Content Safety inspection.                                                   | Persists message in database and broadcasts to room.                               |
| `start_typing`       | `{ bookingId: string }`                                                 | Participant check.                                                                        | Broadcasts typing indicator to peers in room (expires in 4s).                      |
| `stop_typing`        | `{ bookingId: string }`                                                 | Participant check.                                                                        | Clears typing indicator for user.                                                  |
| `mark_thread_read`   | `{ bookingId: string }`                                                 | Participant check.                                                                        | Marks all pending unread messages in thread as read and broadcasts read receipts.  |

### 2.2 Server to Client (Outbound)

| Event Name         | Payload                                                                             | Room Target                                         | Description                                                                                    |
| :----------------- | :---------------------------------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `new_chat_message` | `BookingMessageEntity`                                                              | `booking_chat:${bookingId}` & `user:${recipientId}` | Dispatches newly sent message immediately to active chat viewers and recipient's private room. |
| `user_typing`      | `{ bookingId: string, userId: string, userName: string, isTyping: boolean }`        | `booking_chat:${bookingId}` (broadcast to peers)    | Informs peers of active typing state.                                                          |
| `messages_read`    | `{ bookingId: string, readerUserId: string, readAt: string, messageIds: string[] }` | `booking_chat:${bookingId}`                         | Signals that messages were read; updates sender checkmarks to double blue.                     |
| `chat_error`       | `{ code: string, message: string }`                                                 | Calling client socket                               | Emitted when authorization fails, validation fails, or rate limit is exceeded.                 |

---

## 3. Disconnection & Reconnection Resilience

1. **Automatic Heartbeat & Exponential Reconnect:**
   - Client configured with `reconnectionAttempts: 10`, `reconnectionDelay: 1000ms`, `reconnectionDelayMax: 5000ms`.
2. **State Recovery:**
   - On reconnect, client re-joins active chat rooms and performs an incremental synchronization fetch via cursor pagination (`GET /api/v1/bookings/:bookingId/messages?cursor=...`) to retrieve any messages that arrived while disconnected.
3. **Optimistic UI:**
   - Sender appends message immediately with pending status.
   - Upon receiving server acknowledgment or `new_chat_message` echo, message transitions to sent.
