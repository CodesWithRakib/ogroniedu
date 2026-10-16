# 00 — Executive Summary

## Product

Build a Bangladesh-first tutoring marketplace plus practical tutoring operations workspace. Connect guardians, independent learners, verified tutors, and optionally coaching organizations. Launch in one locality first, then expand only after evidence of repeat bookings, tutor reliability, operational capacity, and willingness to pay.

## Differentiation

- Documented tutor verification and transparent profile claims
- Booking agreements, pricing, attendance, session history and receipts
- Homework, assessments, progress records and guardian visibility
- Clear cancellation, replacement, complaint and dispute processes
- Tutor scheduling and administrative tools
- Server-verified payment state and auditable settlement
- Exportable user-owned educational records

## Delivery approach

Start with a modular monolith and explicit domain boundaries. Avoid microservices and proprietary live video in MVP. Use third-party meeting links initially. Prioritize authorization, schedule integrity, payments, auditability, and tests before advanced AI matching.

## Suggested MVP order

1. Discovery and repository audit
2. Architecture, monorepo, CI and design system
3. Database/migrations, authentication and permissions
4. Guardian/student/tutor profiles and verification
5. Tutor discovery and requests
6. Booking and conflict-safe scheduling
7. Attendance and learning continuity
8. Sandbox payments, refunds and reconciliation
9. Admin/support/notifications
10. Security, testing, deployment and local pilot

## Risks

Marketplace liquidity, minor safety, false credential claims, off-platform circumvention, payment reconciliation, legal/provider uncertainty, support load, scope creep, and untested backups. Treat legal and provider requirements as verification gates, not assumptions.
