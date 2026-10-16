# 25 — Backup and Disaster Recovery

Configure automated encrypted DB backups, retention, point-in-time recovery where available, critical object storage protection/versioning, restricted access, monitoring, restore runbook and agreed RPO/RTO. Reconcile deletion policy with backup expiry.

Restore drill: provision isolated environment; restore DB and needed objects; apply required migrations; verify row counts and relationships; test login, booking, ledger balance and audit data; record duration/data-loss window/defects; secure or destroy the test environment. A backup is not proven until restored successfully.
