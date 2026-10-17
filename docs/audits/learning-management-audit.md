# Phase 10 — Learning Management Audit Report

**Date of Audit:** 2026-10-10 14:30:00 BST  
**Auditor:** Principal Security Architect & Lead Backend Engineer (AI Pair Programmer)  
**Project:** OgroniEdu — Enterprise Tutoring and Educational Management Platform (Bangladesh)  
**Repository Working Directory:** `c:\Sofof_tech_2026\ogroniedu`  
**Phase Objective:** Implement learning records tied to authorized bookings: attendance tracking, homework assignments, student submissions, grading feedback, score revision auditing, progress reports, and guardian visibility with zero unsupported mastery claims.

---

## 1. Executive Summary

Phase 10 successfully implemented the authorized, attributable, and auditable Learning Management System (LMS) for OgroniEdu in compliance with `prompts/10-learning-management.md`:

1. **Definition of Done Enforced — "Records are authorized, attributable and auditable":**
   - **Authorized:** Strict role and attribute-based access control (ABAC). Unrelated learners and unlinked guardians are denied access (`403 Forbidden`). Only the booking's assigned tutor can assign homework or record attendance. Only the assigned student can submit homework.
   - **Attributable:** Every attendance record, homework assignment, student submission, grade, and progress report retains immutable foreign keys pointing to actor user IDs (`recordedBy`, `tutorUserId`, `studentUserId`, `reviewedBy`).
   - **Auditable:** All state transitions and score modifications write permanent entries into `audit_logs` with actor user IDs, timestamps, and safe metadata snapshots.
2. **Score Revision Audit Invariant:**
   - When a tutor reviews an already graded submission and modifies the score, the system enforces a strict revision workflow:
     - `revisionReason` is mandatory; omitting it throws `400 BadRequestException`.
     - The event is logged in `audit_logs` under action `learning.score_revised` capturing `previousScore`, `newScore`, `actorUserId`, and `reason`.
     - Submissions cannot exceed the assignment's `maxScore`.
3. **No Unsupported Mastery Claims:**
   - Progress reports separate objective, verifiable metrics calculated from the database from qualitative commentary:
     - Observable metrics: Attendance Rate (`attendanceRate`), Completed Homework count (`assignmentsCompleted`), and Average Score percentage (`averageScore`).
     - Qualitative narrative: Observable Progress (`observableProgress`), Areas for Growth (`areasForGrowth`), and Tutor Remarks (`tutorRemarks`).
     - Reports enforce chronological date integrity (`period_end >= period_start`) at both application and database constraint levels (`chk_progress_report_dates`).
4. **Guardian Oversight & Minor Safety:**
   - Guardians can only view learning records and progress reports of children actively linked to them via `guardian_student_links` (`status = 'active'`).
   - Unlinked, pending, or revoked guardians receive `403 Forbidden`.
   - Real-time notifications for attendance and graded assignments are automatically dispatched to both the student and all actively linked guardians.
5. **Database Migration (003):**
   - Created `packages/database/src/migrations/003_learning_management.sql` introducing `assignments`, `assignment_submissions`, and `progress_reports` tables with indexes and constraints.
   - Preserved initial `session_attendance` table and added negative database integrity tests.
6. **Frontend UI & Localization:**
   - Created [`LearningManagementView`](../../apps/web/src/features/learning/components/learningManagementView.tsx) with attendance cards, homework submission modal, grading modal with score revision reason prompt, and progress reports dashboard.
   - Routed at `/[locale]/learning` in [`apps/web/src/app/[locale]/(dashboard)/learning/page.tsx`](<../../apps/web/src/app/[locale]/(dashboard)/learning/page.tsx>).
   - Added `"learning"` namespace with 36 keys to both `en.json` and `bn.json` with 100% key parity and Bengali digit formatting.
7. **Automated Verification:**
   - 34 new automated unit, negative, and security tests added.
   - Full monorepo test suite stands at **240 passed tests, 0 failures, 0 skipped**.

---

## 2. Requirement Traceability Matrix (Phase 10 Scope)

| Requirement ID | Requirement Name                     | Implementation Files                                                                                                                                                                    | Test Suite                                                                                               | Verification Status                   |
| :------------- | :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------ |
| **FR-009**     | **Attendance & Homework LMS**        | `apps/api/src/modules/learning/learning.service.ts`<br>`apps/api/src/modules/learning/learning.controller.ts`<br>`apps/web/src/features/learning/components/learningManagementView.tsx` | `learning.service.spec.ts`<br>`learning.controller.spec.ts`<br>`learning.spec.ts`<br>`migration.spec.ts` | **COMPLETED & VERIFIED**              |
| **NFR-001**    | **No Cross-User Data Access (ABAC)** | `learning.service.ts` (`assertCanAccessStudentRecords`)                                                                                                                                 | `learning.service.spec.ts`                                                                               | **COMPLETED & VERIFIED**              |
| **NFR-004**    | **Bilingual Bengali & English**      | `apps/web/messages/en.json`<br>`apps/web/messages/bn.json`                                                                                                                              | `learning.spec.ts`                                                                                       | **COMPLETED & VERIFIED (36/36 Keys)** |

---

## 3. Database Schema & Migration Changes

### Migration File: `packages/database/src/migrations/003_learning_management.sql`

```sql
-- 1. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    session_id UUID REFERENCES booking_sessions(id) ON DELETE SET NULL,
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    instructions TEXT,
    due_at TIMESTAMPTZ,
    max_score NUMERIC(5,2) DEFAULT 100.00 CHECK (max_score > 0),
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Assignment Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id),
    submission_text TEXT,
    asset_ids UUID[] NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'reviewed', 'returned')),
    score NUMERIC(5,2) CHECK (score IS NULL OR score >= 0),
    max_score NUMERIC(5,2) CHECK (max_score IS NULL OR max_score >= score),
    tutor_feedback TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(assignment_id, student_user_id)
);

-- 3. Progress Reports Table
CREATE TABLE IF NOT EXISTS progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES users(id),
    tutor_user_id UUID NOT NULL REFERENCES tutor_profiles(user_id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    attendance_rate NUMERIC(5,2) NOT NULL CHECK (attendance_rate BETWEEN 0 AND 100),
    assignments_completed INT NOT NULL DEFAULT 0 CHECK (assignments_completed >= 0),
    average_score NUMERIC(5,2) CHECK (average_score IS NULL OR (average_score BETWEEN 0 AND 100)),
    observable_progress TEXT NOT NULL,
    areas_for_growth TEXT,
    tutor_remarks TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_progress_report_dates CHECK (period_end >= period_start)
);
```

---

## 4. Test Verification Outcomes

### Command: `pnpm test`

- **Total Test Files:** 33 passed (0 failed, 0 skipped)
- **Total Tests:** 240 passed (0 failed, 0 skipped)
- **Breakdown:**
  - `@ogroniedu/database`: 9 passed tests across 2 test files (including negative constraint checks for `chk_progress_report_dates` and exclusion constraints).
  - `@ogroniedu/api`: 194 passed tests across 22 test files (including 19 unit & security tests in `learning.service.spec.ts` and 8 tests in `learning.controller.spec.ts`).
  - `@ogroniedu/web`: 37 passed tests across 9 test files (including 3 tests in `learning.spec.ts`).

### Command: `node scripts/validate-documentation.js`

- **Outcome:** PASSED on 123 Markdown, Mermaid, and SQL files.

### Command: `pnpm typecheck`

- **Outcome:** Clean exit code 0 across all 5 packages.

---

## 5. Security & Invariant Analysis

1. **Unrelated Learner Denial:** Tested in `learning.service.spec.ts`. An unlinked student attempting to access summary records or submit homework on another student's assignment is immediately blocked with `ForbiddenException`.
2. **Learner Grade Tampering Prevention:** Tested in `learning.service.spec.ts`. Students cannot invoke grading endpoints; only the booking's assigned tutor or an administrator can assign scores.
3. **Score Revision Audit Trail:** Tested in `learning.service.spec.ts`. Changing an existing score triggers audit logging with `previousScore`, `newScore`, `reason`, and actor metadata.
4. **Data Isolation:** Queries are strictly scoped to verified booking/session relationships and active guardian links.
