# Role & Permission Matrix — Bookings & Scheduling

Legend: ✅ allowed · ❌ denied · ◐ allowed only for an authorized child /
resource · — not applicable.

| Action | Student | Guardian | Tutor | Admin | Enforcement |
| --- | --- | --- | --- | --- | --- |
| Create booking request for self | ✅ | — | — | — | `BookingsService.createRequest` |
| Create booking request for child | — | ◐ active link | — | — | `GuardianAccessService` / active link |
| List booking requests | ✅ own | ◐ linked children | ✅ assigned | ✅ all | `getRequests(studentId?)` |
| View booking detail | ✅ own | ◐ linked child | ✅ assigned | ✅ all | `assertCanAccessBooking` |
| Withdraw request | ✅ requester | ◐ requester (guardian) | ❌ | ❌ | requester-only guard |
| Accept / decline request | ❌ | ❌ | ✅ assigned | ❌ | tutor-only guard |
| Create payment order | ✅ payer | ◐ payer | ❌ | ❌ | order service ownership |
| Confirm booking | ❌ client | ❌ client | ❌ client | ✅ explicit | payment webhook / server transition |
| Schedule one-off session | ❌ | ◐ child booking | ✅ assigned | ✅ | `assertCanManageSessions` |
| Schedule recurring series | ❌ | ◐ child booking | ✅ assigned | ✅ | `assertCanManageSessions` |
| Reschedule session | ❌ | ◐ child booking | ✅ assigned | ✅ | `assertCanManageSessions` |
| Cancel session | ❌ | ◐ child booking | ✅ assigned | ✅ | `assertCanManageSessions` |
| Series cancel/reschedule | ❌ | ◐ child booking | ✅ assigned | ✅ | series booking access |
| Start session | ✅ participant | ❌ | ✅ assigned | ✅ | participant check |
| Complete session | ❌ | ❌ | ✅ assigned | ✅ | tutor/admin check |
| Update meeting URL | ❌ | ❌ | ✅ assigned | ✅ | tutor/admin check |
| List sessions | ✅ own | ◐ linked children | ✅ own | ✅ all | scoped query + explicit child check |
| Export calendar | ✅ own | ◐ linked children | ✅ own | ✅ all | same query scope |
| Manage own availability | — | — | ✅ self | ✅ | tutor self endpoint |
| Manage blocked periods | — | — | ✅ self | ✅ | tutor self endpoint |

## Backend rules

1. A client-supplied `studentId` is **never** proof of guardianship. Every
   filter revalidates against `guardian_student_links` with
   `status = 'active'`, or self, or admin.
2. A guardian user id is never used as a student id. Session/booking filters
   use the child's student user id.
3. Cross-child access returns `403` (not an empty list) for explicit filters.
4. Session mutations load the booking and call the shared
   `SessionQueriesService.assertCanManageSessions`.
5. Payment order creation verifies the payer can access the booking
   (participant or active guardian).
6. Admins are the only role allowed to perform administrative status overrides;
   those still pass through the transition map and are recorded in
   `booking_status_events`.
7. Availability endpoints operate only on the authenticated tutor's own
   profile (`/tutors/me/...`).

## Frontend rules

- Child selector is shown only when the user has ≥2 active linked children.
- With one child, the child scope is selected by default.
- With zero children, the student scope is the authenticated user.
- RTK Query cache keys include `studentId`; no cross-child cache reuse.
- Payment success is rendered only from the backend booking/order status.
