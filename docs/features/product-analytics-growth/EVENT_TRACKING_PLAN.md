# OgroniEdu — Event Tracking Plan

## 1. Governance Principles & Integrity Standards

1. **Strict Client/Server Separation:** Clients can emit interaction events (e.g. searching, opening a profile, starting a booking modal). Clients **cannot** emit server-authoritative events (such as `booking_confirmed`, `payment_succeeded`, or `session_completed`). Consequential business events are generated exclusively by backend domain transitions.
2. **First-Party Telemetry Only:** Zero external tracking SDKs (Google Analytics, Segment, Facebook Pixel) are included. All events are stored in PostgreSQL within the platform's sovereign infrastructure.
3. **Automated Sanitization:** All inbound event properties pass through `sanitizeAnalyticsProperties()`, stripping forbidden keys (passwords, tokens, OTPs, cards, phone numbers, private messages) before storage.

---

## 2. Event Catalog & Specification

| Event Name                  | Authority     | Trigger Point                                               | Non-Sensitive Properties Allowlist                                           |
| :-------------------------- | :------------ | :---------------------------------------------------------- | :--------------------------------------------------------------------------- |
| `registration_started`      | Client        | User lands on registration screen and selects a role        | `role`, `source`                                                             |
| `registration_completed`    | Server        | User verification code is verified and user account created | `role`, `preferred_locale`                                                   |
| `onboarding_step_completed` | Client        | User completes a step in the onboarding wizard              | `step_index`, `step_name`, `role`                                            |
| `onboarding_completed`      | Server        | User completes full onboarding (`is_onboarded = true`)      | `role`, `duration_seconds`                                                   |
| `tutor_search_performed`    | Client        | User executes a tutor discovery query                       | `subject_id`, `district`, `result_count`, `has_results`, `search_latency_ms` |
| `tutor_profile_viewed`      | Client        | User views a tutor's public details page                    | `tutor_user_id`, `subject_id`, `hourly_rate`                                 |
| `booking_started`           | Client        | User clicks "Book Session" and opens booking request modal  | `tutor_user_id`, `subject_id`                                                |
| `booking_request_submitted` | Server        | Booking request is successfully saved to database           | `booking_id`, `tutor_user_id`, `subject_id`, `session_count`                 |
| `booking_confirmed`         | Server        | Tutor accepts booking inquiry                               | `booking_id`, `response_time_hours`                                          |
| `booking_cancelled`         | Server        | Booking is cancelled by student, tutor, or system           | `booking_id`, `reason_code`, `cancelled_by_role`                             |
| `session_attended`          | Server        | Student or tutor joins active video classroom               | `session_id`, `booking_id`, `role`                                           |
| `session_completed`         | Server        | Tutor marks lesson completed or session timer concludes     | `session_id`, `booking_id`, `duration_minutes`                               |
| `homework_submitted`        | Server        | Student submits assignment text or attachment IDs           | `assignment_id`, `booking_id`, `submission_id`                               |
| `homework_reviewed`         | Server        | Tutor grades and provides feedback on submission            | `assignment_id`, `score`, `review_time_hours`                                |
| `feedback_submitted`        | Client/Server | User submits beta/launch feedback widget                    | `category`, `rating`, `page_url`                                             |

---

## 3. Strict Forbidden Payload Attributes

The following attributes are **strictly forbidden** from product analytics events and will be automatically purged by `sanitizeAnalyticsProperties()`:

- `password` / `password_hash`
- `otp` / `verification_code`
- `token` / `jwt` / `refresh_token`
- `credit_card` / `card_number` / `cvv` / `pin`
- `phone` / `phone_e164` / `mobile`
- `email` / `student_email`
- `message` / `content` / `chat_text`
- `evidence` / `national_id` / `nid`
- `address` / `street_address`

---

## 4. Deduplication & Idempotency Rules

- **Browser Retries & Reconnects:** Clients generate a consistent UUID `sessionId` stored in browser `sessionStorage`. Repeated clicks within 2 seconds with the same `sessionId` and `entity_id` are ignored.
- **WebSocket Reconnections:** Realtime event emissions use unique event IDs to prevent duplicate counts during network dropouts.
- **Server Event Deduplication:** Server domain events (e.g. `booking_confirmed`) are recorded strictly once inside the database state transition block.
