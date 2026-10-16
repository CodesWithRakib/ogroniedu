# Fair Reviews, Rating Transparency, and Moderation Policy

**Policy Document Identifier:** `POL-TRUST-001`  
**Current Policy Version:** `v1.0-fair-reviews`  
**Effective Date:** 2026-10-10  
**Scope:** All registered students, guardians, tutors, and platform administrators on OgroniEdu across Bangladesh.

---

## 1. Purpose and Philosophy

OgroniEdu is committed to establishing the most trustworthy educational ecosystem in Bangladesh. Transparent feedback allows parents and learners to make informed academic decisions while protecting honest, diligent educators from malicious defamation or extortion.

---

## 2. Fundamental Review Invariants

### 2.1 Zero Self-Reviews (Anti-Self Review)

- Under no circumstances may a tutor submit a rating, testimonial, or review for themselves or their own courses.
- Enforced at database schema level via table constraint:
  ```sql
  CONSTRAINT chk_review_no_self_review CHECK (reviewer_user_id <> tutor_user_id)
  ```
- Enforced at backend service layer with immediate `403 ForbiddenException`.

### 2.2 Zero Unverified Reviews (Anti-Fake Reviews)

- Only learners or authorized guardians with a confirmed or completed booking (`status IN ('confirmed', 'completed', 'in_progress')`) are eligible to submit a review.
- General public visitors, unverified accounts, or unrelated users cannot submit ratings or commentary.
- Every review displays a verified badge: **"Verified Booking"** (`is_verified_booking = true`).

### 2.3 Single Review per Agreement

- Exactly one review is permitted per booking agreement (`UNIQUE (booking_id, reviewer_user_id)`). Learners may update their review if academic circumstances change, but duplicate reviews cannot be created.

---

## 3. Rating Criteria Dimensions

Feedback is captured across four objective dimensions using a standard 1–5 star rating scale:

1. **Overall Teaching Quality (Mandatory, 1–5):** Comprehensive educational outcome and satisfaction.
2. **Punctuality & Reliability (1–5):** Adherence to scheduled class times, attendance, and session commitments.
3. **Teaching Clarity & Explanation (1–5):** Ability to explain complex topics simply and answer learner questions.
4. **Subject Mastery & Curriculum Alignment (1–5):** Familiarity with National Curriculum (NCTB), English Medium (Cambridge/Edexcel), or Madrasah boards.

---

## 4. Tutor Right of Rebuttal (Single Polite Response)

- Tutors have the professional right to post **one (1)** formal response to any published review on their profile.
- Responses must remain professional, respectful, and adhere to community guidelines.
- Personal attacks, aggressive language, or disclosure of learner confidential details are strictly prohibited and result in review moderation and reliability score penalties.

---

## 5. Prohibited Content and Automated Flagging

Reviews are automatically screened and flagged for moderator review if they contain:

- Vulgarity, slurs, obscene remarks, or abusive language.
- Private personal details (phone numbers, physical addresses, bank accounts, or national ID numbers).
- Off-platform payment solicitations or commercial advertising.
- Blackmail, retaliation threats, or academic extortion.

---

## 6. Moderation Protocol & Audit Trail

- Platform administrators and Trust & Safety staff have authority to transition review status:
  - `published`: Visible publicly on the tutor's verified profile.
  - `flagged`: Held in moderator queue for review.
  - `hidden`: Hidden from public view due to verified policy violation.
- Every moderation action strictly requires a written justification and is recorded immutably in `audit_logs` (`actor_user_id`, `resource_id`, `reason`).
