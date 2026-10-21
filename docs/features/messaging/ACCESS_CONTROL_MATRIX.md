# Phase 08: Communication & Real-Time Messaging System — Access Control Matrix

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08: Communication & Real-Time Messaging System  
**Date:** October 20, 2026  
**Status:** Approved & Enforced  

---

## 1. Platform Roles Taxonomy

OgroniEdu strictly enforces an Attribute-Based Access Control (ABAC) and Role-Based Access Control (RBAC) model across 9 canonical platform roles:

1. **`student`**: Enrolled learner participating in booked tutoring sessions.
2. **`guardian`**: Parent or legal guardian managing minor students or bookings.
3. **`tutor`**: Verified educator delivering academic instruction.
4. **`admin`**: System administrator managing operational platform features.
5. **`super_admin`**: Root executive administrator with unrestricted audit and system controls.
6. **`support_agent`**: Customer success and operations agent assisting users with dispute resolution.
7. **`compliance_reviewer`**: Legal and child safeguarding investigator handling complaints under Child Safety laws.
8. **`organization_owner`**: Proprietor or executive of a tutoring agency or academic center.
9. **`organization_staff`**: Academic manager or coordinator employed by an organization.

---

## 2. Granular Permissions Matrix

| # | Action / Capability | Student | Guardian | Tutor | Admin | Super Admin | Support Agent | Compliance Reviewer | Org Owner | Org Staff | Policy & Enforcement Rule |
| :- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **View Own Inbox** (`GET /conversations`) | ✅ Own | ✅ Own + Ward | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ Under Review | ✅ Org | ✅ Org | Returns threads where user is participant, guardian, org staff, or auditor. |
| **2** | **Join Socket Room** (`join_booking_chat`) | ✅ Active | ✅ Ward | ✅ Active | ✅ | ✅ | ✅ Case | ✅ Case | ✅ Org | ✅ Org | Server verifies user connection token matches participant ID or verified relation. |
| **3** | **Send Text Message** | ✅ Active | ✅ Active | ✅ Active | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Only active participants (Student, Tutor, Requester Guardian) can post in thread. |
| **4** | **Send File Attachments** | ✅ Active | ✅ Active | ✅ Active | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Allowed only in non-cancelled, non-disputed active bookings. Max 10MB per file. |
| **5** | **View Thread History** | ✅ Active | ✅ Ward | ✅ Active | ✅ | ✅ | ✅ Case | ✅ Case | ✅ Org | ✅ Org | Cursor-paginated read access. |
| **6** | **Emit Typing Indicators** | ✅ Active | ✅ Active | ✅ Active | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Transient WebSocket event broadcast to room peers. |
| **7** | **Emit Read Receipts** | ✅ Active | ✅ Active | ✅ Active | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Updates `read_at` timestamp in DB and broadcasts `messages_read`. |
| **8** | **Guardian Oversight Badge** | 👁️ Target | 🛡️ Observer | 👁️ Aware | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | UI displays active guardian badge indicating parental oversight to tutor & student. |
| **9** | **View Unredacted Message Text** | ❌ | ❌ | ❌ | ❌ | ✅ Audit | ❌ | ✅ Audit | ❌ | ❌ | Raw safety-flagged text is strictly restricted to Compliance & Super Admin. |
| **10** | **Export Chat for Dispute / Audit** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ Active Case | ✅ Active Case | ❌ | ❌ | Generates cryptographic transcript PDF/JSON for dispute resolution. |
| **11** | **Suspend Messaging Privileges** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ Safeguard | ❌ | ❌ | Enforces temporary or permanent chat block on safety infractions. |

---

## 3. ABAC Evaluation Rules & Scoping Constraints

### 3.1 Participant Scoping (Direct Access)
A user is granted direct conversation read/write access if and only if:
- `user.id == booking.student_user_id`, OR
- `user.id == booking.tutor_user_id`, OR
- `user.id == booking.requester_user_id`

AND `booking.status NOT IN ('cancelled', 'expired', 'refunded')`.

### 3.2 Guardian Relationship Scoping
A `guardian` user is granted read/participate access if:
- `user.id == booking.requester_user_id`, OR
- An active row exists in `guardian_students` where `guardian_user_id = user.id` AND `student_user_id = booking.student_user_id` AND `status = 'active'`.

### 3.3 Institutional Multi-Tenancy Scoping
An `organization_owner` or `organization_staff` user is granted read-only supervision access if:
- The tutor assigned to the booking belongs to the organization:
  `booking.tutor_profile.organization_id == user.organization_id`.

### 3.4 Compliance & Support Scoping
- `support_agent`: Granted temporary read access only when an active dispute exists (`bookings.status = 'disputed'` or an open dispute case references `booking_id`).
- `compliance_reviewer`: Granted unredacted audit access only when an active safeguarding report or complaint references `booking_id` or the participants under investigation.
- `super_admin`: Granted read and audit access across all threads for platform integrity audits.

---

## 4. Enforcement Points

1. **HTTP Controller Layer**:
   - `ConversationsController` executes `@UseGuards(JwtAuthGuard)` and verifies user ownership before returning threads or message records.
2. **WebSocket Gateway Layer**:
   - `NotificationGateway` handles `@SubscribeMessage('join_booking_chat')` by validating credentials and querying `BookingRepository` and `GuardianAccessService` before allowing `client.join(room)`. Unauthorized attempts emit a `chat_error` and abort room subscription.
3. **Service Layer**:
   - `BookingMessagesService.sendMessage` verifies that sender is an active participant and that recipient is the opposite counter-party before writing to `booking_messages`.
