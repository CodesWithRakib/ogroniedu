# Safeguarding Escalation and Emergency Response Policy

**Document Identifier:** `POL-SAFEGUARDING-ESCALATION-001`  
**Governing Standard:** The Children Act, 2013 (শিশু আইন, ২০১৩)  
**Platform:** OgroniEdu (অগ্রণী এডু)

---

## 1. Immediate Safety Actions (Protective Restrictions)

When an allegation presents an immediate risk to learner safety, authorized compliance staff may impose proportionate, temporary protective measures (`safety_actions`):

| Safety Action Type | Scope | Enforcement Mechanism | Review SLA |
|:---|:---|:---|:---:|
| `tutor_safety_hold` | Accused Tutor | Hides from discovery search; blocks starting upcoming live sessions (`SessionReschedulingService.startSession`). | 24 Hours |
| `contact_restriction` | Between Reporter & Accused | Rejects booking requests and links between the two accounts. | 48 Hours |
| `messaging_disabled` | Direct Messaging | Blocks direct in-app messaging between the two parties. | 48 Hours |
| `temporary_suspension` | Entire Platform | Suspends user login (`users.status = 'suspended'`) pending investigation. | 72 Hours |
| `flagged_for_review` | Account Monitoring | Flags account activity for heightened audit scrutiny without notifying user. | Ongoing |

### Mandatory Safety Action Rules:
1. **Authorized Actor:** Only users with `compliance_reviewer`, `admin`, or `super_admin` roles can impose or revoke restrictions.
2. **Explicit Justification:** Every action requires a detailed reason string.
3. **Audit Trail:** Imposition and revocation are logged in `safety_actions` and `safety_case_events`.
4. **Non-Prejudgment:** A temporary safety hold is a protective precaution to prevent immediate contact, NOT a final determination of guilt.

---

## 2. Emergency Statutory Helplines

In any situation involving imminent bodily harm, sexual violence, child abuse, or physical extortion, the platform directs users to official government emergency services in Bangladesh:

1. **1098 — National Child Helpline (টোল-ফ্রি শিশু সুরক্ষা হেল্পলাইন):**
   - 24/7 dedicated government service for the rescue and rehabilitation of children in distress.
2. **999 — Bangladesh Police & National Emergency Service:**
   - Immediate police response, emergency medical dispatch, and ambulance.
3. **109 — Violence Against Women and Children Prevention Cell:**
   - Ministry of Women and Children Affairs toll-free emergency hotline.
