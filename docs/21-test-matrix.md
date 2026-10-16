# 21 — Test Matrix

| ID       | Module/scenario                    | Level              | Expected result       | Priority      |
| -------- | ---------------------------------- | ------------------ | --------------------- | ------------- |
| TEST-001 | Valid login                        | API E2E            | secure session issued | P0            |
| TEST-002 | Invalid-login abuse                | integration/E2E    | rate policy enforced  | P0            |
| TEST-003 | Student calls admin endpoint       | API E2E            | denied, no mutation   | P0            |
| TEST-004 | Guardian requests unrelated child  | API E2E            | denied, no data leak  | P0            |
| TEST-005 | Tutor self-approves                | API E2E            | denied                | P0            |
| TEST-006 | Unpublished tutor in search        | integration        | omitted               | P1            |
| TEST-007 | Valid tutor request                | API E2E            | correct ownership     | P0            |
| TEST-008 | Overlapping session                | DB integration     | conflict rejected     | P0            |
| TEST-009 | Concurrent same slot               | concurrency        | at most one confirms  | P0            |
| TEST-010 | Invalid state transition           | unit/API           | stable error          | P0            |
| TEST-011 | Recurrence job retried             | integration        | no duplicate sessions | P1            |
| TEST-012 | Unauthorized attendance            | API E2E            | denied                | P0            |
| TEST-013 | Unrelated learner reads assignment | API E2E            | denied                | P0            |
| TEST-014 | Score revision                     | integration        | audit entry           | P1            |
| TEST-015 | Invalid payment signature          | API integration    | rejected              | P0            |
| TEST-016 | Duplicate webhook                  | integration        | one financial effect  | P0            |
| TEST-017 | Ledger journal                     | unit/integration   | debits=credits        | P0            |
| TEST-018 | Excess refund                      | domain/API         | rejected              | P0            |
| TEST-019 | Notification transient failure     | worker integration | retry/backoff         | P1            |
| TEST-020 | Nonparticipant reads message       | API E2E            | denied                | P0            |
| TEST-021 | Dispute creation                   | API E2E            | eligible case/audit   | P1            |
| TEST-022 | Unauthorized audit access          | API E2E            | denied                | P0            |
| TEST-023 | Bangla/English routes              | browser E2E        | locale complete       | P1            |
| TEST-024 | Keyboard booking flow              | browser/a11y       | accessible            | P1            |
| TEST-025 | Mobile tutor search                | browser E2E        | no critical overflow  | P1            |
| TEST-026 | Empty DB migration                 | CI integration     | schema created        | P0            |
| TEST-027 | Previous-schema upgrade            | CI integration     | data preserved        | P0            |
| TEST-028 | Backup restore drill               | operations         | restore validated     | P0 production |
| TEST-029 | Search performance baseline        | load test          | reproducible baseline | P1            |
| TEST-030 | Data deletion request              | integration        | policy applied        | P1            |

Expand this matrix so every implemented FR/NFR has mapped scenarios, test data, preconditions, expected results and execution evidence.
