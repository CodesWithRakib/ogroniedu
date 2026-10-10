import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { MigrationRunner } from '../src/migration-runner';

const { Client } = pg;

describe('Database Migration Runner & Integrity Constraint Tests', () => {
  const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'ogroniedu_test',
  };

  const runner = new MigrationRunner(dbConfig);
  let client: pg.Client;

  beforeAll(async () => {
    client = new Client(dbConfig);
    await client.connect();
    // Drop and recreate schema public to guarantee clean migration test execution
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('should run initial migration and record execution in schema_migrations', async () => {
    const executed = await runner.runMigrations();
    expect(executed).toContain('001_initial_schema.sql');

    const checkRes = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations WHERE name = $1;',
      ['001_initial_schema.sql'],
    );
    expect(checkRes.rows.length).toBe(1);
  });

  it('should be idempotent on second run (no duplicate execution)', async () => {
    const executedAgain = await runner.runMigrations();
    expect(executedAgain.length).toBe(0);

    const status = await runner.getStatus();
    expect(status.applied).toContain('001_initial_schema.sql');
    expect(status.pending.length).toBe(0);
  });

  it('should verify all core tables exist in the database catalog', async () => {
    const res = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = res.rows.map((r) => r.table_name);

    const mandatoryTables = [
      'users',
      'roles',
      'permissions',
      'user_roles',
      'curricula',
      'education_levels',
      'subjects',
      'guardian_student_links',
      'tutor_profiles',
      'bookings',
      'booking_sessions',
      'session_attendance',
      'ledger_accounts',
      'ledger_journals',
      'ledger_entries',
      'payment_orders',
      'payment_transactions',
      'notifications',
      'notification_deliveries',
      'outbox_events',
      'idempotency_keys',
      'audit_logs',
      'schema_migrations',
    ];

    for (const table of mandatoryTables) {
      expect(tableNames).toContain(table);
    }
  });

  describe('Integrity & Exclusion Constraints Negative Tests', () => {
    it('NEGATIVE TEST: should reject user creation when both email and phone are NULL', async () => {
      await expect(
        client.query(`
          INSERT INTO users (display_name, email, phone_e164)
          VALUES ('Anonymous User', NULL, NULL);
        `),
      ).rejects.toThrow(/chk_user_contact_present/);
    });

    it('NEGATIVE TEST: should reject overlapping tutor sessions via GiST exclusion constraint (ex_tutor_session_overlap)', async () => {
      // 1. Create a dummy tutor and student
      const tutorUserId = crypto.randomUUID();
      const studentUserId = crypto.randomUUID();
      const bookingId = crypto.randomUUID();

      await client.query(`
        INSERT INTO users (id, display_name, email)
        VALUES ('${tutorUserId}', 'Tutor Test', 'tutor.${tutorUserId}@test.com'),
               ('${studentUserId}', 'Student Test', 'student.${studentUserId}@test.com');
      `);

      await client.query(`
        INSERT INTO tutor_profiles (user_id, headline)
        VALUES ('${tutorUserId}', 'Physics Tutor');
      `);

      // Education level & Subject for booking
      const levelRes = await client.query('SELECT id FROM education_levels LIMIT 1;');
      const subjectRes = await client.query('SELECT id FROM subjects LIMIT 1;');

      let levelId = levelRes.rows[0]?.id;
      let subjectId = subjectRes.rows[0]?.id;

      if (!levelId) {
        const insertLvl = await client.query(`
          INSERT INTO education_levels (code, name_en, name_bn, sort_order)
          VALUES ('test_lvl_${Date.now()}', 'Level', 'লেভেল', 1) RETURNING id;
        `);
        levelId = insertLvl.rows[0].id;
      }

      if (!subjectId) {
        const insertSub = await client.query(`
          INSERT INTO subjects (code, name_en, name_bn)
          VALUES ('test_sub_${Date.now()}', 'Subject', 'বিষয়') RETURNING id;
        `);
        subjectId = insertSub.rows[0].id;
      }

      await client.query(`
        INSERT INTO bookings (id, requester_user_id, student_user_id, tutor_user_id, subject_id, education_level_id, mode, price_per_session_minor, duration_minutes, cancellation_policy_version)
        VALUES ('${bookingId}', '${studentUserId}', '${studentUserId}', '${tutorUserId}', '${subjectId}', '${levelId}', 'online', 100000, 60, 'v1');
      `);

      // 2. Insert primary scheduled session from 10:00 to 11:00 UTC
      const startA = new Date('2026-11-01T10:00:00Z').toISOString();
      const endA = new Date('2026-11-01T11:00:00Z').toISOString();

      await client.query(`
        INSERT INTO booking_sessions (booking_id, tutor_user_id, student_user_id, starts_at, ends_at, status)
        VALUES ('${bookingId}', '${tutorUserId}', '${studentUserId}', '${startA}', '${endA}', 'scheduled');
      `);

      // 3. Attempt to insert conflicting overlapping session for the SAME tutor from 10:30 to 11:30 UTC
      const startB = new Date('2026-11-01T10:30:00Z').toISOString();
      const endB = new Date('2026-11-01T11:30:00Z').toISOString();

      await expect(
        client.query(`
          INSERT INTO booking_sessions (booking_id, tutor_user_id, student_user_id, starts_at, ends_at, status)
          VALUES ('${bookingId}', '${tutorUserId}', '${studentUserId}', '${startB}', '${endB}', 'scheduled');
        `),
      ).rejects.toThrow(/ex_tutor_session_overlap/);
    });
  });
});
