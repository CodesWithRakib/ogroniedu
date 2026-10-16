# OgroniEdu — API Standards & REST/WebSocket Conventions

**Date:** 2026-10-10  
**Specification:** OpenAPI 3.0 / REST & Socket.IO 4.x  
**Status:** Approved Standard

---

## 1. URL Path Conventions

- Base Path: `/api/v1`
- Plural nouns for resource collections: `/api/v1/tutors`, `/api/v1/bookings`, `/api/v1/notifications`
- Nested sub-resources for bounded ownership:
  - `/api/v1/guardians/me/children`
  - `/api/v1/bookings/:id/sessions`
  - `/api/v1/bookings/:id/attendance`
- Action-oriented endpoints use verbs only when mutating non-CRUD state machines:
  - `POST /api/v1/bookings/:id/accept`
  - `POST /api/v1/bookings/:id/decline`
  - `POST /api/v1/notifications/read-all`

---

## 2. Standard Response Envelope

All API endpoints return a predictable JSON envelope structure:

### 2.1 Success Response (`200 OK`, `201 Created`):

```json
{
  "success": true,
  "data": {
    "id": "c1f76bf2-411a-471f-a3c7-123456789abc",
    "status": "confirmed"
  },
  "meta": {
    "requestId": "req_88f921ea",
    "timestamp": "2026-10-10T04:45:00.000Z"
  },
  "error": null
}
```

### 2.2 Paginated Success Response:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "requestId": "req_88f921ea",
    "timestamp": "2026-10-10T04:45:00.000Z"
  },
  "error": null
}
```

### 2.3 Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `500`):

```json
{
  "success": false,
  "data": null,
  "meta": {
    "requestId": "req_88f921ea",
    "timestamp": "2026-10-10T04:45:00.000Z"
  },
  "error": {
    "code": "BOOKING_SLOT_CONFLICT",
    "message": "The requested tutor time slot is already booked by another student.",
    "details": [
      {
        "field": "startsAt",
        "issue": "Conflicts with existing session between 10:00 and 11:30"
      }
    ]
  }
}
```

---

## 3. Standard Headers

- `Authorization: Bearer <accessToken>`: JWT access token (15-min expiry).
- `Idempotency-Key: <uuid>`: Required for non-safe financial and booking mutations (`POST /api/v1/payments/checkout`, `POST /api/v1/bookings`).
- `X-Request-Id: <uuid>`: Distributed tracing identifier.
- `Accept-Language: bn, en;q=0.9`: Dictates translation error messages if requested.

---

## 4. HTTP Status Code Guidelines

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully persisted.
- `204 No Content`: Successful mutation with no response body.
- `400 Bad Request`: Malformed syntax or schema failure.
- `401 Unauthorized`: Missing or invalid credentials.
- `403 Forbidden`: Authenticated, but lacking role or resource ownership.
- `404 Not Found`: Resource does not exist (or concealed for privacy).
- `409 Conflict`: Business invariant collision (e.g., overlapping schedule or email conflict).
- `422 Unprocessable Entity`: Semantic validation failure (e.g. End time before Start time).
- `429 Too Many Requests`: Rate limit threshold exceeded.
- `500 Internal Server Error`: Unhandled server exception (PII redacted).
