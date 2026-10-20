# Role and Permission Matrix

**Document Identifier:** `SEC-SAFEGUARDING-RBAC-001`  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Action-Level Permission Matrix across All 9 Platform Roles

| Operational Action | Student | Guardian | Tutor | Org Staff | Org Owner | Support Agent | Compliance Reviewer | Admin | Super Admin |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Submit Report / Complaint** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Own Submitted Case** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Minor Child's Case** | ❌ (N/A) | ⚠️ (1) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Accused Reports (Self)** | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) | ❌ (2) |
| **View General Support Queue** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View Safeguarding Queue** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (3) | ✅ | ✅ | ✅ |
| **Assign Investigator** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Self-Assign / Resolve When Implicated** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (4) | ❌ (4) | ❌ (4) | ❌ (4) |
| **Read Internal Investigator Notes** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Add Internal Investigator Notes** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Download Case Evidence** | ⚠️ (5) | ⚠️ (5) | ❌ | ❌ | ❌ | ⚠️ (6) | ✅ | ✅ | ✅ |
| **Apply Immediate Safety Action** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Resolve Safeguarding Case** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Reopen Closed Case** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 2. Policy Footnotes & Boundary Invariants

1. **Guardian Access Rule (1):**
   - Guardians may view reports submitted by their child ONLY IF `is_confidential = false` or where the report explicitly links the guardian.
   - If a minor flags a report as confidential or reports intra-family or guardian abuse, the report is strictly masked from the guardian's dashboard to prevent child retaliation.
2. **Accused User Masking (2):**
   - The accused person (e.g. reported tutor) CANNOT view confidential reports, internal investigator notes, or evidence assets submitted against them through any API or dashboard route. Probing returns HTTP 404/403.
3. **Separation of Queues (3):**
   - General `support_agent` users cannot view sensitive safeguarding allegations unless granted explicit `compliance_reviewer` delegation.
4. **Conflict of Interest Guard (4):**
   - If an investigator, admin, or super admin is named in `reportedUserId` or `conflictUserIds`, their access to assign, edit, or resolve that case is blocked.
5. **Reporter Evidence Access (5):**
   - Reporters can only download evidence assets that they personally uploaded to the case.
6. **Support Agent Evidence Access (6):**
   - Limited to non-sensitive general tickets or explicitly assigned service disputes.
