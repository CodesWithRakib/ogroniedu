# Analytics Metric Definitions & Reconciliation Invariants

**Version:** 1.0.0  
**Status:** Canonical Source-of-Truth Metric Specifications  
**Platform:** OgroniEdu (Bangladesh)  

---

## 1. Principles & Anti-Double-Counting Rules

1. **Source-of-Truth Principle:**  
   Every metric is computed directly from primary transactional database records (`bookings`, `booking_sessions`, `session_attendance`, `payment_orders`, `payment_refunds`, `tutor_replacement_cases`, `safety_reports`, `ledger_entries`). No artificial caching or ungrounded counters.
2. **Time Window Anchoring:**  
   Metrics are strictly bounded by `startDate` and `endDate` (UTC timestamps):
   - Booking metrics are anchored on `bookings.created_at`.
   - Session completion and no-show metrics are anchored on `booking_sessions.scheduled_start`.
   - Financial metrics are anchored on `payment_orders.created_at` or `payment_refunds.created_at`.
3. **Anti-Double-Counting Rules:**
   - **Booking Requests:** Each booking agreement is identified by primary key `bookings.id`. Multiple sessions inside a multi-session booking do not increment the booking request count.
   - **Completed Sessions:** Only sessions with `booking_sessions.status = 'completed'` count as completed. Rescheduled or pending sessions are excluded.
   - **Financial GMV (Gross Merchandise Volume):** Evaluated strictly on `payment_orders` with `status = 'succeeded'`. Pending, expired, or failed orders are excluded.
   - **Refunds:** Tracked individually by `payment_refunds.id` with `status = 'succeeded'`. Total refunded amount cannot exceed the original paid order amount.
   - **Unique Learners / Re-Booking Retention:** Distinct count of `student_user_id` or `requester_user_id` across time cohorts.

---

## 2. Core Operational Metrics Catalog

### 2.1. Booking Conversion & Request Funnel
- **Total Requests ($N_{req}$):**  
  `COUNT(*) FROM bookings WHERE created_at BETWEEN :start AND :end`
- **Confirmed Bookings ($N_{conf}$):**  
  `COUNT(*) FROM bookings WHERE status IN ('confirmed', 'in_progress', 'completed') AND created_at BETWEEN :start AND :end`
- **Declined Bookings ($N_{decl}$):**  
  `COUNT(*) FROM bookings WHERE status = 'declined' AND created_at BETWEEN :start AND :end`
- **Withdrawn / Cancelled Requests ($N_{with}$):**  
  `COUNT(*) FROM bookings WHERE status = 'cancelled' AND created_at BETWEEN :start AND :end`
- **Conversion Rate ($\text{CR}$):**  
  $$\text{CR} = \frac{N_{conf}}{N_{req}} \times 100\% \quad (\text{if } N_{req} > 0 \text{ else } 0\%)$$

### 2.2. Session Completion, Cancellation & No-Shows
- **Scheduled Sessions ($S_{sched}$):**  
  `COUNT(*) FROM booking_sessions WHERE scheduled_start BETWEEN :start AND :end`
- **Completed Sessions ($S_{comp}$):**  
  `COUNT(*) FROM booking_sessions WHERE status = 'completed' AND scheduled_start BETWEEN :start AND :end`
- **Cancelled Sessions ($S_{canc}$):**  
  `COUNT(*) FROM booking_sessions WHERE status = 'cancelled' AND scheduled_start BETWEEN :start AND :end`
- **No-Show Sessions ($S_{noshow}$):**  
  `COUNT(*) FROM booking_sessions WHERE status = 'no_show' AND scheduled_start BETWEEN :start AND :end`
- **Completion Rate:**  
  $$\text{Completion Rate} = \frac{S_{comp}}{S_{sched}} \times 100\%$$
- **Session Cancellation Rate:**  
  $$\text{Cancellation Rate} = \frac{S_{canc}}{S_{sched}} \times 100\%$$
- **No-Show Rate:**  
  $$\text{No-Show Rate} = \frac{S_{noshow}}{S_{sched}} \times 100\%$$

### 2.3. Tutor Responsiveness & Acceptance
- **Tutor Response Time (Median / Mean):**  
  `AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) / 3600` for bookings transitioning out of `requested` state.
- **Tutor Acceptance Rate:**  
  $$\text{Acceptance Rate} = \frac{\text{Count of Accepted Requests}}{\text{Total Tutor Inquiries}} \times 100\%$$

### 2.4. Financial & Revenue Metrics
- **Gross Merchandise Value (GMV BDT):**  
  $$\text{GMV} = \frac{\sum \text{amount\_minor}}{100} \quad \text{for succeeded payment orders}$$
- **Platform Fee Commission Revenue (BDT):**  
  Calculated from platform commission rate (default 8%):
  $$\text{Revenue} = \text{GMV} \times 0.08$$
  Reconciled against `ledger_accounts.code = '4010_PLATFORM_FEE_REVENUE'`.
- **Total Refunds (BDT):**  
  $$\text{Refunds} = \frac{\sum \text{amount\_minor}}{100} \quad \text{for succeeded payment refunds}$$
- **Net Processed Volume (NPV BDT):**  
  $$\text{NPV} = \text{GMV} - \text{Refunds}$$
- **Refund Rate:**  
  $$\text{Refund Rate} = \frac{\text{Total Refunded BDT}}{\text{GMV}} \times 100\%$$

### 2.5. Trust, Disputes & Replacement Guarantee
- **Replacement Guarantee Cases Filed ($C_{rep}$):**  
  `COUNT(*) FROM tutor_replacement_cases WHERE created_at BETWEEN :start AND :end`
- **Replacement Guarantee Resolution Rate:**  
  $$\text{Resolution Rate} = \frac{\text{Count of Cases in 'accepted', 'rejected', 'closed'}}{C_{rep}} \times 100\%$$
- **Average Dispute Resolution Hours:**  
  `AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) / 3600` for resolved cases.
- **Safety Reports Intake ($S_{rep}$):**  
  `COUNT(*) FROM safety_reports WHERE created_at BETWEEN :start AND :end`
- **Critical Child Safety Incidents:**  
  `COUNT(*) FROM safety_reports WHERE escalation_level = 'urgent_child_safety' OR severity = 'critical'`

### 2.6. Retention & Cohort Re-Booking
- **Repeat Learners ($L_{rep}$):**  
  Learners with $\ge 2$ bookings created within period or lifetime.
- **Learner Retention Rate:**  
  $$\text{Retention Rate} = \frac{\text{Count of Students with } \ge 2 \text{ Bookings}}{\text{Total Distinct Students}} \times 100\%$$

---

## 3. Role-Based Access Matrix

| Metric Endpoint / Scope | Minimum Allowed Role | Data Scoping |
| :--- | :--- | :--- |
| `GET /api/v1/analytics/overview` | `admin`, `super_admin` | Platform-wide aggregates |
| `GET /api/v1/analytics/financials` | `admin`, `super_admin` | Platform GMV, escrow, revenue |
| `GET /api/v1/analytics/tutors` | `admin`, `super_admin` | All educators ranked & aggregated |
| `GET /api/v1/analytics/retention` | `admin`, `super_admin` | Cohort re-booking matrix |
| `GET /api/v1/analytics/tutors/me` | `tutor` | Scoped strictly to logged-in tutor (`tutorUserId = user.id`) |

---

## 4. Reconciliation Integrity Verification

1. **Double-Entry Mathematical Guarantee:**
   - Every succeeded payment order posts balanced debits to cash clearing (`1010_CASH_SSLCOMMERZ` or `1020_CASH_BKASH`) and credits to escrow liability (`2010_STUDENT_ESCROW_HOLDING`).
   - Every completed session transfers escrow to tutor payable (`2020_TUTOR_PAYABLE`) and platform revenue (`4010_PLATFORM_FEE_REVENUE`).
   - Every refund reverses escrow against cash clearing.
   - Total debits across all ledger entries must equal total credits with zero discrepancy.
2. **Session Count Non-Overlap Guarantee:**
   - For any booking, `completed_sessions + cancelled_sessions + scheduled_sessions + no_show_sessions === total_sessions_created`.
