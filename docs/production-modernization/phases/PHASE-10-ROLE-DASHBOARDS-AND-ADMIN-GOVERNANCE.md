# Phase 10 — Role Dashboards & Admin Governance

**Phase ID:** `PHASE-10`  
**Phase Name:** Role Dashboards & Admin Governance  
**Estimated Effort:** 1 Day (Days 3–4)  
**Status:** READY  
**Owner:** Frontend Lead & Security/Governance Architect

---

## 1. Objective and Business Justification
Verify that each of the 9 canonical user roles has a secure, specialized, fully functional dashboard portal. Ensure administrative governance tools (tutor verification queue, financial ledger, user directory, dispute arbitration, audit logs, and temporary impersonation) operate with full audit accountability.

---

## 2. Current-State Findings and Evidence
- 5 primary dashboard portals: Student (`/dashboard/student`), Guardian (`/dashboard/guardian`), Tutor (`/dashboard/tutor`), Organization (`/dashboard/organization`), and Admin (`/dashboard/admin`).
- Guardian portal supports multi-child linking via `GuardianChildrenManager.tsx` (953 lines) and `guardian_students` table.
- Admin console contains specialized sub-consoles: verification, finance, disputes, replacements, taxonomy, and audit logs.
- Temporary administrative impersonation exists for SuperAdmins with a strict 15-minute expiration and audit logging.

---

## 3. Exact Scope
1. Verify role-based navigation and redirection from `/[locale]/dashboard` to the appropriate role portal.
2. Verify Student portal (sessions, assignments, payments, requests).
3. Verify Guardian portal (child switcher, academic summaries, emergency safety alert triggers).
4. Verify Tutor portal (availability calendar, earnings summary, verification level badge).
5. Verify Organization portal (member roster, branch coordinates).
6. Verify Admin governance console (user directory, account suspension, dispute arbitration, verification approvals).
7. Verify SuperAdmin impersonation safeguards (must terminate after 15 minutes; must log all actions).

---

## 4. Explicit Exclusions
- White-label organization branding customization (deferred post-MVP).

---

## 5. Prerequisite Phases
- `PHASE-02-FRONTEND-MODULARIZATION-PAGES.md`
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`
- `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`

---

## 6. Tasks and Unique Task IDs
- `DSH-001`: Verify role dashboard redirection and layout shell authorization.
- `DSH-002`: Verify student academic dashboard widgets and quick actions.
- `DSH-003`: Verify guardian multi-child oversight, safety holds, and replacement requests.
- `DSH-004`: Verify tutor earnings overview, payout requests, and dossier status.
- `DSH-005`: Verify admin user directory actions (suspend, reactivate, change role).
- `DSH-006`: Verify admin verification queue decision flow (approve, reject, request info).

---

## 7. Actual Affected Files and Modules
- `apps/web/src/features/dashboard/**/*`
- `apps/web/src/features/student/**/*`
- `apps/web/src/features/guardian/**/*`
- `apps/web/src/features/tutors/**/*`
- `apps/web/src/features/admin/**/*`
- `apps/api/src/modules/admin/**/*`

---

## 8. Files Created, Split, Moved, or Removed
- Modified: Dashboard feature components and admin services.

---

## 9. Frontend Work
- Ensure responsive sidebars collapse smoothly on mobile viewports.
- Ensure role-specific badges display bilingual labels accurately.

---

## 10. Backend Work
- Verify `@Roles(...ADMIN_ROLES)` on all administrative endpoints.

---

## 11. Database and Migration Work
- Verify audit log table partitioning and indexes.

---

## 12. Event-Driven Architecture Work
- Emit `admin.user_suspended`, `admin.verification_approved`, `admin.impersonation_started`.

---

## 13. Security Requirements
- BOLA check: Guardians can only view children linked to their account.
- Non-admins attempting to access `/dashboard/admin` receive immediate redirect or 403 Forbidden.

---

## 14. Unit Test Requirements
- `apps/web/test/role-dashboards.spec.ts` passes 3/3 tests.
- `apps/web/test/guardian-children.spec.ts` passes 8/8 tests.
- `apps/api/test/admin-governance-phase08.spec.ts` passes 8/8 tests.

---

## 15. Integration Test Requirements
- Role matrix test `apps/api/test/phase11-canonical-roles-matrix.spec.ts` passes 17/17 tests.

---

## 16. Browser Automation and E2E Scenarios
- Playwright spec `apps/web/e2e/admin.console.spec.ts` passes.
- Chrome DevTools MCP automated inspection of all 4 role portals.

---

## 17. Required Commands
```pwsh
pnpm --filter @ogroniedu/web test test/role-dashboards.spec.ts
pnpm --filter @ogroniedu/web test test/guardian-children.spec.ts
pnpm --filter @ogroniedu/api test test/phase11-canonical-roles-matrix.spec.ts
```

---

## 18. Acceptance Criteria
1. All 9 canonical roles navigate to their authorized portals without errors.
2. Guardians can link children and monitor sessions.
3. Admins can audit logs, verify tutors, and arbitrate disputes.
4. Impersonation sessions expire in 15 minutes.

---

## 19. Failure and Rollback Considerations
- Rollback any permission changes that inadvertently lock admins out of the console.

---

## 20. Definition of Done
- All 5 portals verified, admin governance fully operational and tested.

---

## 21. Expected Evidence
- Test logs for `role-dashboards.spec.ts` and `phase11-canonical-roles-matrix.spec.ts`.

---

## 22. Known Risks and Blockers
- None.

---

## 23. Estimated Effort
- 1 Day.

---

## 24. Next-Phase Dependencies
- Unblocks `PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md`.
