# API Endpoint Inventory

| Domain   | Method   | Path                                             | Access/test focus                          |
| -------- | -------- | ------------------------------------------------ | ------------------------------------------ |
| Auth     | POST     | `/api/v1/auth/register`                          | public/rate limited; duplicate identity    |
| Auth     | POST     | `/api/v1/auth/login`                             | abuse and session safety                   |
| Auth     | POST     | `/api/v1/auth/refresh`                           | rotation/replay                            |
| Auth     | POST     | `/api/v1/auth/logout`                            | revoke session                             |
| Auth     | GET      | `/api/v1/auth/me`                                | own identity                               |
| Guardian | GET/POST | `/api/v1/guardians/me/children`                  | linked-child scope                         |
| Tutor    | GET      | `/api/v1/tutors`                                 | filters, stable pagination, published only |
| Tutor    | GET      | `/api/v1/tutors/:id/public-profile`              | private fields excluded                    |
| Tutor    | PATCH    | `/api/v1/tutors/me/profile`                      | owner validation                           |
| Tutor    | PUT      | `/api/v1/tutors/me/availability`                 | time/conflict validation                   |
| Admin    | POST     | `/api/v1/admin/tutors/:id/verification-decision` | permission/audit                           |
| Requests | POST     | `/api/v1/tutor-requests`                         | relationship/idempotency                   |
| Booking  | POST     | `/api/v1/bookings`                               | participant/policy                         |
| Booking  | POST     | `/api/v1/bookings/:id/cancel`                    | actor and cancellation policy              |
| Sessions | POST     | `/api/v1/sessions/:id/attendance`                | assigned tutor/learner                     |
| Learning | POST     | `/api/v1/assignments`                            | authorized learner scope                   |
| Learning | POST     | `/api/v1/assignments/:id/submissions`            | assigned learner                           |
| Payments | POST     | `/api/v1/payments/orders`                        | idempotency                                |
| Payments | POST     | `/api/v1/payments/webhooks/:provider`            | signature/replay                           |
| Payments | POST     | `/api/v1/payments/:id/refund-requests`           | refundable balance                         |
| Support  | POST     | `/api/v1/support/tickets`                        | requester ownership                        |
| Disputes | POST     | `/api/v1/disputes`                               | eligible participant                       |
| Admin    | GET      | `/api/v1/admin/audit-logs`                       | explicit permission                        |

Expand each endpoint to request/response schema, errors, pagination, rate limits, permissions, audit, idempotency and tests before implementation.
