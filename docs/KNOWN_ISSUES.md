# OgroniEdu — Known Issues & Risk Register (P0–P3 Backlog)

**Document Reference:** `docs/KNOWN_ISSUES.md`  
**Audit Date:** 2026-10-22  
**Status:** Baseline Quality & Risk Inventory  
**Audited Against:** 80 Database Tables, 36 API Controllers, 83 Web Routes, 1,175 Automated Tests

---

## 1. Issue Severity Classification

- **P0 (Critical / Blocker):** Production risk, data corruption, financial vulnerability, security bypass, or broken primary business journey. Must be resolved before general public launch.
- **P1 (High):** Major functional imperfection, missing production gateway bindings, or degraded degraded operational capability.
- **P2 (Medium):** Suboptimal performance, edge-case UI inconsistencies, or incomplete auxiliary features.
- **P3 (Low / Polish):** Visual styling polish, minor localization discrepancies, or enhancement requests.

---

## 2. Priority Defect & Risk Register

| Issue ID | Severity | Feature Domain | Summary Description | Current Workaround / Status | Remediation Phase |
|---|:---:|---|---|---|:---:|
| **ISSUE-01** | **P0** | Payments & Payouts | Gateway adapters (SSLCommerz & bKash) operate in development sandbox mode; live IPN webhook secret signing not connected to production HSM | Mock/Sandbox adapters functioning; end-to-end sandbox verified | Phase 7 / 13 |
| **ISSUE-02** | **P0** | Safeguarding | Student minor status (<18) requires linked guardian, but manual guardian unlink could orphan active minor bookings | **RESOLVED & VERIFIED in Phase 1:** Active booking guard enforces HTTP 409 Conflict rejection if bookings in progress/dispute | Phase 1 (Resolved) |
| **ISSUE-03** | **P1** | Notifications | External SMS (SSL Wireless / Greenweb) and Email (SES) dispatchers use stubbed logger adapters; in-app WebSockets are 100% live | WebSocket real-time alerts active for all online users; offline queue needs gateway keys | Phase 9 |
| **ISSUE-04** | **P1** | Whiteboard Engine | Whiteboard canvas synchronization over Socket.IO lacks local indexedDB offline stroke buffer during temporary 3G/4G disconnections | Connection retry active; strokes during offline window require replay log | Phase 6 |
| **ISSUE-05** | **P1** | Storage & Uploads | Document uploads (NIDs, homework files) stored on local disk or MinIO emulator in dev; S3 production bucket lifecycle rules pending | Local multipart storage operational with virus/MIME validation | Phase 10 |
| **ISSUE-06** | **P2** | Tutor Verification | OCR extraction for Bangladesh Smart NID is best-effort and falls back to manual queue for unreadable scans | Operations compliance queue handles 100% of reviews manually | Phase 3 |
| **ISSUE-07** | **P2** | Search & Discovery | Full-text search on Tutors uses PostgreSQL `tsvector`; sub-100ms on 10k records, needs GIN index tuning if scaling past 100k | Indexed on `name`, `subject`, `district`, `curriculum` | Phase 4 |
| **ISSUE-08** | **P2** | Internationalization | Core UI translated to Bengali (`bn-BD`), but some nested system error toasts still emit default English strings | Fallback to English dictionary active; full glossary audit required | Phase 12 |
| **ISSUE-09** | **P3** | UI & Theming | Dashboard sessions page container width was recently expanded to full-width, but some secondary dialogs need gradient button styling verification | System palette applied; ongoing UI harmonization | Phase 11 |
| **ISSUE-10** | **P3** | Analytics & Recharts | Dashboard SVG chart re-renders can cause minor frame drops on low-end mobile browsers during rapid tab switching | React.memo and dynamic loading configured | Phase 11 / 14 |

---

## 3. Detailed Risk Analysis & Mitigation Plans

### 3.1 ISSUE-01: Payment Gateway Production Verification
- **Impact:** Inability to capture real BDT payments or disburse automated bKash/Nagad payouts if production merchant credentials or network firewalls fail.
- **Root Cause:** External telco MFS and merchant accounts require production company registration, PCI-DSS compliance, and white-listed static server IPs.
- **Mitigation Strategy:**
  1. Maintain dual-mode gateway architecture: `SandboxGateway` (active in dev/staging) and `ProductionGateway` (activated via encrypted environment variables).
  2. Implement strict IPN signature verification (`X-SSLCommerz-Signature`, `X-bKash-Token`).
  3. All payment transitions log to `financial_audit_trail` before triggering booking state changes.

### 3.2 ISSUE-02: Minor Safeguarding & Guardian Unlink Guard
- **Impact:** If a guardian unlinks a student under 18 while a booking is active, minor protection checks could be bypassed.
- **Root Cause:** Guardian-student relationship table had soft-delete capability without checking for `confirmed` or `in_progress` bookings.
- **Mitigation Strategy:**
  1. Enforce transactional guard in `GuardianStudentService.unlink()`: Reject unlink operation with `HTTP 409 Conflict` if any booking has status `in (awaiting_payment, confirmed, in_progress, dispute)`.
  2. Force administrative intervention if a guardian relationship must be severed during an active tuition cycle.

### 3.3 ISSUE-03: Real-Time Notification Fallback Stack
- **Impact:** Users offline when a session is booked, rescheduled, or cancelled will not receive immediate SMS or Email notifications until they log into the web app.
- **Root Cause:** Development environment does not bind to paid live telco SMS gateways to prevent test credit drainage.
- **Mitigation Strategy:**
  1. The in-app notification center persists all notifications to PostgreSQL `notifications` table.
  2. Whenever a user reconnects via WebSocket, unread notifications are immediately synchronized (`unread_count > 0`).
  3. Phase 9 binds external gateway credentials with retry queues (BullMQ + Redis) for offline SMS alerts.

### 3.4 ISSUE-04: Digital Whiteboard Resilience Under Low-Bandwidth
- **Impact:** Rural or mobile users on fluctuating 3G networks in Bangladesh may experience dropped drawing strokes.
- **Root Cause:** WebSocket packets dropped during socket reconnect cycles.
- **Mitigation Strategy:**
  1. Client-side local vector buffer: Draw events are timestamped and assigned monotonic sequence IDs.
  2. Upon socket reconnection, client sends `whiteboard:sync_request` with `last_seen_seq_id`; backend replays missing drawing deltas.

---

## 4. Technical Debt Tracking

| Debt Category | Component | Current State | Target State | Estimated Effort |
|---|---|---|---|---|
| **Code Redundancy** | Form Validation Schemas | Shared between `apps/api` and `apps/web` via duplicated Zod/class-validator | Move shared validation DTOs to `@ogroniedu/shared` package | 1.5 Days |
| **Test Fixtures** | Seed Script Data | Seed scripts populate 50 users and 20 tutors | Expand seed fixtures to cover edge cases: disputed bookings, 100-page ledgers | 1 Day |
| **CSS Consistency** | Modal Backgrounds & Gradients | Harmonized across main pages; some legacy modals still use direct hex codes | Enforce Tailwind semantic tokens (`bg-background`, `bg-card`, `text-foreground`) | 1 Day |
