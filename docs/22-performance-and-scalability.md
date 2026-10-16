# 22 — Performance and Scalability

Record environment, dataset size, concurrency, cache state, p50/p95/p99, throughput, errors, CPU/memory and query plans. Likely hotspots: tutor search, availability checks, calendar/session lists, progress reports, admin exports, queues and reconciliation.

Optimize in order: measure; index and deterministic pagination; eliminate N+1/overfetch; cursor paginate large lists; cache stable read-heavy data with explicit invalidation; move slow noncritical work to jobs; add read models only after measurement; scale from observed demand. Use synthetic data and isolated environments. Never load-test production payment providers without explicit authorization. Set SLO, RTO and RPO after baselines and business input.
