# OgroniEdu — Role-Based Analytics Access Control & Governance

## 1. Access Matrix by Role

Access to analytics is strictly governed by the platform's role-based and attribute-based access control (RBAC & ABAC) layers.

| Role              | Permitted Analytics Scope                                                                     | Endpoint(s)                                             | Prohibited Data                                     |
| :---------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------ | :-------------------------------------------------- |
| **Student**       | Personal learning progress, attendance, homework grades, booking history                      | `/api/v1/learning/progress/me`, `/api/v1/sessions/mine` | Other students' scores, platform GMV, tutor revenue |
| **Guardian**      | Verified linked children's attendance, sessions, and academic progress                        | `/api/v1/guardians/children/:studentId`                 | Unlinked children, platform totals, tutor earnings  |
| **Tutor**         | Personal inquiries, acceptance rate, completed sessions, personal earnings, ratings           | `/api/v1/analytics/tutors/me`                           | Other tutors' earnings, platform-wide margins       |
| **Admin**         | Full platform overview, multi-stage funnel, role activation, learning engagement, CSV exports | `/api/v1/analytics/*`                                   | Unredacted credit card credentials, raw passwords   |
| **Super-Admin**   | Full platform analytics + financial ledger reconciliation + organization oversight            | `/api/v1/analytics/*`, `/api/v1/admin/reconciliation`   | None (subject to immutable audit logging)           |
| **Org Owner**     | Scoped strictly to member tutors, org bookings, and org student reach                         | `/api/v1/analytics/organizations/:id`                   | Other organizations' data (IDOR prevented)          |
| **Support Agent** | Operational tickets and specific dispute evidence                                             | `/api/v1/support/*`, `/api/v1/admin/disputes`           | Platform-wide GMV or revenue growth analytics       |

---

## 2. Multi-Tenant Organization Isolation Invariant

When an organization owner or staff member queries organization analytics via `GET /api/v1/analytics/organizations/:id`:

```typescript
// Strict tenant isolation guard in apps/api/src/modules/analytics/analytics.service.ts
const isPlatformAdmin = actor.role === 'admin' || actor.role === 'super_admin';
if (!isPlatformAdmin) {
  const membership = await this.dataSource.query(
    `SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2
     UNION
     SELECT 'owner' as role FROM organizations WHERE id = $1 AND owner_user_id = $2;`,
    [organizationId, actor.id],
  );
  if (membership.length === 0) {
    throw new ForbiddenException(
      'Access denied: You do not have permission to view analytics for this organization.',
    );
  }
}
```

Any attempt to access another organization's metrics results in an immediate **HTTP 403 Forbidden** rejection, preventing Insecure Direct Object Reference (IDOR) data exposure.

---

## 3. ABAC Scoping for Personal Tutor Analytics

The `/api/v1/analytics/tutors/me` endpoint extracts the tutor's authenticated identity directly from the validated JWT claims (`@CurrentUser() user: AuthenticatedUser`):

- Tutors cannot supply an arbitrary `tutorId` query parameter.
- The SQL query binds `tutor_user_id = $1` to `user.id`.
- Tutors can never inspect competing tutors' inquiry acceptance rates, student counts, or net income.

---

## 4. Audit Logging for Administrative Data Exports

Any administrative export of user, booking, financial, tutor, or organization reports via `GET /api/v1/analytics/reports/export` emits an immutable audit log entry in `audit_logs`:

- **Actor User ID:** Captured from authenticated admin token.
- **Action:** `admin.report.exported`
- **Metadata:** `reportType`, `rowCount`, date window (`from`, `to`).
- Prevents untracked data extraction and complies with data governance policies.
