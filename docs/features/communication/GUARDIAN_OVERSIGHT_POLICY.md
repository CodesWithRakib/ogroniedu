# Guardian Oversight & Minor Safety Policy

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Legal Framework:** The Children Act 2013 (শিশু আইন ২০১৩), Contract Act 1872  
**Target Group:** Minor students (under 18 years of age) and their verified guardians  

---

## 1. Principles of Guardian Oversight

1. **Transparency:**
   - Both the tutor and the minor student are informed that tuition conversations are accessible to verified linked guardians.
   - A persistent banner ("🛡️ Guardian Oversight Active") is displayed in the chat interface.
2. **Access Control (ABAC):**
   - Only active, verified guardians linked through the `guardian_students` table have permission to read the communication thread.
   - If a guardian has been suspended, revoked, or has a documented safeguarding conflict, access is immediately blocked.
3. **Real-Time Notification of Child-Tutor Interaction:**
   - Whenever a tutor sends a message to a student, linked guardians receive a real-time push notification and notification bell alert.
   - If any message is safety-redacted (e.g. personal contact sharing), the guardian is alerted immediately.
4. **Guardian Direct Participation:**
   - A guardian can send notes directly into the tuition thread (e.g. requesting rescheduling or clarifying homework instructions).
   - Guardian messages are distinctly labeled with a verified "🛡️ Guardian (Name)" badge to prevent impersonation or confusion.
