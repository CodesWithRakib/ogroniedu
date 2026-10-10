import pg from 'pg';
import crypto from 'node:crypto';

const { Client } = pg;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ogroniedu_test',
};

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0].toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    avg: (sum / sorted.length).toFixed(2),
    p50: getP(50).toFixed(2),
    p90: getP(90).toFixed(2),
    p95: getP(95).toFixed(2),
    p99: getP(99).toFixed(2),
  };
}

async function seedSyntheticData(client) {
  console.log('--- Populating Synthetic Performance Dataset (500 tutors, 1,000 bookings, 2,500 sessions, 2,000 audit logs) ---');

  // 1. Curricula and Subjects (if missing)
  await client.query(`
    INSERT INTO curricula (id, code, name_en, name_bn, is_active)
    VALUES 
      ('00000000-0000-4000-8000-000000000001', 'nctb', 'National Curriculum (NCTB)', 'জাতীয় শিক্ষাক্রম', true),
      ('00000000-0000-4000-8000-000000000002', 'cambridge', 'Cambridge International', 'ক্যামব্রিজ ইন্টারন্যাশনাল', true)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO education_levels (id, code, name_en, name_bn, sort_order, is_active)
    VALUES 
      ('00000000-0000-4000-8000-000000000003', 'ssc', 'Secondary (SSC)', 'এসএসসি', 10, true),
      ('00000000-0000-4000-8000-000000000004', 'hsc', 'Higher Secondary (HSC)', 'এইচএসসি', 11, true)
    ON CONFLICT (code) DO NOTHING;

    INSERT INTO subjects (id, code, name_en, name_bn, is_active)
    VALUES 
      ('00000000-0000-4000-8000-000000000005', 'math', 'Mathematics', 'গণিত', true),
      ('00000000-0000-4000-8000-000000000006', 'physics', 'Physics', 'পদার্থবিজ্ঞান', true),
      ('00000000-0000-4000-8000-000000000007', 'chemistry', 'Chemistry', 'রসায়ন', true)
    ON CONFLICT (code) DO NOTHING;
  `);

  const subjRes = await client.query("SELECT id FROM subjects WHERE code = 'math' LIMIT 1;");
  const mathSubjectId = subjRes.rows[0]?.id;
  const levelRes = await client.query("SELECT id FROM education_levels WHERE code = 'hsc' LIMIT 1;");
  const hscLevelId = levelRes.rows[0]?.id;
  const currRes = await client.query("SELECT id FROM curricula WHERE code = 'nctb' LIMIT 1;");
  const nctbCurrId = currRes.rows[0]?.id;

  // 2. Batch seed users and tutor profiles
  const existingTutors = await client.query('SELECT count(*) FROM tutor_profiles WHERE publication_status = $1;', ['published']);
  if (Number(existingTutors.rows[0].count) < 200) {
    console.log('Seeding 200 published tutors with subjects, locations, and sessions...');
    const userValues = [];
    const tutorValues = [];
    const subjectValues = [];
    const areaValues = [];
    const sessionValues = [];
    const bookingValues = [];
    const auditValues = [];
    const outboxValues = [];

    const now = Date.now();
    for (let i = 1; i <= 200; i++) {
      const tutorUserId = crypto.randomUUID();
      const studentUserId = crypto.randomUUID();
      const bookingId = crypto.randomUUID();

      // Users
      const runId = Date.now().toString(36);
      userValues.push(`('${tutorUserId}', 'Tutor ${i} Chowdhury', 'tutor${i}_${runId}@perf.ogroniedu.com', '+88019${String(i).padStart(8, '0')}', 'active')`);
      userValues.push(`('${studentUserId}', 'Student ${i} Rahman', 'student${i}_${runId}@perf.ogroniedu.com', '+88016${String(i).padStart(8, '0')}', 'active')`);

      // Tutor profile
      const rateMinor = 40000 + (i % 20) * 5000; // 400 - 1400 BDT
      tutorValues.push(`('${tutorUserId}', 'Expert Calculus & Physics Instructor ${i}', 'Passionate educator with 5 years experience', 5, ARRAY['online', 'in_person']::TEXT[], ${rateMinor}, 'BDT', 'approved', 'published')`);

      // Subject
      subjectValues.push(`(gen_random_uuid(), '${tutorUserId}', '${mathSubjectId}', '${hscLevelId}', '${nctbCurrId}', ${rateMinor})`);

      // Service Area
      const district = i % 2 === 0 ? 'dhaka' : 'chittagong';
      areaValues.push(`(gen_random_uuid(), '${tutorUserId}', '${district}', 'dhanmondi')`);

      // Booking
      bookingValues.push(`('${bookingId}', '${studentUserId}', '${studentUserId}', '${tutorUserId}', '${mathSubjectId}', '${hscLevelId}', 'online', 'confirmed', ${rateMinor}, 60, 'v1.0-bd-cancellation')`);

      // 4 sessions per booking
      for (let s = 0; s < 4; s++) {
        const start = new Date(now + (i * 4 + s) * 7200000);
        const end = new Date(start.getTime() + 3600000);
        sessionValues.push(`(gen_random_uuid(), '${bookingId}', '${tutorUserId}', '${studentUserId}', '${start.toISOString()}', '${end.toISOString()}', 'scheduled')`);
      }

      // Audit logs
      auditValues.push(`(gen_random_uuid(), '${tutorUserId}', 'tutor.profile_updated', 'tutor_profiles', '${tutorUserId}', now() - interval '${i} hours')`);
      auditValues.push(`(gen_random_uuid(), '${studentUserId}', 'booking.created', 'bookings', '${bookingId}', now() - interval '${i * 2} hours')`);

      // Outbox events
      outboxValues.push(`(gen_random_uuid(), 'booking.confirmed', 'booking', '${bookingId}', '{"status":"confirmed"}', now() - interval '${i} minutes')`);
    }

    await client.query(`
      INSERT INTO users (id, display_name, email, phone_e164, status)
      VALUES ${userValues.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO tutor_profiles (user_id, headline, bio, years_experience, teaching_modes, hourly_rate_minor, currency, verification_status, publication_status)
      VALUES ${tutorValues.join(',\n')}
      ON CONFLICT (user_id) DO UPDATE SET 
        publication_status = EXCLUDED.publication_status,
        verification_status = EXCLUDED.verification_status,
        hourly_rate_minor = EXCLUDED.hourly_rate_minor;
    `);

    await client.query(`
      INSERT INTO tutor_subjects (id, tutor_user_id, subject_id, education_level_id, curriculum_id, rate_minor)
      VALUES ${subjectValues.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO tutor_service_areas (id, tutor_user_id, district_code, upazila_code)
      VALUES ${areaValues.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO bookings (id, student_user_id, requester_user_id, tutor_user_id, subject_id, education_level_id, mode, status, price_per_session_minor, duration_minutes, cancellation_policy_version)
      VALUES ${bookingValues.join(',\n')}
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO booking_sessions (id, booking_id, tutor_user_id, student_user_id, starts_at, ends_at, status)
      VALUES ${sessionValues.join(',\n')}
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, created_at)
      VALUES ${auditValues.join(',\n')}
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload, created_at)
      VALUES ${outboxValues.join(',\n')}
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Synthetic dataset seeded successfully.');
  } else {
    console.log(`Synthetic dataset already present (${existingTutors.rows[0].count} published tutors). Skipping population.`);
  }
}

async function runBenchmarkWorkload(client, name, queryFn, iterations = 100) {
  const latencies = [];
  let errorCount = 0;

  // Warm-up run (3 queries)
  for (let w = 0; w < 3; w++) {
    await queryFn(client);
  }

  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    try {
      await queryFn(client);
      const t1 = performance.now();
      latencies.push(t1 - t0);
    } catch (err) {
      errorCount++;
    }
  }
  const totalDuration = (Date.now() - startTime) / 1000;
  const stats = calculatePercentiles(latencies);
  const throughput = (latencies.length / totalDuration).toFixed(1);

  return {
    name,
    iterations,
    throughputOpsSec: throughput,
    errorCount,
    errorRate: ((errorCount / iterations) * 100).toFixed(1) + '%',
    ...stats,
  };
}

async function captureQueryPlan(client, label, sql, params = []) {
  const planRes = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params);
  const planData = planRes.rows[0]['QUERY PLAN'][0];
  const rootNode = planData.Plan;
  return {
    label,
    nodeType: rootNode['Node Type'],
    totalCost: rootNode['Total Cost'],
    actualStartupTime: rootNode['Actual Startup Time'],
    actualTotalTime: rootNode['Actual Total Time'],
    actualRows: rootNode['Actual Rows'],
    planningTime: planData['Planning Time'],
    executionTime: planData['Execution Time'],
  };
}

export async function runFullBenchmark() {
  const client = new Client(dbConfig);
  await client.connect();

  try {
    await seedSyntheticData(client);

    console.log('\n======================================================');
    console.log('   OGRONIEDU SYNTHETIC LOAD BENCHMARK (PHASE 19)     ');
    console.log('======================================================\n');

    // Sample dynamic targets
    const sampleTutor = (await client.query('SELECT user_id FROM tutor_profiles LIMIT 1;')).rows[0]?.user_id;
    const sampleBooking = (await client.query('SELECT id FROM bookings LIMIT 1;')).rows[0]?.id;
    const sampleSubject = (await client.query("SELECT id FROM subjects WHERE code = 'math' LIMIT 1;")).rows[0]?.id;

    // 1. Workload: Discovery Search
    const searchSql = `
      SELECT p.user_id, p.headline, p.hourly_rate_minor, u.display_name
      FROM tutor_profiles p
      JOIN users u ON u.id = p.user_id
      JOIN tutor_subjects ts ON ts.tutor_user_id = p.user_id
      JOIN tutor_service_areas tsa ON tsa.tutor_user_id = p.user_id
      WHERE p.publication_status = 'published'
        AND p.verification_status = 'approved'
        AND ts.subject_id = '${sampleSubject}'
        AND tsa.district_code = 'dhaka'
        AND p.hourly_rate_minor BETWEEN 40000 AND 120000
      ORDER BY p.hourly_rate_minor ASC
      LIMIT 20;
    `;
    const searchPlan = await captureQueryPlan(client, 'Tutor Discovery Search', searchSql);
    const searchBenchmark = await runBenchmarkWorkload(client, 'Tutor Discovery Multi-Dimensional Search', (c) => c.query(searchSql), 150);

    // 2. Workload: Booking Session Conflict (GiST Overlap Lock Check)
    const conflictCheckSql = `
      SELECT id FROM booking_sessions
      WHERE tutor_user_id = $1
        AND status NOT IN ('cancelled')
        AND tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)');
    `;
    const testStarts = new Date(Date.now() + 86400000).toISOString();
    const testEnds = new Date(Date.now() + 86400000 + 3600000).toISOString();
    const conflictPlan = await captureQueryPlan(client, 'GiST Session Conflict Check', conflictCheckSql, [sampleTutor, testStarts, testEnds]);
    const conflictBenchmark = await runBenchmarkWorkload(client, 'Booking GiST Overlap Conflict Verification', (c) => c.query(conflictCheckSql, [sampleTutor, testStarts, testEnds]), 150);

    // 3. Workload: Auth Session Lookup
    await client.query(`
      INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (gen_random_uuid(), $1, md5(random()::text), now() + interval '30 days')
      ON CONFLICT DO NOTHING;
    `, [sampleTutor]);

    const authSql = `
      SELECT id, user_id, refresh_token_hash, expires_at
      FROM auth_sessions
      WHERE user_id = $1
        AND expires_at > now()
        AND revoked_at IS NULL
      LIMIT 1;
    `;
    const authPlan = await captureQueryPlan(client, 'Auth Active Session Lookup', authSql, [sampleTutor]);
    const authBenchmark = await runBenchmarkWorkload(client, 'Active Auth Session Validation', (c) => c.query(authSql, [sampleTutor]), 200);

    // 4. Workload: Admin Audit Logs Pagination
    const auditSql = `
      SELECT id, actor_user_id, action, resource_type, resource_id, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50;
    `;
    const auditPlan = await captureQueryPlan(client, 'Global Audit Logs Timeline', auditSql);
    const auditBenchmark = await runBenchmarkWorkload(client, 'Admin Audit Log Global Timeline Pagination', (c) => c.query(auditSql), 150);

    // 5. Workload: Booking Sessions FK Lookup
    const sessionsByBookingSql = `
      SELECT id, booking_id, starts_at, ends_at, status
      FROM booking_sessions
      WHERE booking_id = $1
      ORDER BY starts_at ASC;
    `;
    const sessionsPlan = await captureQueryPlan(client, 'Booking Sessions Cascade/FK Lookup', sessionsByBookingSql, [sampleBooking]);
    const sessionsBenchmark = await runBenchmarkWorkload(client, 'Booking Sessions Foreign Key Retrieval', (c) => c.query(sessionsByBookingSql, [sampleBooking]), 150);

    // 6. Workload: Outbox Queue Polling
    const outboxSql = `
      SELECT id, event_type, aggregate_type, aggregate_id, attempts
      FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT 25;
    `;
    const outboxPlan = await captureQueryPlan(client, 'Outbox Queue Polling', outboxSql);
    const outboxBenchmark = await runBenchmarkWorkload(client, 'Transactional Outbox Queue Polling', (c) => c.query(outboxSql), 200);

    const report = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      workloads: [
        searchBenchmark,
        conflictBenchmark,
        authBenchmark,
        auditBenchmark,
        sessionsBenchmark,
        outboxBenchmark,
      ],
      queryPlans: [
        searchPlan,
        conflictPlan,
        authPlan,
        auditPlan,
        sessionsPlan,
        outboxPlan,
      ],
    };

    console.table(report.workloads);
    console.log('\n--- PostgreSQL Query Plans (EXPLAIN ANALYZE) ---');
    console.table(report.queryPlans);

    return report;
  } finally {
    await client.end();
  }
}

// Execute if run directly from CLI
if (process.argv[1].endsWith('run-load-benchmarks.mjs')) {
  runFullBenchmark().catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}
