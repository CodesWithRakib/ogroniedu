# OgroniEdu — LiveKit Self-Hosting VPS & Migration Guide

## 1. Architectural Overview & Media Abstraction

OgroniEdu's real-time video classroom is built on top of a clean media provider abstraction (`IMediaProvider`). The NestJS backend and Next.js 16 frontend communicate with WebRTC media servers via standard access tokens and WebSocket signaling.

```
   ┌───────────────────────┐             ┌────────────────────────┐
   │ Next.js 16 Web Client │             │ OgroniEdu NestJS API   │
   │ (@livekit/components) │             │ (livekit-server-sdk)   │
   └───────────┬───────────┘             └───────────┬────────────┘
               │                                     │
               │ Join Token / API                    │ Token Generation,
               │ WebRTC Media Streams                │ Moderation & Webhooks
               ▼                                     ▼
   ┌──────────────────────────────────────────────────────────────┐
   │             LiveKit Media Provider Layer                     │
   │                                                              │
   │   • Development / Staging: LiveKit Cloud                     │
   │   • Production Self-Hosted: VPS Docker Cluster               │
   └──────────────────────────────────────────────────────────────┘
```

Because all token generation, participant moderation, and room lifecycle logic interact solely with standard LiveKit protocols through the provider interface, **zero code changes are required** to transition from LiveKit Cloud to a dedicated, self-hosted LiveKit VPS cluster. Switching requires only updating server and client environment variables.

---

## 2. Environment Variables & Zero-Code Migration

### LiveKit Cloud (Current Default)
```env
# Server (.env)
LIVEKIT_URL=wss://ogroniedu-57i4qo5d.livekit.cloud
LIVEKIT_API_KEY=APIbhJrhxN8HYWZ
LIVEKIT_API_SECRET=upAkeQfyEx6OjsV1Ohlj5Iz4O2gIOQHlCez2CZb6Dh2A

# Web Client (.env)
NEXT_PUBLIC_LIVEKIT_URL=wss://ogroniedu-57i4qo5d.livekit.cloud
```

### Self-Hosted VPS (Post-Migration)
```env
# Server (.env)
LIVEKIT_URL=wss://livekit.ogroniedu.com
LIVEKIT_API_KEY=ogroni_prod_vps_key_2026
LIVEKIT_API_SECRET=ogroni_prod_vps_secret_super_secure_entropy_key_2026

# Web Client (.env)
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.ogroniedu.com
```

> **Security Note:** `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` must **never** be exposed in client-side bundles. Only `NEXT_PUBLIC_LIVEKIT_URL` is shared with the browser.

---

## 3. VPS Hardware & Network Requirements

### Recommended Server Sizing
| Class Load | Concurrency | vCPU | RAM | Network Bandwidth |
| :--- | :--- | :--- | :--- | :--- |
| **Small Group Classes (1–6 users)** | Up to 10 simultaneous rooms (60 users) | 4 vCPU | 8 GB | 1 Gbps |
| **Large Batch Classes (50–500 users)** | 2–5 webinar rooms (500–1000 users) | 8–16 vCPU | 16–32 GB | 2.5–10 Gbps |

### Required Firewall & Port Rules (UFW / AWS Security Group)
LiveKit requires specific TCP and UDP ports for signaling, TURN, and media egress:

| Port | Protocol | Purpose | Source |
| :--- | :--- | :--- | :--- |
| **`80`** | TCP | HTTP Let's Encrypt SSL verification (Caddy) | Anywhere (`0.0.0.0/0`) |
| **`443`** | TCP | HTTPS & Secure WebSocket Signaling (`wss://`) | Anywhere (`0.0.0.0/0`) |
| **`7880`** | TCP | Internal LiveKit HTTP & Signaling | Localhost / Reverse Proxy |
| **`7881`** | TCP | RTC TCP fallback (for strict firewalls) | Anywhere (`0.0.0.0/0`) |
| **`50000–60000`** | UDP | WebRTC Media ICE/UDP tracks | Anywhere (`0.0.0.0/0`) |

Ubuntu UFW configuration:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:60000/udp
sudo ufw reload
```

---

## 4. VPS Docker Deployment

### Step 1: Directory Setup
On your Ubuntu/Debian VPS:
```bash
sudo mkdir -p /opt/livekit
cd /opt/livekit
```

### Step 2: LiveKit Server Configuration (`livekit.yaml`)
Create `/opt/livekit/livekit.yaml`:
```yaml
port: 7880
bind_addresses:
  - ""

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true

redis:
  address: redis:6379
  username: ""
  password: ""
  db: 0

keys:
  ogroni_prod_vps_key_2026: ogroni_prod_vps_secret_super_secure_entropy_key_2026

logging:
  level: info
  pion_level: error

webhook:
  api_key: ogroni_prod_vps_key_2026
  urls:
    - https://api.ogroniedu.com/api/v1/classroom/webhook

room:
  auto_create: false
  empty_timeout: 300 # 5 minutes before purging idle room
  max_participants: 500
```

### Step 3: Caddy Reverse Proxy Configuration (`Caddyfile`)
Caddy provides automated Let's Encrypt SSL/TLS certificates and WebSocket tunneling:
Create `/opt/livekit/Caddyfile`:
```caddy
livekit.ogroniedu.com {
    reverse_proxy livekit:7880
}
```

### Step 4: Docker Compose Setup (`docker-compose.yml`)
Create `/opt/livekit/docker-compose.yml`:
```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: livekit-server
    restart: unless-stopped
    network_mode: "host"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml:ro
    command: --config /etc/livekit.yaml

  redis:
    image: redis:7-alpine
    container_name: livekit-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data

  caddy:
    image: caddy:2-alpine
    container_name: livekit-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  redis_data:
  caddy_data:
  caddy_config:
```

### Step 5: Start LiveKit Cluster
```bash
docker compose up -d
docker compose logs -f livekit
```

---

## 5. Webhook Integration & Idempotency

When participants join or leave, LiveKit automatically fires signed HTTP POST requests to OgroniEdu:
- Endpoint: `https://api.ogroniedu.com/api/v1/classroom/webhook`
- Header: `Authorization: <livekit_sha256_jwt_token>`
- The backend's `LiveKitMediaProvider.verifyWebhook()` validates this signature using the matching `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
- Handled events:
  1. `participant_joined`: Records initial join timestamp and creates connection event.
  2. `participant_left`: Calculates incremental duration and logs attendance without duplicate count penalties.
  3. `room_finished`: Aggregates final attendance duration and transitions session state to `ENDED`.

---

## 6. Verification and Health Monitoring

### Health Endpoint
The OgroniEdu NestJS API provides an automated status endpoint:
```http
GET /api/health/media
```
Response:
```json
{
  "status": "ok",
  "provider": "livekit",
  "configured": true,
  "timestamp": "2026-10-26T15:47:00.000Z"
}
```

### In-Flight Class Verification
Run an end-to-end token generation check using the OgroniEdu CLI test script:
```bash
pnpm --filter @ogroniedu/api test classroom.service.spec.ts
```
