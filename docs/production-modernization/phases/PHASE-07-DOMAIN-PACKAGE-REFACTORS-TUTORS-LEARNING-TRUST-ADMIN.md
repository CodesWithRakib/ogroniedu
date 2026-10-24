# Phase 7 — Domain Package Refactors (tutors/learning/trust/admin)

**Date:** Day 6 of 7-day sprint  
**Duration:** 2 days (1 day each for two packages)  
**Owner:** Backend Lead  

---

## Day 1 (Tutors Package)

### Objective

Extract the tutors domain into `@ogroniedu/tutors` package, isolating tutor profile, verification, qualification, and availability logic.

### Scope

| Task | Description |
|---|---|
| S7.1 | Create `packages/tutors/` structure with `src/`, `__tests__/`, `index.ts`, `package.json` |
| S7.2 | Move `TutorsService` (core CRUD, verification, qualification, subject mapping) to `packages/tutors/src/services/tutors.service.ts` |
| S7.3 | Move tutor verification logic (`TutorVerificationService`, `ReviewService`) to `packages/tutors/src/services/verification/` |
| S7.4 | Move availability/blocked periods (`TutorAvailabilityService`, `BlockedPeriodsService`) to `packages/tutors/src/services/availability/` |
| S7.5 | Extract interfaces: `ITutorService`, `IVerificationService`, `IAvailabilityService` into `@ogroniedu/contracts/src/tutors.ts` |
| S7.6 | Update `apps/api/src/modules/tutors/` to import from `@ogroniedu/tutors` |
| S7.7 | Move existing tutors unit tests to `packages/tutors/__tests__/` |
| S7.8 | Run `pnpm turbo run build` and `pnpm turbo run test:unit --filter=tutors` — 100% pass |

### Acceptance Criteria

- [ ] `@ogroniedu/tutors` builds successfully
- [ ] Tutor profile management unchanged behavior
- [ ] Tutor verification queue functional (admin can review, approve, reject)
- [ ] Tutor availability query performance unchanged or improved
- [ ] All tutors unit tests pass after extraction

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Service registration breakage | Keep exported services identical in TypeScript interfaces; use barrel exports |

---

## Day 2 (Learning Package)

### Objective

Extract the learning domain into `@ogroniedu/learning` package, isolating assignments, submissions, lesson plans, and progress reports.

### Scope

| Task | Description |
|---|---|
| S7.9 | Create `packages/learning/` structure with `src/services/`, `__tests__/`, `index.ts` |
| S7.10 | Split `LearningService` into sub-services: `AssignmentsService`, `SubmissionsService`, `LessonPlansService`, `ProgressReportsService` |
| S7.11 | Move related handlers (e.g., `assignment.created` event) into each sub-service |
| S7.12 | Extract interfaces: `IAssignmentService`, `ISubmissionsService`, `ILessonPlansService`, `IProgressReportsService` into `@ogroniedu/contracts/src/learning.ts` |
| S7.13 | Update `apps/api/src/modules/learning/` to import from `@ogroniedu/learning` package |
| S7.14 | Move all learning unit tests to `packages/learning/__tests__/` |
| S7.15 | Run `pnpm turbo run build` and `pnpm turbo run test:unit --filter=learning` — 100% pass |

### Acceptance Criteria

- [ ] `@ogroniedu/learning` builds successfully
- [ ] Assignment lifecycle unchanged (create, submit, grade) behavior
- [ ] Lesson plan CRUD functional for tutor/admin
- [ ] Progress report generation unchanged
- [ ] All learning unit tests pass after package extraction

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Grade state machine breaks | Keep `GradeSubmissionDto` and `GradeResponseDto` identical; mirror validation logic |

---

*End of Phase 7.*
