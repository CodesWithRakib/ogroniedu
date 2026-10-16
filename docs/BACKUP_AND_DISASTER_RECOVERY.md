# OgroniEdu — Backup & Disaster Recovery (BCDR) Plan

**Date:** 2026-10-10  
**Recovery Objectives:** RPO < 15 Minutes | RTO < 2 Hours  
**Status:** Approved Operations Standard

---

## 1. Objectives & Metrics

- **Recovery Point Objective (RPO):** Maximum acceptable data loss duration = **< 15 minutes**. Achieved through continuous PostgreSQL Write-Ahead Log (WAL) archiving to off-site cloud storage.
- **Recovery Time Objective (RTO):** Maximum acceptable downtime to restore service = **< 2 hours**. Achieved through automated container redeployment and fast database snapshot restoration.

---

## 2. Backup Architecture & Cadence

1. **Continuous WAL Archiving:**
   - PostgreSQL WAL segments are streamed continuously to redundant S3-compatible cloud storage (encrypted with AES-256).
2. **Automated Base Backups:**
   - Daily full base backup executed via `pg_basebackup` / `pg_dump` at 03:00 UTC (09:00 BST).
   - Retained for 30 days locally, 365 days in cold archive for tax and legal compliance.
3. **Point-In-Time Recovery (PITR):**
   - Allows rolling back the database to any exact millisecond within the preceding 30 days in the event of catastrophic data corruption or human error.

---

## 3. Disaster Recovery Runbook

1. **Primary Instance Failure:**
   - Managed database automatically promotes standby replica within 60 seconds.
   - Application connection pools reconnect automatically via DNS failover.
2. **Catastrophic Regional Outage:**
   - Spin up secondary region infrastructure using Terraform / Docker Compose.
   - Restore latest base backup from off-site bucket.
   - Replay WAL archive up to the latest available sequence number.
   - Redirect production domain DNS to new application load balancer.
   - Execute verification health checks and smoke test suite before opening to public traffic.
