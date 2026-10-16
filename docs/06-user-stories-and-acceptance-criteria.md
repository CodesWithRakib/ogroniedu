# 06 — User Stories and Acceptance Criteria

- **US-G-01 Guardian manages children:** create/link multiple children; duplicate links prevented; changes audited; unrelated-child access denied in E2E.
- **US-G-02 Guardian evaluates tutor:** profile exposes only public fields and precise verification wording.
- **US-G-03 Guardian sees progress:** access checks apply on every request; revoked links lose access per policy.
- **US-S-01 Learner sees schedule/homework:** only assigned learner can access; all UI states localized.
- **US-T-01 Tutor submits credentials:** private upload; status change only by authorized reviewer; decision audited.
- **US-T-02 Tutor manages availability:** overlapping confirmed sessions rejected transactionally.
- **US-B-01 Guardian requests tutoring:** validates relationship, learner, mode, schedule, subject and tutor eligibility.
- **US-B-02 Tutor accepts request:** invalid state transitions rejected; notification failure does not corrupt booking.
- **US-P-01 Payer receives receipt:** receipt follows verified server-side payment; duplicate callback creates no duplicate effect.
- **US-A-01 Reviewer decides verification:** reason required; public status updated without exposing internal notes.

Global: happy path, negative authorization, validation, retries, edge cases, Bangla/English, responsive behavior and documentation.
