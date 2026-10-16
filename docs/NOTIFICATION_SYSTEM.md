# OgroniEdu — Centralized Notification System Specification

**Version:** 1.0.0 (Phase 0 Implementation)  
**Primary Channel (Phase 0):** In-App Real-Time WebSocket (Socket.IO) + Persistent PostgreSQL History  
**Future Channels (Abstracted):** Email, SMS, WhatsApp  
**Status:** Canonical Engineering Specification

---

## 1. Centralized Notification Registry & Catalog

All notifications across the platform must be registered in the **Notification Registry**. Unregistered ad-hoc notification types are prohibited.

### 1.1 Registry Schema

Each notification definition must specify:

1. `type`: Stable, machine-readable string (e.g. `booking.requested`).
2. `category`: `booking`, `learning`, `payment`, `trust`, `system`.
3. `priority`: `urgent`, `high`, `normal`, `low`.
4. `titleKey`: Bilingual key for title (`notifications.<type>.title`).
5. `bodyKey`: Bilingual key for body (`notifications.<type>.body`).
6. `allowedRoles`: Roles entitled to receive this notification (`guardian`, `student`, `tutor`, `admin`).
7. `persist`: Boolean (whether to save to `notifications` table).
8. `inAppToast`: Boolean (whether to trigger client-side toast popup).
9. `navigationTarget`: Dynamic URL path template (e.g. `/dashboard/bookings/:bookingId`).

### 1.2 Seed Catalog of Notification Types

| Event Type ID        | Category   | Priority | Target Roles                   | Bangla Title / Template                  | English Title / Template                        | Navigation Target            |
| -------------------- | ---------- | -------- | ------------------------------ | ---------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `booking.requested`  | `booking`  | `high`   | `tutor`                        | নতুন বুকিং অনুরোধ এসেছে                  | New Booking Request Received                    | `/tutor/bookings/:bookingId` |
| `booking.accepted`   | `booking`  | `high`   | `guardian`, `student`          | বুকিং অনুরোধ গৃহীত হয়েছে (পেমেন্ট করুন)  | Booking Request Accepted (Payment Due)          | `/bookings/:bookingId/pay`   |
| `booking.confirmed`  | `booking`  | `high`   | `guardian`, `student`, `tutor` | টিউশন বুকিং নিশ্চিত হয়েছে                | Tutoring Booking Confirmed                      | `/bookings/:bookingId`       |
| `booking.cancelled`  | `booking`  | `urgent` | `guardian`, `student`, `tutor` | বুকিং বাতিল করা হয়েছে                    | Booking Cancelled                               | `/bookings/:bookingId`       |
| `session.reminder`   | `booking`  | `normal` | `guardian`, `student`, `tutor` | আগামী ৩০ মিনিটে ক্লাস শুরু হবে           | Session Starting in 30 Minutes                  | `/sessions/:sessionId`       |
| `attendance.marked`  | `learning` | `normal` | `guardian`, `student`          | ক্লাসের উপস্থিতি রেকর্ড করা হয়েছে        | Class Attendance Recorded                       | `/sessions/:sessionId`       |
| `assignment.created` | `learning` | `normal` | `student`, `guardian`          | নতুন বাড়ির কাজ দেওয়া হয়েছে               | New Homework Assignment Created                 | `/assignments/:assignmentId` |
| `payment.succeeded`  | `payment`  | `high`   | `guardian`, `student`          | পেমেন্ট সফল হয়েছে (রসিদ দেখুন)           | Payment Succeeded (View Receipt)                | `/payments/:paymentId`       |
| `progress.published` | `learning` | `normal` | `guardian`, `student`          | নতুন অগ্রগতি রিপোর্ট প্রকাশিত হয়েছে      | New Progress Report Published                   | `/progress/:reportId`        |
| `tutor.verified`     | `trust`    | `high`   | `tutor`                        | অভিনন্দন! আপনার শিক্ষক প্রোফাইল অনুমোদিত | Congratulations! Your Tutor Profile is Approved | `/tutor/profile`             |

---

## 2. Server-Side Recipient Authorization & Resolution

- **Rule 1: Never Trust Client-Supplied Recipient IDs.**
  - Notifications are created only via domain service events.
  - The `NotificationService` resolves the list of eligible user IDs based on server-verified relationships:
    - If a booking event occurs: Recipients = verified requester + linked guardian(s) + assigned tutor. Unrelated users are never included.
- **Rule 2: Server-Enforced Room Segregation.**
  - On Socket.IO connection, the server checks the validated JWT claims.
  - The server automatically binds the socket to `user:${userId}`.
  - Client sockets cannot emit `join` or `leave` for user rooms; room joins are strictly handled by the server handshake.

---

## 3. Real-Time Delivery & Persistence Lifecycle

```
[Domain Action] -> [Atomic DB Transaction: Save Entity + Outbox Event]
                           |
                           v
               [Outbox Processor Worker]
                           |
                           v
           [NotificationService.dispatch()]
                           |
       +-------------------+-------------------+
       |                                       |
       v                                       v
[Save to 'notifications' DB]         [Socket.IO Gateway Emit]
[Save to 'notification_deliveries']  [to('user:<id>').emit('notification')]
                                               |
                                     +---------+---------+
                                     |                   |
                                (Recipient Online)  (Recipient Offline)
                                     |                   |
                            [Client receives toast] [Persisted in DB]
                            [Unread count increments]    |
                                                         v
                                                [On Reconnect/Login]
                                                [Client fetches unread]
```

---

## 4. Frontend Notification Experience

1. **`NotificationProvider`:**
   - Establishes and manages the Socket.IO client connection.
   - Listens on `notification` and `unread_count` events.
   - Plays a subtle chime / displays accessible toast popup via `sonner` / `shadcn` toast.
2. **`NotificationBell` & `NotificationBadge`:**
   - Displays real-time numerical unread count.
   - Automatically decrements when notifications are read.
3. **`NotificationCenter` (Drawer / Dropdown):**
   - Paginated list of recent notifications.
   - Filterable by `All` vs `Unread`.
   - "Mark as read" for individual items and "Mark all as read".
   - Full bilingual support (Bengali / English).
   - Empty, loading, and offline reconnection banners.

---

## 5. Future Channel Abstraction

```typescript
export interface INotificationChannel {
  readonly channelName: 'in_app' | 'email' | 'sms' | 'whatsapp';
  send(notification: PersistedNotification, recipient: Recipient): Promise<DeliveryResult>;
}
```

In Phase 0, only `InAppNotificationChannel` is registered. Future channels (`EmailNotificationChannel`, `SmsNotificationChannel`, `WhatsAppNotificationChannel`) can be added without altering business modules.
