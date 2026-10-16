# ADR-005: Centralized Real-Time In-App Notification System with Socket.IO

**Status:** Accepted  
**Deciders:** Principal Architect, Full-Stack Lead  
**Date:** 2026-10-10

## Context

Educational operations (session confirmations, attendance marking, homework reminders, payment receipts) require prompt, dependable user notification. Sending notifications without centralization leads to inconsistent message formatting, fragmented authorization logic, and missed events when users are offline or reconnected. External channels (SMS/Email/WhatsApp) introduce external costs, telecom gateway delays, and third-party dependencies during early platform bootstrap.

## Decision

1. Implement a single, centralized `NotificationModule` with a strict `NotificationRegistry` defining all supported notification types, bilingual message templates, priority levels, and recipient eligibility rules.
2. In-app real-time WebSocket notifications via Socket.IO is the **sole active delivery channel for Phase 0**. Email, SMS, and WhatsApp are architected as abstracted future channels.
3. Every notification is atomically persisted in PostgreSQL before or alongside delivery, guaranteeing that offline recipients never miss notifications.
4. Server assigns sockets strictly to authenticated rooms (`user:<userId>`). Clients cannot join arbitrary rooms or dictate recipient lists.

## Consequences

- **Positive:** Instantaneous UI feedback, zero external SMS/email costs during development and initial pilot, resilient offline catching-up, and single point of audit.
- **Negative:** Requires persistent WebSocket connections and Redis adapter when scaling horizontally.
