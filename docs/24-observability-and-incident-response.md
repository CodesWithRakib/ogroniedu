# 24 — Observability and Incident Response

Structured logs include timestamp, severity, service, environment, request/correlation ID, route template, outcome and duration. Redact secrets, tokens, OTPs, private message content and unnecessary PII.

Metrics: API rate/errors/latency, DB pool/slow queries, queue depth/oldest job/retries, webhook verification failures, reconciliation mismatches, booking conflict rate, notification delivery, auth abuse, support case age. Alerts need owner/action and should avoid noise.

Incident steps: detect/acknowledge, assign lead, assess impact, contain, preserve evidence, communicate as appropriate/required, recover and verify, postmortem, track corrective actions. Runbooks for DB outage, queue outage, provider outage, leaked credentials, suspected takeover and data disclosure.
