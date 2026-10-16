# OgroniEdu — Real-Time WebSocket Architecture

**Technology:** Socket.IO 4.8.x + NestJS Gateway + Redis Multi-Node Adapter  
**Status:** Approved Standard

---

## 1. Gateway Configuration & Authentication

The NestJS WebSocket Gateway (`NotificationGateway`) is configured with the following properties:

```typescript
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
})
```

### 1.1 Handshake Security:

1. Client transmits authentication token in the initial handshake payload:
   ```javascript
   const socket = io('/notifications', {
     auth: { token: accessToken },
     transports: ['websocket', 'polling'],
   });
   ```
2. The Gateway's `handleConnection(client: Socket)` method intercepts the handshake:
   - Extracts and verifies the JWT token using the shared `JwtService`.
   - If token is missing, expired, or invalid, the socket is immediately terminated:
     ```typescript
     client.emit('auth_error', { message: 'Invalid or expired token' });
     client.disconnect(true);
     ```
   - If valid, the user identity is attached to `client.data.user = payload`.
   - The socket automatically joins the dedicated user room:
     ```typescript
     await client.join(`user:${payload.sub}`);
     ```

---

## 2. Multi-Node Scalability via Redis Adapter

When horizontal scaling is activated across multiple backend instances, Socket.IO utilizes `@socket.io/redis-adapter`:

- Publishes socket emissions across all backend nodes over Redis Pub/Sub channels.
- Ensures a user connected to Node A receives a notification dispatched by a service executing on Node B.

---

## 3. Client Resilience & Reconnection Strategy

```typescript
const socket = io('/notifications', {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});
```

### Reconnection Missed Notification Catch-up:

When a client reconnects after network interruption:

1. Client emits `reconnected` with its last known notification timestamp.
2. Server queries PostgreSQL:
   ```sql
   SELECT * FROM notifications
   WHERE user_id = :userId
     AND created_at > :lastKnownTimestamp
   ORDER BY created_at ASC;
   ```
3. Server streams any missed notifications and updates the current unread badge count.

---

## 4. Real-Time Events Contract

### Server to Client Events:

- `notification`: Payload containing a newly dispatched notification (title, body, payload, createdAt, id).
- `unread_count`: Payload `{ count: number }` providing the current total unread notifications.
- `notification_read`: Payload `{ id: string }` broadcasting state changes across active tabs of the same user.

### Client to Server Events:

- `mark_as_read`: `{ id: string }`
- `mark_all_as_read`: `{}`
- `get_unread_count`: `{}`
