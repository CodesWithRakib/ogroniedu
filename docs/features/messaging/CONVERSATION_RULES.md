# Phase 08: Communication & Real-Time Messaging System — Conversation Rules

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Status:** Approved Specification

---

## 1. Core Principles

Educational communication on OgroniEdu is governed by three cardinal rules:

1. **Context-Bound**: Conversations must always be anchored to a formal academic engagement (`booking_id`). General, unassociated peer-to-peer unsolicited messaging is strictly disallowed.
2. **Guardian Transparency**: Minor students cannot engage in unmonitored private communication with adult tutors. Linked guardians hold unilateral read access to all threads involving their minor children.
3. **Escrow Integrity**: All conversations are subject to automated safety inspection to prevent disintermediation, off-platform cash/mobile wallet solicitations, and harassment.

---

## 2. Permitted Relationships & Participant Scoping

### 2.1 1-on-1 Tutoring Engagements

A booking conversation room `booking_chat:${bookingId}` is created upon booking creation and admits the following primary participants:

- **Assigned Tutor**: The verified tutor user associated with the booking's `tutor_profile`.
- **Enrolled Student**: The student user for whom the booking was scheduled.
- **Requester Guardian**: The parent or guardian user who booked the session on behalf of the student (if booked via guardian account).

### 2.2 Linked Guardian Oversight

- Any guardian linked to the enrolled student via an active `guardian_students` record has read and participation access to the conversation.
- The UI visibly displays a "Guardian Oversight Active" badge on the thread so all participants (student and tutor) are aware that communications are visible to parents.

### 2.3 Institutional Oversight (Organizations)

- When a booking is contracted under an educational institution or tutoring agency (`organization_id` is present on the tutor profile or booking):
  - **Organization Owner (`organization_owner`)** and **Organization Staff (`organization_staff`)** have administrative read access to the conversation thread for quality assurance, tutor mentoring, and dispute audits.
  - Organization staff cannot impersonate tutors; any messages sent by staff appear with an institutional staff badge.

### 2.4 Administrative & Safeguarding Oversight

- **`super_admin`**, **`admin`**, **`support_agent`**, and **`compliance_reviewer`** may access conversation threads:
  - In response to a formal dispute, refund request, or safeguarding complaint.
  - Every administrative thread access is recorded in the platform `audit_logs` table with timestamp, admin user ID, target booking ID, and access justification.

---

## 3. Booking Lifecycle & Conversation State Dependency

Conversations reflect the lifecycle of the underlying booking:

| Booking Status    | Messaging State                        | Permissions                                                                                                                                        |
| :---------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`pending`**     | **Active (Pre-Session Q&A)**           | Student/Guardian and Tutor can exchange messages to clarify syllabus, schedule adjustments, or learning objectives. Attachments allowed.           |
| **`confirmed`**   | **Active (Scheduled)**                 | Full communication enabled. Video meeting links, prep notes, and session materials can be exchanged.                                               |
| **`in_progress`** | **Active (Live Learning)**             | Full real-time messaging, instant delivery, typing indicators, and file sharing enabled.                                                           |
| **`completed`**   | **Read-Only / Grace Period**           | 14-day post-completion grace period allows final homework review and follow-up Q&A. After 14 days, thread transitions to archived read-only state. |
| **`cancelled`**   | **Archived / Read-Only**               | Immediate transition to read-only. Participants can view historical context but cannot post new messages.                                          |
| **`disputed`**    | **Restricted / Read-Only for Parties** | Parties can view messages; Compliance Reviewers and Support Agents have full audit inspection to arbitrate dispute evidence.                       |

---

## 4. Single Thread Per Booking Rule

- Each booking maintains exactly one canonical conversation thread mapped to its `booking_id`.
- Multiple bookings between the same student and tutor retain distinct, isolated conversation threads. This ensures:
  1. Clear evidentiary boundaries for refunds, escrow releases, and complaints.
  2. Accurate progress tracking per academic unit or month.
  3. No cross-contamination of materials between different subject bookings.

---

## 5. Duplicate Prevention & Idempotent Submission

To protect against duplicate message creation caused by network flutter or double clicks:

1. **Client-Side Debouncing**: The web client disables the Send button immediately upon submission until the API response or failure callback is received.
2. **Deterministic Payload Validation**: Identical message content submitted by the same user within 2 seconds to the same `booking_id` is rejected with `409 Conflict` (`DUPLICATE_MESSAGE_SUBMISSION`).
3. **Outbox Idempotency**: Each message creates an outbox event with `idempotency_key = booking_message:${messageId}`, ensuring downstream push notifications are dispatched exactly once.

---

## 6. Rate Limiting & Anti-Spam Protection

To prevent abuse, script flooding, and harassment:

- **Maximum Rate**: 15 messages per 60 seconds per user per booking thread.
- **Burst Rate**: Maximum 5 messages in a 5-second burst.
- **Attachment Quota**: Maximum 5 attachments per message; maximum 20MB cumulative payload per message.
- **Violation Consequence**: Exceeding rate limits results in `429 Too Many Requests` with a `Retry-After: 60` HTTP header. Repeated violations flag the user account for automated review by Support Agents.
