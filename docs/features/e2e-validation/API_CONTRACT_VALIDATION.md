# Phase 11: End-to-End Business Workflow Validation — API Contract Validation

## 1. Unified API Response Envelope

All API endpoints exposed under `/api/v1/*` strictly adhere to the standard envelope format defined in `@ogroniedu/contracts`:

### 1.1 Success Response Structure
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
  requestId: string;
}
```

### 1.2 Error Response Structure
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      issue: string;
    }>;
  };
  requestId: string;
}
```

---

## 2. HTTP Status Code Conventions

The backend enforces strict semantics for HTTP status codes across all controllers:

| Status Code | Canonical Usage | Example Endpoint |
| :--- | :--- | :--- |
| **200 OK** | Successful read, update, or idempotent action. | `GET /api/v1/tutors`, `PATCH /api/v1/bookings/:id` |
| **201 Created** | Successful entity creation. | `POST /api/v1/bookings`, `POST /api/v1/auth/register` |
| **204 No Content** | Successful action returning no content. | `DELETE /api/v1/guardians/children/:id` |
| **400 Bad Request** | Request body validation failure (class-validator). | Missing required fields, invalid date formats |
| **401 Unauthorized** | Missing or expired JWT authentication token. | Accessing protected routes without Bearer token |
| **403 Forbidden** | Authenticated user lacks required role or permission. | Non-compliance user attempting to view safety reports |
| **404 Not Found** | Requested entity does not exist or is invisible to caller. | Non-existent booking ID or cross-tenant resource |
| **409 Conflict** | State machine invalid transition or scheduling conflict. | Double-booking tutor slot, accepting expired booking |
| **422 Unprocessable** | Semantic business rule violation. | Insufficient escrow balance, invalid refund calculation |
| **429 Too Many Requests** | Rate limit exceeded. | More than 5 login attempts per minute from same IP |
| **500 Internal Error** | Unhandled server error (sanitized message returned). | Database connection drop, internal runtime panic |

---

## 3. Idempotency Key Architecture

Critical financial and state-altering mutation endpoints mandate an `Idempotency-Key` header:
- `POST /api/v1/payments/orders`
- `POST /api/v1/payments/settle`
- `POST /api/v1/payments/refunds`
- `POST /api/v1/payments/payouts`

### Idempotency Behavior
1. **First Request:** Request executes within an ACID transaction; result is cached in `idempotency_keys` table with response body and status code.
2. **Identical Replay:** Client resends identical payload with same `Idempotency-Key` within 24 hours $\to$ server immediately returns cached response without re-executing transactions.
3. **Mismatched Payload:** Client resends same `Idempotency-Key` with altered payload $\to$ server rejects with HTTP 422 Conflict (`IDEMPOTENCY_PAYLOAD_MISMATCH`).

---

## 4. Contract Parity & Validation Rules

- **Class Validator Pipes:** Incoming payloads pass through global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- **Date Standardization:** All dates and timestamps are formatted in ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Monetary Units:** All financial values are transmitted as integer minor units (poisha for BDT, e.g. 50000 = 500.00 BDT) to prevent floating-point rounding errors.
