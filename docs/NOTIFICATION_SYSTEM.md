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

| Event Type ID             | Category   | Priority | Target Roles                                | Bangla Title / Template                  | English Title / Template                        | Navigation Target              |
| ------------------------- | ---------- | -------- | ------------------------------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `booking.requested`       | `booking`  | `high`   | `tutor`                                     | নতুন বুকিং অনুরোধ এসেছে                  | New Booking Request Received                    | `/tutor/bookings/:bookingId`   |
| `booking.accepted`        | `booking`  | `high`   | `guardian`, `student`                       | বুকিং অনুরোধ গৃহীত হয়েছে (পেমেন্ট করুন)  | Booking Request Accepted (Payment Due)          | `/bookings/:bookingId/pay`     |
| `booking.confirmed`       | `booking`  | `high`   | `guardian`, `student`, `tutor`              | টিউশন বুকিং নিশ্চিত হয়েছে                | Tutoring Booking Confirmed                      | `/bookings/:bookingId`         |
| `booking.cancelled`       | `booking`  | `urgent` | `guardian`, `student`, `tutor`              | বুকিং বাতিল করা হয়েছে                    | Booking Cancelled                               | `/bookings/:bookingId`         |
| `booking.declined`        | `booking`  | `normal` | `guardian`, `student`                       | বুকিং অনুরোধ গৃহীত হয়নি                  | Booking Request Declined                        | `/tutors`                      |
| `session.reminder`        | `booking`  | `normal` | `guardian`, `student`, `tutor`              | আগামী ৩০ মিনিটে ক্লাস শুরু হবে           | Session Starting in 30 Minutes                  | `/sessions/:sessionId`         |
| `attendance.marked`       | `learning` | `normal` | `guardian`, `student`                       | ক্লাসের উপস্থিতি রেকর্ড করা হয়েছে        | Class Attendance Recorded                       | `/sessions/:sessionId`         |
| `assignment.created`      | `learning` | `normal` | `student`, `guardian`                       | নতুন বাড়ির কাজ দেওয়া হয়েছে               | New Homework Assignment Created                 | `/assignments/:assignmentId`   |
| `assignment.submitted`    | `learning` | `normal` | `tutor`                                     | বাড়ির কাজ জমা দেওয়া হয়েছে                | Homework Submitted                              | `/assignments/:id/submissions` |
| `assignment.graded`       | `learning` | `normal` | `student`, `guardian`                       | বাড়ির কাজ মূল্যায়ন সম্পন্ন               | Homework Reviewed & Graded                      | `/assignments/:assignmentId`   |
| `payment.succeeded`       | `payment`  | `high`   | `guardian`, `student`                       | পেমেন্ট সফল হয়েছে (রসিদ দেখুন)           | Payment Succeeded (View Receipt)                | `/payments/:paymentId`         |
| `payment.failed`          | `payment`  | `urgent` | `guardian`, `student`                       | পেমেন্ট সম্পন্ন করা যায়নি                | Payment Unsuccessful                            | `/bookings/:bookingId/pay`     |
| `refund.processed`        | `payment`  | `high`   | `guardian`, `student`                       | রিফান্ড সম্পন্ন হয়েছে                    | Refund Processed                                | `/payments/refunds/:id`        |
| `progress.published`      | `learning` | `normal` | `guardian`, `student`                       | নতুন অগ্রগতি রিপোর্ট প্রকাশিত হয়েছে      | New Progress Report Published                   | `/progress/:reportId`          |
| `tutor.verified`          | `trust`    | `high`   | `tutor`                                     | অভিনন্দন! আপনার শিক্ষক প্রোফাইল অনুমোদিত | Congratulations! Your Tutor Profile is Approved | `/tutor/profile`               |
| `tutor.needs_information` | `trust`    | `urgent` | `tutor`                                     | যাচাইকরণের জন্য অতিরিক্ত তথ্য প্রয়োজন    | Verification Requires Additional Details        | `/tutor/verification`          |
| `tutor.rejected`          | `trust`    | `urgent` | `tutor`                                     | যাচাইকরণ সিদ্ধান্ত: প্রত্যাখ্যাত         | Verification Decision: Not Approved             | `/tutor/verification`          |
| `safety.alert`            | `trust`    | `urgent` | `admin`, `super_admin`, `guardian`          | নিরাপত্তা ও জরুরি সতর্কতা                | Safety Alert Flagged                            | `/dashboard/admin/disputes`    |
| `tutor.replacement`       | `booking`  | `high`   | `guardian`, `student`, `tutor`              | টিউটর রিপ্লেসমেন্ট আপডেট                 | Tutor Replacement Update                        | `/bookings/:bookingId`         |
| `dispute.opened`          | `trust`    | `high`   | `admin`, `super_admin`, `guardian`, `tutor` | বিরোধ বা অভিযোগ টিকিট খোলা হয়েছে        | Dispute / Support Ticket Opened                 | `/dashboard/admin/disputes`    |
| `chat.message`            | `booking`  | `normal` | `guardian`, `student`, `tutor`              | নতুন বার্তা এসেছে                        | New Message Received                            | `/bookings/:bookingId`         |
| `system.announcement`     | `system`   | `normal` | `all`                                       | প্ল্যাটফর্ম নোটিশ                        | Platform Notice                                 | `/announcements`               |

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

## 4. Frontend Notification Experience & Web Audio Sound Engine

1. **`NotificationSoundEngine` (`notification-sound.ts`):**
   - Zero-latency Web Audio API programmatic sound generator (no external mp3/wav files).
   - Harmonic two-tone crystal chime (880Hz + 1318Hz fundamental with overtones).
   - Dynamics Compressor node prevents speaker clipping while maximizing perceived loudness and clarity.
   - Three distinctive tones:
     - `chime`: Crisp double-bell for standard alerts and reminders.
     - `urgent`: Fast 3-pulse square wave for child safety and cancellations.
     - `success`: 4-note ascending major triad for verified profiles and payments.
   - Global interaction listeners bypass browser autoplay restrictions automatically.
   - Persistent volume control (0%–100%) and sound toggle stored in `localStorage`.

2. **`NotificationProvider`:**
   - Establishes and manages authenticated Socket.IO client connection.
   - Listens on `notification` and `unread_count` events.
   - Triggers appropriate synthesized chime tone based on priority and category.
   - Exposes sound settings (`soundEnabled`, `soundVolume`, `toggleSound`, `setSoundVolume`, `testSound`).

3. **`NotificationBell`:**
   - Real-time numerical unread badge with animated pulsing ping ring.
   - Live socket connectivity indicator (green for connected, red for offline).
   - Audio state tooltip (shows whether sound is active or muted).

4. **`NotificationCenter` (Drawer):**
   - Sound mute/unmute toggle and "Test Sound" button right in the header.
   - Interactive volume slider.
   - Category filtering pills (`All`, `Unread`, `Booking`, `Learning`, `Payment`, `Safety`).
   - "Mark all as read" button and single-click individual read marks.
   - Bilingual relative time formatting (`এইমাত্র`, `৫ মিনিট আগে`, etc.).

5. **`NotificationToastContainer`:**
   - High-contrast obsidian-cyan and category-colored glassmorphic toasts.
   - Sound indicator icon on the toast.
   - 6-second visual countdown progress bar.
   - Direct action links navigating to the event's target route.

---

## 5. Future Channel Abstraction

```typescript
export interface INotificationChannel {
  readonly channelName: 'in_app' | 'email' | 'sms' | 'whatsapp';
  send(notification: PersistedNotification, recipient: Recipient): Promise<DeliveryResult>;
}
```

In Phase 0, only `InAppNotificationChannel` is registered. Future channels (`EmailNotificationChannel`, `SmsNotificationChannel`, `WhatsAppNotificationChannel`) can be added without altering business modules.
