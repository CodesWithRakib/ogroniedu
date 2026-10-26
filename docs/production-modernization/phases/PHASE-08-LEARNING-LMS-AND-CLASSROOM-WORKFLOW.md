# Phase 08 — Learning LMS & Classroom Workflow

**Phase ID:** `PHASE-08`  
**Phase Name:** Learning LMS & Classroom Workflow  
**Estimated Effort:** 1 Day (Day 4)  
**Status:** READY  
**Owner:** Frontend Lead & LMS Domain Architect

---

## 1. Objective and Business Justification

Harden the post-booking learning experience: assignments, homework submissions, rubric-based grading, attendance recording, lesson planning, and the virtual classroom workspace. Clarify the classroom whiteboard scope in alignment with actual codebase implementation.

---

## 2. Current-State Findings and Evidence

- LMS entities exist in `packages/database/src/migrations/023_learning_lms.sql` (`assignments`, `assignment_submissions`, `lesson_plans`, `learning_materials`, `learning_goals`).
- Classroom workspace renders in `apps/web/src/features/classroom/components/ClassroomWorkspace.tsx` (771 lines).
- Interactive whiteboard (`InteractiveWhiteboard.tsx`, 822 lines) is a local HTML5 canvas drawing engine; it lacks multi-user Socket.IO synchronization (`RLD-003`).
- Google Meet URL integration is supported for real-time video sessions.

---

## 3. Exact Scope

1. Verify assignment creation by tutors, student submission file uploads, and tutor grading drawers.
2. Verify session attendance recording (present, absent, late, excused) by tutors.
3. Verify lesson planning and curriculum milestone progress tracking.
4. Align classroom documentation and UI copy: clarify that whiteboard is an interactive local canvas and sessions use Google Meet for live video.
5. Decompose oversized LMS route pages (`assignments/[id]`, `sessions/[id]`).

---

## 4. Explicit Exclusions

- Do not implement custom WebRTC video streaming (Google Meet launcher handles video conferencing).
- Do not build multi-user canvas CRDT synchronization during MVP window (deferred post-MVP).

---

## 5. Prerequisite Phases

- `PHASE-02-FRONTEND-MODULARIZATION-PAGES.md`
- `PHASE-03-BACKEND-SERVICE-INTERFACE-MODULARIZATION.md`
- `PHASE-07-CORE-MARKETPLACE-AND-BOOKINGS-WORKFLOW.md`

---

## 6. Tasks and Unique Task IDs

- `LMS-001`: Verify assignment creation, student submission, and rubric grading drawer.
- `LMS-002`: Verify session attendance recording and student progress reporting.
- `LMS-003`: Verify lesson planner and curriculum topic milestone checklist.
- `LMS-004`: Re-scope whiteboard claim in documentation and UI (resolve RLD-003).
- `LMS-005`: Verify Classroom workspace Google Meet launch button and formula sheet drawer.

---

## 7. Actual Affected Files and Modules

- `apps/web/src/features/learning/**/*`
- `apps/web/src/features/classroom/**/*`
- `apps/api/src/modules/learning/**/*`

---

## 8. Files Created, Split, Moved, or Removed

- Modified: LMS feature components and services.

---

## 9. Frontend Work

- Ensure assignment submission uploader displays file size and format limits.
- Ensure classroom formulas drawer opens smoothly without layout shifts.

---

## 10. Backend Work

- Verify student homework submission endpoint checks booking participation before upload.

---

## 11. Database and Migration Work

- Verify foreign keys on `assignments` and `assignment_submissions`.

---

## 12. Event-Driven Architecture Work

- Emit `assignment.created`, `assignment.submitted`, `assignment.graded`.

---

## 13. Security Requirements

- BOLA check: Ensure students can only submit solutions to assignments assigned to their booking.

---

## 14. Unit Test Requirements

- `apps/web/test/learning-phase06.spec.ts` passes 6/6 tests.
- `apps/web/test/classroom.spec.ts` passes 5/5 tests.
- `apps/api/test/learning.controller.spec.ts` passes 10/10 tests.

---

## 15. Integration Test Requirements

- Verify progress report calculations reflect submitted assignments and attendance.

---

## 16. Browser Automation and E2E Scenarios

- Playwright E2E verifies assignment submission flow.

---

## 17. Required Commands

```pwsh
pnpm --filter @ogroniedu/web test test/learning-phase06.spec.ts
pnpm --filter @ogroniedu/web test test/classroom.spec.ts
pnpm --filter @ogroniedu/api test test/learning.controller.spec.ts
```

---

## 18. Acceptance Criteria

1. Tutors can create assignments, attach materials, and grade submissions.
2. Students can upload submission files and view grades and rubrics.
3. Attendance can be recorded and updates progress analytics.
4. Classroom workspace launches Google Meet cleanly.

---

## 19. Failure and Rollback Considerations

- Rollback any grading formula changes that alter student GPA or percentage calculations.

---

## 20. Definition of Done

- LMS workflows verified, classroom scoped accurately, tests passing.

---

## 21. Expected Evidence

- Test logs for `learning-phase06.spec.ts` and `classroom.spec.ts`.

---

## 22. Known Risks and Blockers

- None.

---

## 23. Estimated Effort

- 1 Day.

---

## 24. Next-Phase Dependencies

- Unblocks `PHASE-09-COMMUNICATION-MESSAGING-AND-NOTIFICATIONS.md` and `PHASE-11-REGRESSION-TESTING-AND-BROWSER-AUTOMATION.md`.
