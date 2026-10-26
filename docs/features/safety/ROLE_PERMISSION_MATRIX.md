# Phase 07 — Role & Permission Matrix (Safety, Safeguarding & Disputes)

| Action / Capability               |     Student      |     Guardian     |          Tutor           | Support Agent |  Admin   | Super Admin |
| :-------------------------------- | :--------------: | :--------------: | :----------------------: | :-----------: | :------: | :---------: |
| **Submit Safety Report**          |     ✅ (Own)     |  ✅ (Own/Child)  |         ✅ (Own)         |      ❌       |    ❌    |     ❌      |
| **Trigger Emergency SOS**         |        ✅        |        ✅        |            ✅            |      ✅       |    ✅    |     ✅      |
| **View Safety Report**            |  ✅ (Reporter)   |  ✅ (Reporter)   | ❌ (Never reported user) | ✅ (Assigned) | ✅ (All) |  ✅ (All)   |
| **Apply Tutor Protective Hold**   |        ❌        |        ❌        |            ❌            |      ❌       |    ✅    |     ✅      |
| **Remove Tutor Protective Hold**  |        ❌        |        ❌        |            ❌            |      ❌       |    ✅    |     ✅      |
| **File Booking Dispute**          | ✅ (Participant) | ✅ (Participant) |            ❌            |      ❌       |    ❌    |     ❌      |
| **View Booking Dispute**          |  ✅ (Disputant)  |  ✅ (Disputant)  |    ✅ (Limited view)     |   ✅ (All)    | ✅ (All) |  ✅ (All)   |
| **Assign Dispute Investigator**   |        ❌        |        ❌        |            ❌            |   ✅ (Self)   |    ✅    |     ✅      |
| **Resolve Dispute (Refund)**      |        ❌        |        ❌        |            ❌            |      ❌       |    ✅    |     ✅      |
| **Resolve Dispute (Uphold)**      |        ❌        |        ❌        |            ❌            |      ❌       |    ✅    |     ✅      |
| **File Tutor Replacement**        |  ✅ (Eligible)   |  ✅ (Eligible)   |            ❌            |      ❌       |    ❌    |     ❌      |
| **Tutor Rebuttal to Review**      |        ❌        |        ❌        |    ✅ (Single reply)     |      ❌       |    ❌    |     ❌      |
| **Review Moderation (Hide/Flag)** |        ❌        |        ❌        |            ❌            |      ✅       |    ✅    |     ✅      |
| **Triage Support Tickets**        |        ❌        |        ❌        |            ❌            |      ✅       |    ✅    |     ✅      |

### Key Invariants

1. **Unrelated Case Denial Invariant:** Callers with no direct relationship to a dispute or safety report cannot view or alter records (`403 ForbiddenException`).
2. **Reporter Confidentiality Invariant:** Tutors under safety investigation can never see the confidential identity, statements, or evidence uploads of minor student reporters.
3. **Financial Separation Invariant:** Dispute resolution involving monetary refunds or settlement unfreezing requires administrative privileges. Support agents may investigate and recommend; only admins or super-admins can commit financial ledger modifications.
