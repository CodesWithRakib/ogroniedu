# OgroniEdu — Known Limitations & Architectural Scope Bounds

**Date:** 2026-10-10  
**Phase:** Phase 0 Baseline  
**Status:** Canonical Reference

---

## 1. Intentional Scope Limitations in Initial Release

To maintain laser focus on delivering a robust, dependable foundation without unnecessary complexity, the following capabilities are explicitly bounded:

1. **In-App Real-Time Notifications Only:**
   - As mandated by Phase 0 architecture, **in-app real-time WebSocket notifications via Socket.IO are the sole active delivery channel**.
   - Outbound Email (SendGrid/SES), SMS (Bangladesh Telco aggregators like SSL Wireless / InfoBip), and WhatsApp Business API are architected as decoupled future extension points and are **not integrated in Phase 0**. No live third-party SMS or email credentials are required to run the platform.
2. **Coaching Center / Institutional Tenancy Deferred:**
   - Multi-branch coaching centers and corporate tutoring institutes are deferred to Phase 2. The initial release serves 1-on-1 private tutors and independent freelance educators.
3. **Admin Impersonation Disabled:**
   - To protect student privacy and prevent catastrophic privilege escalation, admin account impersonation ("login as user") is intentionally omitted. Support agents use read-only diagnostic audit consoles.
4. **Local Development Docker vs Windows Native Services:**
   - PostgreSQL 18 is running as a native Windows service. Docker is not installed on the host. Local builds, migrations, and test suites are configured to execute natively against local PostgreSQL and memory/Redis adapters.
5. **Simulated Payment Gateway Sandbox:**
   - Gateway integration utilizes sandbox credentials for SSLCOMMERZ / bKash rather than live production merchant accounts during development phases.
