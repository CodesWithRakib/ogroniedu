# Database Integrity Rules

- Guardian-child link has explicit status/consent and audit.
- Public tutor eligibility derives from approved verification and publication policy.
- Booking/session state transitions are domain-validated.
- Active sessions cannot overlap for a tutor under approved rules.
- End time > start time.
- Money is integer minor units + currency.
- Provider transaction/event identifiers are unique in provider scope.
- Refund total cannot exceed refundable amount.
- Posted journals balance per currency; entries are append-only.
- Audit records identify actor/action/resource/time and safe metadata.
- Outbox and idempotency processing are retry-safe.
- Soft deletion follows retention policy and does not imply indefinite retention.
- Every relationship has a documented access rule and negative test.
