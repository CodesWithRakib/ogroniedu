# Phase 09: Admin Operations, Organization Management & Platform Governance — Role & Permission Matrix

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Phase:** 09: Admin Operations, Organization Management & Platform Governance  
**Date:** October 21, 2026  
**Status:** Approved Specification & Enforced Policy

---

## 1. Canonical 9-Role Taxonomy

1. **`student`**: Enrolled learner.
2. **`guardian`**: Parent/legal guardian managing student bookings and progress.
3. **`tutor`**: Verified individual academic educator.
4. **`support_agent`**: Customer success and operational support staff.
5. **`compliance_reviewer`**: Legal and child protection safeguarding investigator.
6. **`admin`**: Platform operational administrator.
7. **`super_admin`**: Root platform governance executive.
8. **`organization_owner`**: Proprietor/principal of a coaching center or tutoring agency.
9. **`organization_staff`**: Academic coordinator or manager within an organization.

---

## 2. Comprehensive Permissions Matrix

| #      | Operational Capability            |   Student   | Guardian |  Tutor   |  Support Agent  | Compliance Reviewer  |       Admin        |  Super Admin   |    Org Owner    |    Org Staff     | Policy & Enforcement Rule                                         |
| :----- | :-------------------------------- | :---------: | :------: | :------: | :-------------: | :------------------: | :----------------: | :------------: | :-------------: | :--------------: | :---------------------------------------------------------------- |
| **1**  | **View Role Dashboard**           |   ✅ Own    |  ✅ Own  |  ✅ Own  |   ✅ Support    |    ✅ Compliance     |     ✅ Master      |   ✅ Master    |     ✅ Org      |      ✅ Org      | Renders role-specific metrics only.                               |
| **2**  | **View Users Directory**          |     ❌      |    ❌    |    ❌    |  🔍 Read-only   |       🔍 Case        |       ✅ All       |     ✅ All     |  🔍 Org Tutors  |  🔍 Org Tutors   | Full directory access restricted to platform staff.               |
| **3**  | **Suspend / Reactivate Accounts** |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |  🔍 Users/Tutors   |  ✅ All Users  |       ❌        |        ❌        | Admin cannot suspend super_admin; mandatory audit reason.         |
| **4**  | **Review Tutor Verification**     |     ❌      |    ❌    |    ❌    |       ❌        |   ✅ Level Review    |  ✅ Level Review   |    ✅ Full     |       ❌        |        ❌        | Compliance & Admin approve/reject submitted tiers.                |
| **5**  | **View & Manage Bookings**        |   🔍 Own    | 🔍 Ward  |  🔍 Own  |   🔍 Assigned   |       🔍 Case        |    ✅ Platform     |  ✅ Platform   | 🔍 Org Bookings | 🔍 Org Bookings  | Tenant and participant scoped.                                    |
| **6**  | **Emergency Cancel Booking**      |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |     ✅ Audited     |   ✅ Audited   |       ❌        |        ❌        | Initiates automatic ledger refund request.                        |
| **7**  | **View Financial Summaries**      |   🔍 Own    | 🔍 Ward  |  🔍 Own  |       ❌        |          ❌          |    ✅ Platform     |  ✅ Platform   |  🔍 Org Escrow  |        ❌        | Support & compliance agents strictly excluded.                    |
| **8**  | **Process Refunds & Payouts**     |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |   🔍 Queue Audit   |   ✅ Execute   |       ❌        |        ❌        | Routed through `RefundsService` & `PayoutsService`.               |
| **9**  | **Access Safeguarding Cases**     | 🔍 Reporter | 🔍 Ward  |    ❌    |       ❌        | ✅ Full Adjudication |   ❌ Restricted    | ✅ Escalations |       ❌        |        ❌        | Confidential child protection records; hidden from Admin/Support. |
| **10** | **Access Support Tickets**        |   🔍 Own    |  🔍 Own  |  🔍 Own  | ✅ Triage Queue |          ❌          |      ✅ Full       |    ✅ Full     |       ❌        |        ❌        | Customer support queue management.                                |
| **11** | **Moderate Reviews**              |     ❌      |    ❌    | 🔍 Reply |       ❌        |          ❌          |      ✅ Full       |    ✅ Full     |       ❌        |        ❌        | Automated safety filters + admin review.                          |
| **12** | **Manage Organizations (Global)** |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          | ✅ Approve/Suspend |    ✅ Full     |       ❌        |        ❌        | Platform admins govern organization lifecycles.                   |
| **13** | **Manage Own Organization**       |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |         ❌         |       ❌       |   ✅ Own Org    | 🔍 View Profile  | Tenant-scoped to verified organization membership.                |
| **14** | **Invite / Remove Org Members**   |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |         ❌         |       ❌       |     ✅ Full     | 🔍 Invite Tutors | Owners govern staff & tutors; cannot self-promote.                |
| **15** | **Transfer Org Ownership**        |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |         ❌         |  ✅ Emergency  |  ✅ Controlled  |        ❌        | Requires 2-step confirmation and active member recipient.         |
| **16** | **Change Platform Settings**      |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |    ❌ View Only    |  ✅ Full Edit  |       ❌        |        ❌        | Modifying platform fees/windows restricted to `super_admin`.      |
| **17** | **Manage User Roles**             |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |         ❌         |    ✅ Full     |       ❌        |        ❌        | Assigning or revoking system roles is root-only.                  |
| **18** | **View Audit Logs**               |     ❌      |    ❌    |    ❌    |       ❌        |     🔍 Case Logs     |    ✅ Redacted     | ✅ Full Audit  |  🔍 Org Audit   |        ❌        | PII redaction active; tenant scoping enforced.                    |
| **19** | **Export Reports (CSV)**          |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |    ✅ Safe CSV     |  ✅ Safe CSV   |   🔍 Org CSV    |        ❌        | Anti-formula injection enforced on all CSV cells.                 |
| **20** | **Emergency Impersonation**       |     ❌      |    ❌    |    ❌    |       ❌        |          ❌          |         ❌         | ✅ Max 15 mins |       ❌        |        ❌        | Fully audited session; strictly for technical troubleshooting.    |

---

## 3. Scope & ABAC Enforcement Rules

1. **Deny by Default**: Any endpoint without an explicit `@Roles(...)` or `@UseGuards(...)` decorator inherits zero access.
2. **Tenant Scoping**: For all organization operations (`/api/v1/organizations/...`), the backend extracts `user.id`, queries `organization_members` for an active membership matching the target `organization_id`, and verifies permission before returning or mutating records.
3. **Confidentiality Firewalls**:
   - `support_agent` can NEVER view records in `safety_reports` marked with `category = 'child_safety'` or confidential evidence attachments.
   - `admin` can inspect operational statistics but CANNOT bypass safeguarding evidence access controls unless an explicit escalation flag is active.
4. **Anti-Self-Escalation**:
   - `organization_owner` cannot assign themselves platform roles (`admin`, `super_admin`).
   - `admin` cannot grant themselves `super_admin` or edit `system_settings`.
