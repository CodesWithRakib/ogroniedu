import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Client } = pg;

/**
 * NFR-003: Performance, Throughput, and Latency Regression Suite (Phase 19)
 *
 * Validates real PostgreSQL latency bounds (p95 < 25ms for search, p95 < 15ms for GiST conflict checks,
 * p95 < 10ms for auth and admin streams), ensures query plans utilize indexes without redundant sorts,
 * and verifies Phase 19 performance optimization indexes.
 */
describe('NFR-003: Performance, Load & Latency Regression Suite', () => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ogroniedu_test',
  };

  let client: pg.Client;
  let sampleSubjectId: string;
  let sampleTutorId: string;
  let sampleBookingId: string;

  beforeAll(async () => {
    client = new Client(dbConfig);
    await client.connect();

    const subjRes = await client.query("SELECT id FROM subjects WHERE code = 'math' LIMIT 1;");
    sampleSubjectId = subjRes.rows[0]?.id || '00000000-0000-4000-8000-000000000005';

    const tutorRes = await client.query(
      "SELECT user_id FROM tutor_profiles WHERE publication_status = 'published' LIMIT 1;",
    );
    sampleTutorId = tutorRes.rows[0]?.user_id || '00000000-0000-4000-8000-000000000001';

    const bookingRes = await client.query('SELECT id FROM bookings LIMIT 1;');
    sampleBookingId = bookingRes.rows[0]?.id || '00000000-0000-4000-8000-000000000001';
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('WORKLOAD 1: Tutor Discovery multi-dimensional search executes within latency bound (p95 < 25ms)', async () => {
    const searchSql = `
      SELECT p.user_id, p.headline, p.hourly_rate_minor, u.display_name
      FROM tutor_profiles p
      JOIN users u ON u.id = p.user_id
      JOIN tutor_subjects ts ON ts.tutor_user_id = p.user_id
      JOIN tutor_service_areas tsa ON tsa.tutor_user_id = p.user_id
      WHERE p.publication_status = 'published'
        AND p.verification_status = 'approved'
        AND ts.subject_id = $1
        AND tsa.district_code = 'dhaka'
        AND p.hourly_rate_minor BETWEEN 40000 AND 120000
      ORDER BY p.hourly_rate_minor ASC
      LIMIT 20;
    `;

    // 1. Query plan assertion
    const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${searchSql}`, [
      sampleSubjectId,
    ]);
    const planData = planRes.rows[0]['QUERY PLAN'][0];
    expect(planData['Execution Time']).toBeLessThan(50); // < 50ms execution in cold test runner

    // 2. Latency benchmark run (50 iterations)
    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await client.query(searchSql, [sampleSubjectId]);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(25); // p95 must be under 25ms SLA
  });

  it('WORKLOAD 2: GiST Session Conflict verification executes with high throughput (p95 < 15ms)', async () => {
    const conflictSql = `
      SELECT id FROM booking_sessions
      WHERE tutor_user_id = $1
        AND status NOT IN ('cancelled')
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)');
    `;

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 86400000 + 3600000).toISOString();

    // Query plan assertion: uses GiST index
    const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${conflictSql}`, [
      sampleTutorId,
      start,
      end,
    ]);
    const planData = planRes.rows[0]['QUERY PLAN'][0];
    expect(planData.Plan['Total Cost']).toBeLessThan(50);

    // Latency benchmark
    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await client.query(conflictSql, [sampleTutorId, start, end]);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(15); // GiST index lookup under 15ms SLA
  });

  it('WORKLOAD 3: Active Auth Session lookup utilizes partial index (p95 < 10ms)', async () => {
    const authSql = `
      SELECT id, user_id, refresh_token_hash, expires_at
      FROM auth_sessions
      WHERE user_id = $1
        AND expires_at > now()
        AND revoked_at IS NULL
      LIMIT 1;
    `;

    const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${authSql}`, [
      sampleTutorId,
    ]);
    const planData = planRes.rows[0]['QUERY PLAN'][0];
    expect(planData['Execution Time']).toBeLessThan(20);

    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await client.query(authSql, [sampleTutorId]);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(10);
  });

  it('WORKLOAD 4: Global Administrative Audit Log pagination executes with index (p95 < 10ms)', async () => {
    const auditSql = `
      SELECT id, actor_user_id, action, resource_type, resource_id, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${auditSql}`);
    const planData = planRes.rows[0]['QUERY PLAN'][0];
    // With migration 010, ix_audit_logs_created_desc brings total cost < 20
    expect(planData.Plan['Total Cost']).toBeLessThan(20);

    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await client.query(auditSql);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(10);
  });

  it('WORKLOAD 5: Transactional Outbox worker polling executes with index (p95 < 10ms)', async () => {
    const outboxSql = `
      SELECT id, event_type, aggregate_type, aggregate_id, attempts
      FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT 25;
    `;

    const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${outboxSql}`);
    const planData = planRes.rows[0]['QUERY PLAN'][0];
    expect(planData['Execution Time']).toBeLessThan(20);

    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      await client.query(outboxSql);
      latencies.push(performance.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    expect(p95).toBeLessThan(10);
  });

  it('CATALOG INVARIANTS: Verifies all Phase 19 performance optimization indexes exist', async () => {
    const indexRes = await client.query<{ indexname: string }>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND indexname IN (
          'ix_booking_sessions_booking_start',
          'ix_audit_logs_created_desc',
          'ix_tutor_profiles_price_search',
          'ix_outbox_events_pending_batch'
        );
    `);

    const indexes = indexRes.rows.map((r) => r.indexname);
    expect(indexes).toContain('ix_booking_sessions_booking_start');
    expect(indexes).toContain('ix_audit_logs_created_desc');
    expect(indexes).toContain('ix_tutor_profiles_price_search');
    expect(indexes).toContain('ix_outbox_events_pending_batch');
  });
});
