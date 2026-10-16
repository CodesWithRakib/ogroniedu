# 16 — Notifications and Messaging

Start with in-app and email where practical. Add SMS, push or WhatsApp only after verifying official provider terms, costs, consent and deliverability. WhatsApp must use approved official APIs; do not automate personal accounts or bypass rules.

Write an outbox event in the business transaction; worker creates deliveries; record channel, status, attempts, timestamps and redacted provider error. Retry transient failures with backoff, deduplicate by event/recipient/channel/template and respect preferences/consent. If direct messaging is included, enforce participant access, rate limits, report/block options, retention and minor-safety policy.

Tests: delivery failure does not undo booking; retries do not duplicate receipts; marketing opt-out respected; critical notices follow approved policy; nonparticipants cannot read messages.
