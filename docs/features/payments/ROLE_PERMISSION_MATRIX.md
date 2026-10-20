# Finance Role Permission Matrix (Phase 05)

**Date:** 2026-10-20
**Roles covered:** all nine platform roles in `PlatformRoles`
(`packages/contracts/src/identity.ts`).
**Enforcement:** `AuthGuard` + `RolesGuard` at the controller, plus
record-level checks inside services.

The finance surface is deny-by-default. Platform-wide money movement is limited
to `admin` and `super_admin`; every other role is either record-scoped or
explicitly denied.

---

## 1. Capability matrix

Legend: **Yes** = allowed; **Scoped** = allowed only for records the caller owns
or is linked to; **No** = denied; **n/a** = no legitimate use case in the current
product.

| Capability                                    | student | guardian             | tutor         | support_agent | compliance_reviewer | admin     | super_admin | organization_owner | organization_staff |
| --------------------------------------------- | ------- | -------------------- | ------------- | ------------- | ------------------- | --------- | ----------- | ------------------ | ------------------ |
| Create a payment order for a booking          | Scoped  | Scoped (active link) | Scoped        | No            | No                  | Yes       | Yes         | No                 | No                 |
| View own payment orders and receipts          | Scoped  | Scoped               | No            | No            | No                  | Yes (all) | Yes (all)   | No                 | No                 |
| View an invoice                               | Scoped  | Scoped               | No            | No            | No                  | Yes (all) | Yes (all)   | No                 | No                 |
| Request a refund                              | Scoped  | Scoped (active link) | Scoped        | No            | No                  | Yes       | Yes         | No                 | No                 |
| View own/linked refunds                       | Scoped  | Scoped               | Scoped        | No            | No                  | Yes (all) | Yes (all)   | No                 | No                 |
| List the finance refund queue                 | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Approve/reject a refund                       | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Process or manually confirm a refund          | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Approve a completed session for settlement    | Scoped  | **No**               | **No**        | No            | No                  | Yes       | Yes         | No                 | No                 |
| Read tutor finance summary                    | No      | No                   | Scoped (self) | No            | No                  | No        | No          | No                 | No                 |
| Request a tutor payout                        | No      | No                   | Scoped (self) | No            | No                  | No        | No          | No                 | No                 |
| View own payout history                       | No      | No                   | Scoped (self) | No            | No                  | No        | No          | No                 | No                 |
| List the finance payout queue                 | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Approve/reject/mark paid/mark failed a payout | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Read commission policy versions               | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Create a commission policy version            | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Run reconciliation                            | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |
| Read platform ledger balances                 | No      | No                   | No            | No            | No                  | Yes       | Yes         | No                 | No                 |

## 2. Controller-level enforcement

| Surface                 | Route prefix                         | Roles                                           |
| ----------------------- | ------------------------------------ | ----------------------------------------------- |
| Customer/payer payments | `/api/v1/payments/*`                 | Authenticated; record-scoped per handler        |
| Provider callbacks      | `/api/v1/payments/webhook/:provider` | Public, but signature verification is mandatory |
| Tutor finance           | `/api/v1/tutor/finance/*`            | `tutor` only                                    |
| Admin finance           | `/api/v1/admin/finance/*`            | `admin`, `super_admin` only                     |

Notable route details:

- `POST /api/v1/payments/orders` — `AuthGuard`; the service additionally requires
  payer, student, requester, active linked guardian or admin.
- `POST /api/v1/payments/refunds` — `AuthGuard`; record-level guardian check.
- `POST /api/v1/payments/milestones/settle` — `AuthGuard`; service restricts to
  student, requester or admin.
- `POST /api/v1/payments/orders/:orderId/sandbox-confirm` — always HTTP 410; no
  role can use it.
- `GET /api/v1/payments/invoices/:invoiceId/print` — `AuthGuard`; payer, student
  or admin only.
- `POST /api/v1/admin/finance/commission-policy` — `admin` or `super_admin`.
- `GET /api/v1/admin/finance/ledger/balance/:accountCode` — `admin` or
  `super_admin`; previously readable by any authenticated user (fixed in this
  phase).

## 3. Record-level rules

Role membership alone is not sufficient on the customer surface.

| Action               | Record-level rule                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Pay for a booking    | Caller is requester or student, or an active guardian of the student, or admin                      |
| Read receipt         | Caller is payer, student, requester or admin                                                        |
| Request refund       | Caller has booking access via the guardian-access service, or is admin                              |
| Read refund          | Admin, the requester, or someone with booking access                                                |
| Read invoice         | Payer, student or admin                                                                             |
| Settle session       | Student, requester or admin; tutor and guardian are denied                                          |
| Tutor summary/payout | `payout.tutor_user_id === caller.id`; enforced by query scope and an explicit ownership guard       |
| Payout decision      | Finance roles only; no tutor can act on their own payout                                            |
| Refund decision      | Finance roles only; the requester cannot approve their own request by virtue of being the requester |

## 4. Gaps and deliberate denials

### 4.1 Organization roles

`organization_owner` and `organization_staff` are provisioned roles, but there
is no organization/tenancy table in the schema. They are denied all finance
access. When tenancy lands, the matrix must be revisited: an organization owner
may need scoped visibility into its tutors' payouts and its students' payments,
but never platform-wide reconciliation or commission policy changes.

### 4.2 Support and compliance

`support_agent` and `compliance_reviewer` can handle their own domains (support
tickets, tutor dossiers) but cannot read refund/payout queues or move money.
Support staff who need to see a refund status must ask finance or use the
customer-facing record the customer shares. This is intentional least privilege.

### 4.3 Guardian visibility gaps

The following are current limitations, not policy statements:

- A linked guardian who did not personally request a refund will not see it in
  `GET /payments/refunds` (`listMine` filters by requester/payer/student/
  requester, not by active guardian links). Direct access by id succeeds through
  `getRefund()`.
- A linked guardian who is not the payer/student/requester cannot read a receipt
  because `getPaymentReceipt()` does not call the guardian-access service.
- A tutor named on an invoice cannot read it; invoice access is payer, student
  or admin only.

These should be closed before guardians are onboarded at scale.

### 4.4 Admin separation of duties

Both `admin` and `super_admin` can approve refunds, approve payouts, mark
payouts paid, run reconciliation and create commission policy versions. There is
no maker-checker split, no amount threshold and no second-approver requirement.
A single compromised admin account can move escrow and change commission.

Recommended follow-up (not implemented):

- Require `super_admin` for commission policy changes.
- Require two operators above a configurable amount for refunds and payouts.
- Add an immutable finance action log export and alerting on out-of-hours
  mutations.

## 5. Auditing

Every finance mutation writes an audit record with actor, action, resource,
request id where available and safe metadata:

| Action                            | Audit action                                          |
| --------------------------------- | ----------------------------------------------------- |
| Order created                     | `payment.order_created`                               |
| Payment succeeded                 | `payment.order_succeeded`                             |
| Session settled                   | `payment.milestone_settled`                           |
| Refund requested                  | `finance.refund_requested`                            |
| Refund decided                    | `finance.refund_approved` / `finance.refund_rejected` |
| Refund completed                  | `finance.refund_succeeded`                            |
| Payout requested                  | `finance.payout_requested`                            |
| Payout approved/rejected          | `finance.payout_approved` / `finance.payout_rejected` |
| Payout paid/failed                | `finance.payout_paid` / `finance.payout_failed`       |
| Commission policy version created | `finance.commission_policy_created`                   |

Audit metadata never includes full payout account numbers, signatures or raw
provider payloads.

## 6. Provisioning

Only `student`, `guardian` and `tutor` are self-signup roles. `admin`,
`super_admin`, `support_agent`, `compliance_reviewer`, `organization_owner` and
`organization_staff` must be granted by a privileged provisioner and are
recorded in the audit log. A client cannot obtain a finance role by posting it
to registration.
