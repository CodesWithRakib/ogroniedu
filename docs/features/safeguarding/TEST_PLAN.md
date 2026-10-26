# Safeguarding and Incident Testing Plan

**Document Identifier:** `TEST-SAFEGUARDING-001`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Test Matrix Overview

The test matrix validates the security boundaries, state transitions, confidentiality rules, and financial invariants across the workspace.

---

## 2. 12 Mandatory Authorization Security Tests

|   #    | Test Case Description                                                      | Target Component                            | Expected Behavior                             |
| :----: | :------------------------------------------------------------------------- | :------------------------------------------ | :-------------------------------------------- |
| **1**  | Accused tutor accesses confidential report filed about them                | `SafetyReportsService.getReport`            | **HTTP 403 / 404** (Strictly Masked)          |
| **2**  | Guardian attempts to access confidential report submitted by minor         | `SafetyReportsService.getReport`            | **HTTP 403 / 404** (Child Privacy Protected)  |
| **3**  | Student attempts to read another student's report                          | `SafetyReportsService.getReport`            | **HTTP 403 / 404** (Scoping Enforced)         |
| **4**  | Support agent attempts to access unassigned sensitive safeguarding case    | `SafetyReportsService.getReport`            | **HTTP 403 Forbidden** (Role Segregation)     |
| **5**  | Organization owner accesses confidential report within tenancy             | `SafetyReportsService.getReport`            | **HTTP 403 Forbidden** (No Tenancy Bypass)    |
| **6**  | Implicated investigator/admin attempts to assign or resolve report         | `SafetyReportsService.assignCase`           | **Conflict Exception / 403** (Conflict Guard) |
| **7**  | User attempts ID substitution to download evidence from another case       | `SafetyReportsService.getEvidenceStream`    | **HTTP 403 Forbidden** (Attachment Guard)     |
| **8**  | Public API attempt to arbitrarily set case status to `resolved` / `closed` | `SafetyReportsController.updateStatus`      | **HTTP 403 Forbidden** (State Guard)          |
| **9**  | Unauthorized user attempts to apply or revoke safety action                | `SafetyReportsController.applySafetyAction` | **HTTP 403 Forbidden** (Admin Guard)          |
| **10** | Dispute resolution refund attempt triggers duplicate or ledger bypass      | `DisputesService.resolveDispute`            | **Conflict / Idempotent Reject**              |
| **11** | Safeguarding notification template evaluation leaks sensitive allegations  | Notification Contract / Gateway             | **Generic Template Emitted**                  |
| **12** | Case status update executed without writing required audit record          | `SafetyReportsService.updateStatus`         | **Atomic DB Transaction Rollback**            |

---

## 3. End-to-End Test Workflows

- **Flow A: General Complaint:** User submits general complaint -> triaged by support -> message exchange -> resolution.
- **Flow B: Confidential Safeguarding Report:** Student submits confidential safety report -> stored privately -> compliance queue alerted -> accused tutor cannot see it -> investigator resolves.
- **Flow C: Urgent Escalation:** User submits critical safety report -> system triggers immediate escalation (`urgent_child_safety`) -> emergency alert emitted -> safety action applied.
- **Flow D: Conflict of Interest:** User reports an investigator/admin -> conflict guard blocks self-assignment -> independent compliance reviewer assigned.
- **Flow E: Financial Dispute:** Customer disputes booking -> escrow settlement frozen -> admin approves refund -> double-entry ledger journals posted.
