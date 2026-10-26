# Real-Time Messaging & Communication Test Plan

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 08

---

## 1. Test Matrix

### 1.1 Unit & Integration Tests (`@ogroniedu/api`)

1. **Content Normalizer & Anti-Circumvention Tests:**
   - Standard Bangladeshi mobile numbers (`+88017...`, `018...`).
   - Bengali digits (`০১৭১...`, `+৮৮০১৭...`).
   - Obfuscated numbers with spaces, dashes, dots (`0 1 7 1 2 3 4 5 6 7 8`).
   - Spelled-out digit words in English and Bengali.
   - bKash, Nagad, Rocket, Upay, Cellfin, and cash handover payment solicitations.
   - Social media bypass links (`wa.me`, `t.me`, `@username`, `fb.com/`).
2. **ABAC Participant Authorization Tests:**
   - Student can send and read in confirmed booking.
   - Tutor can send and read in confirmed booking.
   - Linked guardian can view and send in student's booking.
   - Unrelated user rejected with `403 ForbiddenException`.
   - Admin can view thread for support auditing.
3. **Conversations Inbox Query Tests:**
   - User retrieves list of active booking threads.
   - Accurate unread counters per conversation.
   - Correct partner display information and recent message snippet.
4. **WebSocket Gateway Real-Time Tests:**
   - Handshake authentication with valid JWT.
   - Unauthorized socket connection rejected.
   - Client joins `booking_chat:${bookingId}` room.
   - Typing indicator broadcast to peers in room.
   - Read receipt event broadcast to room.
   - New message broadcast to room upon send.

### 1.2 Frontend & UI Tests (`@ogroniedu/web`)

1. **Component Rendering & Behavior:**
   - `BookingChatView` renders message bubbles, timestamps, read checkmarks.
   - Redacted badge displayed when message is filtered.
   - Attachment card renders for messages with file assets.
   - Typing indicator visible when peer is typing.
2. **Localization & Parity:**
   - 100% dictionary key parity between `en.json` and `bn.json`.
   - Proper Bengali translations for chat labels, placeholders, and error messages.
3. **Conversations Inbox Page:**
   - Renders list of threads and selected active chat.
