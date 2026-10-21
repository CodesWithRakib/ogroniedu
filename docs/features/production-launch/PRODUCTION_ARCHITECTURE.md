# OgroniEdu — Production Architecture Specification

## 1. System Topology Overview

OgroniEdu is designed as a modular, high-availability tutoring marketplace and learning management SaaS platform tailored for the Bangladesh education ecosystem.

```mermaid
flowchart TD
    subgraph Client Tier
        W["Next.js Web Client<br/>(React 19 / SSR / App Router)"]
        M["Mobile Responsive Browser / PWA"]
    end

    subgraph Edge & Ingress
        CF["Cloudflare CDN / DDoS Protection"]
        LB["Load Balancer / NGINX Reverse Proxy<br/>(SSL/TLS Termination, HSTS, Brotli)"]
    end

    subgraph Application Tier
        API["NestJS API Instances<br/>(Node.js v26 / Express / Cluster Mode)"]
        WS["Socket.IO Gateway<br/>(/notifications namespace)"]
    end

    subgraph Data & Storage Tier
        DB[("PostgreSQL 18<br/>(Connection Pooling / Read Replicas)")]
        RD[("Redis 7.x Cache & Queue<br/>(Session Cache / PubSub)")]
        SB[("Supabase Storage<br/>(S3-compatible, Signed URLs)")]
    end

    subgraph External Services
        SSL["SSLCOMMERZ Gateway<br/>(Cards, MFS, Internet Banking)"]
        BK["bKash Gateway<br/>(Tokenized Checkout API)"]
        SMS["SMS Aggregator Gateway<br/>(Bangladeshi Masking SMS)"]
    end

    W --> CF
    M --> CF
    CF --> LB
    LB -->|HTTP / REST| API
    LB -->|WSS / WebSockets| WS
    API --> DB
    API --> RD
    API --> SB
    WS --> RD
    API --> SSL
    API --> BK
    API --> SMS
```

---

## 2. Component Specifications

### 2.1 Frontend Application (`@ogroniedu/web`)
- **Technology:** Next.js 15.5.3, React 19, Tailwind CSS v4, Lucide React icons.
- **Port Allocation:** Port 5000 (Internal Docker container or Node service).
- **Theme Standard:** Strictly Light Theme (Royal Sapphire Blue `#2563EB` to Indigo `#4F46E5` primary gradient, slate backgrounds, pure white `#FFFFFF` cards, high-contrast accessible typography).
- **Rendering Strategy:** Static rendering for marketing/SEO pages (`/`, `/about`, `/tutors`), dynamic Server-Side Rendering (SSR) for personalized dashboards (`/dashboard`, `/sessions`, `/guardian`).
- **Security Headers:** Strict Content Security Policy (CSP), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin.

### 2.2 Backend Application (`@ogroniedu/api`)
- **Technology:** NestJS 11.0.1, TypeScript 5.8, Express adapter.
- **Port Allocation:** Port 4000.
- **API Standard:** Envelope standard:
  - Success: `{ success: true, data: T, message?: string, meta: { requestId, pagination? } }`
  - Error: `{ success: false, error: { code, message, details? }, meta: { requestId } }`
- **Global Pipes & Interceptors:**
  - `ValidationPipe`: Whitelist, forbidNonWhitelisted, transform enabled.
  - `ResponseMetaInterceptor`: Injects `requestId` and execution metadata.
  - `AllExceptionsFilter`: Sanitizes 5xx errors; logs full server trace while hiding internals from clients.
  - `ThrottlerGuard`: Strict rate limiting (e.g. 100 req/min for general API, 5 req/min for auth OTPs).

### 2.3 Database Tier (`@ogroniedu/database`)
- **Engine:** PostgreSQL 18.
- **Connection Management:** Connection pool size 20–50 connections with SSL (`sslmode=require`).
- **Schema Management:** 29 sequential, idempotent SQL migrations with transactional safety (`schema_migrations` tracking table).
- **Data Integrity:** Foreign keys with `ON DELETE RESTRICT` for financial and booking records, composite indexes for search performance, and check constraints for domain integrity.

### 2.4 Realtime WebSockets Gateway
- **Technology:** Socket.IO v4.
- **Namespace:** `/notifications`.
- **Authentication:** JWT handshake validation before socket establishment.
- **Events Handled:** Real-time in-app notifications, booking chat messages, live typing indicators, session reminders, and safeguarding SOS alerts.

### 2.5 Object Storage
- **Provider:** Supabase Storage (S3-compatible).
- **Access Model:** Private buckets for identity verification dossiers, certificates, and safeguarding incident evidence. Public read-only bucket for tutor profile avatars.
- **Delivery:** Time-limited presigned URLs (15-minute expiration) generated on demand via `FilesService`.

---

## 3. Critical Workflow Request Paths

### 3.1 Student Booking & Escrow Payment
```mermaid
sequenceDiagram
    autonumber
    actor S as Student / Guardian
    participant W as Web Frontend (5000)
    participant API as NestJS API (4000)
    participant DB as PostgreSQL (5432)
    participant PG as Payment Gateway (SSLCOMMERZ / bKash)

    S->>W: Selects Tutor & Time Slot
    W->>API: POST /api/v1/bookings
    API->>DB: Verify Tutor Availability & Create Booking (status: pending_payment)
    API->>PG: Initialize Payment Session (with Idempotency Key)
    PG-->>API: Return Gateway Redirect URL
    API-->>W: Return Redirect URL
    W->>PG: User completes payment on Gateway
    PG->>API: Webhook / IPN Notification (POST /webhook/payment)
    API->>API: Verify Gateway Signature & Idempotency
    API->>DB: Transition Booking to 'confirmed' & Credit Escrow Ledger
    API-->>PG: HTTP 200 OK
    API->>W: Push WebSocket Notification ('booking_confirmed')
    W-->>S: Display Booking Confirmation
```

### 3.2 Live Session Safeguarding SOS Escalation
```mermaid
sequenceDiagram
    autonumber
    actor U as Student / Tutor
    participant W as Web Frontend
    participant API as NestJS API
    participant DB as PostgreSQL
    participant SO as Safeguarding Team

    U->>W: Triggers Emergency SOS Button
    W->>API: POST /api/v1/safeguarding/sos-emergency
    API->>DB: Log Immediate Incident Record & Lock Session Recording
    API->>API: Emit Realtime Broadcast to Safeguarding Channel
    API->>SO: Send SMS & High-Priority Email to Safeguarding Officers
    API-->>W: Acknowledge SOS Received with Local Helpline Numbers (999 / 1098)
    W-->>U: Display Emergency Guidance & Helpline Contacts
```
