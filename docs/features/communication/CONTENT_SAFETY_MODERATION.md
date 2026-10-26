# Content Safety, Anti-Circumvention & Moderation Policy

**Platform:** OgroniEdu (অগ্রণী এডু)  
**Applicability:** All communication channels, messaging threads, booking notes, and user messages  
**Primary Objectives:** Child Protection, Escrow Financial Protection, Fraud Prevention

---

## 1. Statutory & Platform Context

In Bangladesh, private communications between tutors and students must be protected against:

1. **Child Abuse & Exploitation:** Unmonitored private contact requests outside platform supervision violate _The Children Act 2013_ (শিশু আইন ২০১৩).
2. **Escrow Disintermediation & Fraud:** Tutors or students soliciting direct off-platform payments (e.g. personal bKash/Nagad transfers or cash in hand) bypass OgroniEdu's money-back escrow guarantee, exposing students to payment loss and tutors to non-payment.

---

## 2. Moderation Pipeline & Filter Specification

All inbound messages undergo synchronous server-side pre-processing before database persistence.

### 2.1 Multi-Stage Normalization

Before regex evaluation, the message text is processed through a normalizer:

1. **Bengali Digit Conversion:** All Bengali numerals (`০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯`) are mapped to ASCII digits (`0-9`).
2. **Homoglyph & Obfuscation Stripping:** Spaces, dots, dashes, commas, and special symbols embedded between digits (e.g. `0 1 7 . 1 2 3 - 4 5 6 7`) are evaluated in a stripped view.
3. **Word-to-Number Normalization:** Common spelled-out digits in English (`zero, one, two...`) and Bengali (`এক, দুই, তিন, চার, পাঁচ, ছয়, সাত, আট, নয়, শুন্য`) are recognized in sequence.

### 2.2 Violation Categories & Redaction Rules

| Violation Code           | Detected Patterns                                                                                                                                                       | Redacted Replacement              | Inline Explanation                                                                                     |
| :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `PHONE_NUMBER`           | Bangladeshi mobile numbers (`013, 014, 015, 016, 017, 018, 019` followed by 8 digits) in any normalized format.                                                         | `[REDACTED CONTACT NUMBER]`       | Direct personal phone number sharing restricted for escrow and child safety.                           |
| `OFF_PLATFORM_PAYMENT`   | bKash personal, Nagad personal, Rocket, Upay, Cellfin, send money, cash in hand, direct payment, বিকাশ, নগদ, রকেট, ক্যাশ, হাতে টাকা.                                    | `[REDACTED PAYMENT SOLICITATION]` | Direct off-platform payment solicitations strictly prohibited. All payments must use OgroniEdu Escrow. |
| `EXTERNAL_SOCIAL_BYPASS` | Direct WhatsApp links (`wa.me/`), Telegram links/usernames (`t.me/`, `@telegram`), Imo links, Facebook profile URLs (`facebook.com/`, `fb.com/`), Discord invite links. | `[REDACTED EXTERNAL LINK]`        | External communication channels restricted to protect child safety and platform accountability.        |

---

## 3. Security Auditing & Guardian Notification

Whenever a message triggers a redaction:

1. The message is stored with `is_redacted = true` and `redaction_reason` explaining the trigger.
2. An immutable security audit log entry is written to `audit_logs` (`action = 'message.safety_redacted'`).
3. If the recipient or sender is a minor student, linked guardians receive a real-time safety notification alerting them that sensitive contact or financial information was filtered.
