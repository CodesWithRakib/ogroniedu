# 11 — Database Data Dictionary

The field-level initial DDL is `database/schema.sql`; this inventory summarizes purpose and integrity. Reconcile both during implementation.

| Table                                              | Purpose                         | Key integrity rules                        |
| -------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| users                                              | Login identity/account state    | normalized unique active email/phone       |
| roles, permissions                                 | Access catalog                  | unique codes                               |
| user_roles, role_permissions                       | Grants                          | unique composite pairs; audit role grants  |
| auth_sessions                                      | Refresh/session state           | store token hash; expiry/revocation        |
| guardian_student_links                             | Guardian-child relation         | unique pair; consent/status/audit          |
| student_profiles                                   | Learner academic profile        | ownership and minimal PII                  |
| tutor_profiles                                     | Tutor profile/publication       | verification/publication gate              |
| tutor_qualifications                               | Credentials/evidence            | private evidence, review status            |
| tutor_verification_reviews                         | Review history                  | reviewer, decision, reason, policy version |
| curricula, education_levels, subjects              | Reference data                  | unique codes and active flags              |
| tutor_subjects                                     | Tutor capabilities              | unique tutor/subject/level tuple           |
| tutor_service_areas                                | Local service coverage          | locality codes                             |
| tutor_availability, tutor_blocked_periods          | Time rules/exceptions           | timezone and valid intervals               |
| tutor_requests                                     | Match request lifecycle         | requester/learner/tutor ownership          |
| bookings                                           | Service agreement and lifecycle | participants, policy snapshot, state       |
| booking_sessions                                   | Scheduled lessons               | valid range and overlap protection         |
| session_attendance                                 | Attendance evidence             | unique participant/session                 |
| assignments, assignment_submissions                | Homework and submissions        | authorized learner scope                   |
| assessments, assessment_results                    | Assessment and revisions        | score bounds, author audit                 |
| progress_reports                                   | Learning summaries              | period and guardian visibility             |
| conversations, participants, messages              | Participant messaging           | membership authorization                   |
| notifications, notification_deliveries             | Inbox and channel delivery      | retries/deduplication                      |
| payment_orders, payment_transactions               | Payment lifecycle               | idempotency/provider references            |
| refunds                                            | Refund lifecycle                | not beyond refundable balance              |
| ledger_accounts, ledger_journals, ledger_entries   | Accounting trail                | per-currency balance, append-only          |
| tutor_payouts                                      | Settlement state                | idempotency/reconciliation                 |
| reviews                                            | Eligible service reviews        | rating bounds, one per eligible policy     |
| support_tickets, disputes, tutor_replacement_cases | Operations                      | ownership, state, audit                    |
| file_assets                                        | File metadata/access            | private by default, scan status            |
| audit_logs                                         | Privileged/sensitive actions    | append-only policy, safe metadata          |
| outbox_events                                      | Reliable event publication      | retry and dedupe                           |
| idempotency_keys                                   | Replay protection               | unique scope/key, request hash             |
| system_settings, feature_flags                     | Platform configuration          | validation and admin audit                 |

Review open items: recurring rules; organization tenancy; policy snapshots; file FKs; deferred ledger balancing; locale content; full location hierarchy; submission versioning; guardian consent workflow; provider settlement imports; and exact overlap semantics. Add tests for each decision.
