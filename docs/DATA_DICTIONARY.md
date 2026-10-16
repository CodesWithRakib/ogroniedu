# OgroniEdu — Data Dictionary & Entity Reference

**Date:** 2026-10-10  
**Status:** Canonical Reference

---

## 1. `users` Table

| Column              | Type          | Nullable | Default                  | Description & Constraints                                                        |
| ------------------- | ------------- | -------- | ------------------------ | -------------------------------------------------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()`      | Primary Key                                                                      |
| `email`             | `text`        | Yes      | NULL                     | Lowercase email; unique when present                                             |
| `phone_e164`        | `text`        | Yes      | NULL                     | E.164 phone (+8801XXXXXXXXX); unique when present                                |
| `password_hash`     | `text`        | Yes      | NULL                     | Argon2id or bcrypt password hash                                                 |
| `display_name`      | `text`        | No       | -                        | Full name of user                                                                |
| `preferred_locale`  | `text`        | No       | `'bn'`                   | `'bn'` (Bengali) or `'en'` (English)                                             |
| `status`            | `text`        | No       | `'pending_verification'` | `pending_verification`, `active`, `suspended`, `deactivated`, `deletion_pending` |
| `email_verified_at` | `timestamptz` | Yes      | NULL                     | Timestamp of email verification                                                  |
| `phone_verified_at` | `timestamptz` | Yes      | NULL                     | Timestamp of SMS OTP verification                                                |
| `last_login_at`     | `timestamptz` | Yes      | NULL                     | Last successful session timestamp                                                |
| `created_at`        | `timestamptz` | No       | `now()`                  | Record creation timestamp                                                        |
| `updated_at`        | `timestamptz` | No       | `now()`                  | Record update timestamp                                                          |
| `deleted_at`        | `timestamptz` | Yes      | NULL                     | Soft delete marker                                                               |

---

## 2. `tutor_profiles` Table

| Column                  | Type          | Nullable | Default           | Description & Constraints                                                                                         |
| ----------------------- | ------------- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `user_id`               | `uuid`        | No       | -                 | Foreign Key -> `users(id)`, Primary Key                                                                           |
| `headline`              | `text`        | Yes      | NULL              | Short summary (e.g. "BUET EEE, 4 Years Physics Experience")                                                       |
| `bio`                   | `text`        | Yes      | NULL              | Detailed educational biography                                                                                    |
| `years_experience`      | `smallint`    | Yes      | NULL              | Validated >= 0                                                                                                    |
| `teaching_modes`        | `text[]`      | No       | `'{}'`            | Elements in `in_person`, `online`, `hybrid`                                                                       |
| `hourly_rate_minor`     | `bigint`      | Yes      | NULL              | Rate in poisha (e.g., 50000 = BDT 500.00)                                                                         |
| `currency`              | `char(3)`     | No       | `'BDT'`           | Standard 3-letter currency code                                                                                   |
| `verification_status`   | `text`        | No       | `'not_submitted'` | `not_submitted`, `submitted`, `under_review`, `needs_information`, `approved`, `rejected`, `suspended`, `expired` |
| `publication_status`    | `text`        | No       | `'draft'`         | `draft`, `published`, `unpublished`                                                                               |
| `response_time_minutes` | `integer`     | Yes      | NULL              | Average response time                                                                                             |
| `profile_updated_at`    | `timestamptz` | Yes      | NULL              | Last modification timestamp                                                                                       |
| `created_at`            | `timestamptz` | No       | `now()`           | Created timestamp                                                                                                 |
| `updated_at`            | `timestamptz` | No       | `now()`           | Updated timestamp                                                                                                 |

---

## 3. `bookings` Table

| Column                        | Type          | Nullable | Default             | Description & Constraints                                                                                                                                     |
| ----------------------------- | ------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | `uuid`        | No       | `gen_random_uuid()` | Primary Key                                                                                                                                                   |
| `request_id`                  | `uuid`        | Yes      | NULL                | Foreign Key -> `tutor_requests(id)`                                                                                                                           |
| `requester_user_id`           | `uuid`        | No       | -                   | Foreign Key -> `users(id)` (Guardian or Student)                                                                                                              |
| `student_user_id`             | `uuid`        | No       | -                   | Foreign Key -> `users(id)` (The learner)                                                                                                                      |
| `tutor_user_id`               | `uuid`        | No       | -                   | Foreign Key -> `tutor_profiles(user_id)`                                                                                                                      |
| `subject_id`                  | `uuid`        | No       | -                   | Foreign Key -> `subjects(id)`                                                                                                                                 |
| `education_level_id`          | `uuid`        | No       | -                   | Foreign Key -> `education_levels(id)`                                                                                                                         |
| `mode`                        | `text`        | No       | -                   | `in_person`, `online`, `hybrid`                                                                                                                               |
| `status`                      | `text`        | No       | `'requested'`       | `requested`, `accepted`, `awaiting_payment`, `confirmed`, `in_progress`, `completed`, `declined`, `cancelled`, `expired`, `disputed`, `replacement_requested` |
| `price_per_session_minor`     | `bigint`      | No       | -                   | Session price in poisha                                                                                                                                       |
| `currency`                    | `char(3)`     | No       | `'BDT'`             | Currency code                                                                                                                                                 |
| `duration_minutes`            | `integer`     | No       | -                   | Duration between 15 and 480 mins                                                                                                                              |
| `cancellation_policy_version` | `text`        | No       | -                   | Active policy snapshot ID                                                                                                                                     |
| `service_agreement_snapshot`  | `jsonb`       | No       | `'{}'`              | Snapshot of terms agreed at booking                                                                                                                           |
| `created_at`                  | `timestamptz` | No       | `now()`             | Booking creation timestamp                                                                                                                                    |
| `updated_at`                  | `timestamptz` | No       | `now()`             | Booking update timestamp                                                                                                                                      |
| `completed_at`                | `timestamptz` | Yes      | NULL                | Final completion timestamp                                                                                                                                    |

---

## 4. `booking_sessions` Table

| Column                  | Type          | Nullable | Default             | Description & Constraints                                                             |
| ----------------------- | ------------- | -------- | ------------------- | ------------------------------------------------------------------------------------- |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | Primary Key                                                                           |
| `booking_id`            | `uuid`        | No       | -                   | Foreign Key -> `bookings(id)`                                                         |
| `tutor_user_id`         | `uuid`        | No       | -                   | Foreign Key -> `tutor_profiles(user_id)`                                              |
| `student_user_id`       | `uuid`        | No       | -                   | Foreign Key -> `users(id)`                                                            |
| `starts_at`             | `timestamptz` | No       | -                   | Lesson start time in UTC                                                              |
| `ends_at`               | `timestamptz` | No       | -                   | Lesson end time in UTC (`ends_at > starts_at`)                                        |
| `timezone`              | `text`        | No       | `'Asia/Dhaka'`      | Context timezone                                                                      |
| `status`                | `text`        | No       | `'scheduled'`       | `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`, `reschedule_pending` |
| `meeting_url`           | `text`        | Yes      | NULL                | Encrypted/authorized video link for online class                                      |
| `location_instructions` | `text`        | Yes      | NULL                | In-person address details                                                             |
| `completed_at`          | `timestamptz` | Yes      | NULL                | Completion timestamp                                                                  |
| `created_at`            | `timestamptz` | No       | `now()`             | Record creation timestamp                                                             |
| `updated_at`            | `timestamptz` | No       | `now()`             | Record update timestamp                                                               |

---

## 5. `notifications` Table

| Column       | Type          | Nullable | Default             | Description & Constraints                                                 |
| ------------ | ------------- | -------- | ------------------- | ------------------------------------------------------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | Primary Key                                                               |
| `user_id`    | `uuid`        | No       | -                   | Foreign Key -> `users(id)`                                                |
| `event_type` | `text`        | No       | -                   | Stable identifier (e.g. `booking.confirmed`, `session.reminder`)          |
| `title_key`  | `text`        | No       | -                   | Localization key for title (e.g. `notifications.booking_confirmed.title`) |
| `body_key`   | `text`        | No       | -                   | Localization key for message body                                         |
| `payload`    | `jsonb`       | No       | `'{}'`              | Typed context parameters (e.g. `{ bookingId, tutorName, amount }`)        |
| `read_at`    | `timestamptz` | Yes      | NULL                | Timestamp when recipient marked as read                                   |
| `created_at` | `timestamptz` | No       | `now()`             | Persistent creation timestamp                                             |

---

## 6. `notification_deliveries` Table

| Column                | Type          | Nullable | Default             | Description & Constraints                              |
| --------------------- | ------------- | -------- | ------------------- | ------------------------------------------------------ |
| `id`                  | `uuid`        | No       | `gen_random_uuid()` | Primary Key                                            |
| `notification_id`     | `uuid`        | No       | -                   | Foreign Key -> `notifications(id)`                     |
| `channel`             | `text`        | No       | -                   | `'in_app'`, `'email'`, `'sms'`, `'push'`, `'whatsapp'` |
| `provider`            | `text`        | Yes      | NULL                | E.g. `'socket.io'`, `'sendgrid'`, `'twilio'`           |
| `provider_message_id` | `text`        | Yes      | NULL                | External provider delivery ID                          |
| `status`              | `text`        | No       | `'queued'`          | `queued`, `sent`, `delivered`, `failed`, `suppressed`  |
| `attempts`            | `integer`     | No       | 0                   | Retry counter                                          |
| `last_error_code`     | `text`        | Yes      | NULL                | Redacted error diagnostics                             |
| `sent_at`             | `timestamptz` | Yes      | NULL                | Timestamp sent                                         |
| `delivered_at`        | `timestamptz` | Yes      | NULL                | Timestamp acknowledged                                 |
| `created_at`          | `timestamptz` | No       | `now()`             | Creation timestamp                                     |

---

## 7. `outbox_events` Table

| Column            | Type          | Nullable | Default             | Description & Constraints                         |
| ----------------- | ------------- | -------- | ------------------- | ------------------------------------------------- |
| `id`              | `uuid`        | No       | `gen_random_uuid()` | Primary Key                                       |
| `event_type`      | `text`        | No       | -                   | E.g. `booking.created`, `attendance.marked`       |
| `aggregate_type`  | `text`        | No       | -                   | Domain aggregate name (e.g. `Booking`, `Session`) |
| `aggregate_id`    | `uuid`        | No       | -                   | UUID of modified aggregate                        |
| `payload`         | `jsonb`       | No       | -                   | Serialized event payload                          |
| `created_at`      | `timestamptz` | No       | `now()`             | Committed transaction timestamp                   |
| `published_at`    | `timestamptz` | Yes      | NULL                | Marked when worker dispatches event               |
| `attempts`        | `integer`     | No       | 0                   | Dispatch attempt counter                          |
| `last_error_code` | `text`        | Yes      | NULL                | Error diagnostics if worker fails                 |
