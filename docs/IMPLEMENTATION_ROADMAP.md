# OgroniEdu — Implementation Roadmap & Execution Phases

**Date:** 2026-10-10  
**Status:** Approved Roadmap Baseline

---

## 1. Roadmap Overview & Milestones

The platform is engineered systematically across sequential, dependency-aware phases:

```
[Phase 0: Docs, Architecture, Monorepo Foundation & Real-Time Notification Slice]
                                  |
                                  v
         [Phase 1: Database Migrations, Seed Data & Identity Foundation]
                                  |
                                  v
         [Phase 2: Guardian-Student Links & Tutor Profile Onboarding]
                                  |
                                  v
         [Phase 3: Discovery, Availability Engine & Booking Concurrency]
                                  |
                                  v
         [Phase 4: Learning Management, Attendance & Assignments]
                                  |
                                  v
         [Phase 5: Payments, Escrow & Double-Entry Financial Ledger]
                                  |
                                  v
         [Phase 6: Trust, Reviews, Disputes & Replacement Guarantee]
                                  |
                                  v
         [Phase 7: Security Hardening, Performance Benchmarks & Launch]
```

---

## 2. Phase Breakdown

### Phase 0: Complete Documentation, Monorepo Foundation & Real-Time Notifications (Current)

- Complete, audit, and baseline all 25+ canonical documentation documents and ADRs.
- Establish Turborepo + pnpm workspace structure (`apps/web`, `apps/api`, `packages/contracts`, `packages/config`).
- Install all verified latest stable packages via CLI.
- Implement production-ready Centralized Real-Time Notification system (Socket.IO, PostgreSQL persistence, authenticated rooms, frontend toast & notification drawer, negative tests).

### Phase 1: Authentication, Authorization & Identity Management

- Mobile phone (+880 OTP) and Email authentication.
- Argon2id password hashing, HTTP-only refresh token cookies with replay detection.
- RBAC guards and session management.

### Phase 2: Guardian Operations & Tutor Onboarding

- Guardian multi-child registration and parental consent verification.
- Tutor profile creation, subject rate cards, NID/academic certificate uploads, and admin verification workflow.

### Phase 3: Tutor Discovery & Booking Concurrency Engine

- High-performance multi-facet tutor search with Redis caching.
- Weekly availability calendar and PostgreSQL GiST exclusion lock for overlapping session prevention.
- Booking request state machine (`requested` -> `accepted` -> `confirmed`).

### Phase 4: Tutor Workspace & Learning Management

- Session management, QR/PIN or tutor attendance logging (`present`, `late`, `absent`).
- Homework assignment creation, student submissions, and qualitative grading.
- Bi-weekly student progress reports with guardian notifications.

### Phase 5: Digital Payments & Double-Entry Ledger

- SSLCOMMERZ / bKash / Nagad payment integration with authenticated webhook verification.
- Escrow hold until session completion.
- Double-entry immutable accounting ledger in poisha.

### Phase 6: Reviews, Disputes & Tutor Replacement

- Moderated guardian/student ratings and reviews.
- Dispute escalation queue with admin arbitration.
- Automated tutor replacement guarantee workflow.

### Phase 7: Production Hardening, Load Testing & Launch

- STRIDE threat model verification and penetration testing.
- K6 load testing for 1,000 concurrent active users.
- Pilot launch in selected regional division (Sylhet/Chattogram/Dhaka).
