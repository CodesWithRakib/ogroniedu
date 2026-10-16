# Security Review Checklist

- [ ] Auth/session lifecycle reviewed
- [ ] OTP/login abuse protection tested
- [ ] Resource ownership tested on all sensitive endpoints
- [ ] Admin permissions least-privileged and audited
- [ ] Upload type/size/access restrictions tested
- [ ] CSRF/XSS/CSP reviewed as applicable
- [ ] Dependency/secret scanning enabled
- [ ] Webhook signature and replay protections tested
- [ ] Logs redact tokens, OTPs, private content and PII
- [ ] Backups encrypted and access-restricted
- [ ] Account recovery abuse tested
- [ ] Incident contacts/runbooks current
