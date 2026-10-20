# Phase 07 — Test Plan (Safety, Safeguarding & Disputes)

## 1. Test Architecture & Objectives

Phase 07 test coverage ensures zero loopholes in child protection, strict financial invariant enforcement (escrow freeze during dispute), and tamper-proof dispute resolution.

---

## 2. Test Cases Matrix

| Category | Test Suite ID | Test Description | Expected Result |
| :--- | :--- | :--- | :--- |
| **Disputes** | `TC-DISP-001` | Non-participant attempts to open dispute on booking | Rejects with `403 ForbiddenException`. |
| **Disputes** | `TC-DISP-002` | Student opens dispute on confirmed booking with valid reason | Booking transitions to `disputed`, dispute record created, outbox event emitted. |
| **Disputes** | `TC-DISP-003` | User attempts to open duplicate dispute on same active booking | Rejects with `409 ConflictException` or constraint error. |
| **Disputes** | `TC-DISP-004` | Non-admin attempts to resolve dispute | Rejects with `403 ForbiddenException`. |
| **Disputes** | `TC-DISP-005` | Admin resolves dispute with `tutor_upheld` | Booking restored to `completed`/`in_progress`, resolution recorded. |
| **Disputes** | `TC-DISP-006` | Admin resolves dispute with `resolved_refund` | Triggers `RefundsService.createRefund`, updates dispute with `refund_id`. |
| **Financial Freeze** | `TC-FIN-001` | Tutor or admin attempts `SettlementService.settleMilestone` on a session belonging to a `disputed` booking | Throws `BadRequestException('Settlement blocked: Booking is currently under dispute review.')`. |
| **Safeguarding** | `TC-SAFE-001` | Safety report created with `child_safety` category | Auto-escalates to `urgent_child_safety` and status `escalated`. |
| **Safeguarding** | `TC-SAFE-002` | Admin applies protective safety hold to tutor | Tutor `safety_hold_status` becomes `safety_hold`, audit log recorded. |
| **Safeguarding** | `TC-SAFE-003` | Tutor on protective safety hold attempts to start learning session | `SessionReschedulingService.startSession` rejects with `ForbiddenException`. |
| **ABAC Privacy** | `TC-ABAC-001` | Reported tutor attempts to inspect confidential safety report | Rejects with `403 ForbiddenException`. |
| **ABAC Privacy** | `TC-ABAC-002` | Unrelated third-party user attempts to view booking dispute | Rejects with `403 ForbiddenException`. |
| **Frontend Web** | `TC-WEB-001` | Dispute modal validation (requires minimum 10 char narrative) | Form blocks submission until valid length provided. |
| **Frontend Web** | `TC-WEB-002` | Admin disputes page renders all 4 tabs and displays active dispute queue | Renders accurately with bilingual translation parity. |
