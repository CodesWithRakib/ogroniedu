# 05 — Roles and Authorization

## Roles

`guest`, `student`, `guardian`, `tutor`, optional `organization_owner`/`organization_staff`, `support_agent`, `admin`, `super_admin`. Multiple roles are possible only through explicit grants. Deny by default.

## Example permissions

`tutor.profile.read_public`, `tutor.profile.update_own`, `tutor.verification.review`, `guardian.child.read_linked`, `booking.create`, `booking.read_participant`, `session.attendance.record`, `learning.assignment.manage_assigned`, `payment.read_own`, `payment.refund.review`, `dispute.case.assign`, `reference_data.manage`, `admin.audit.read`, `platform.settings.manage`.

## Rules

1. Enforce permissions in API/service layer, not just UI.
2. Scope queries by ownership and active relationship.
3. IDs supplied by clients are untrusted.
4. Tutor private verification evidence never appears in public DTOs.
5. Support staff see assigned cases and minimum necessary data.
6. Sensitive reads and privileged mutations are audited.
7. Test forbidden cross-user access for every sensitive domain.

## Minors

Age thresholds, guardian consent, independent account eligibility, communications policy and retention require qualified Bangladesh legal review. A child's name/phone alone is not proof of guardian consent.
