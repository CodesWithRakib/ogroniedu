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
      'assignments',
      'assignment_submissions',
      'progress_reports',
      'payment_refunds',
      'notification_preferences',
      'booking_messages',
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

    it('NEGATIVE TEST: should reject progress report when period_end is before period_start (chk_progress_report_dates)', async () => {
      const tutorUserId = crypto.randomUUID();
      const studentUserId = crypto.randomUUID();
      const bookingId = crypto.randomUUID();

      await client.query(`
        INSERT INTO users (id, display_name, email)
        VALUES ('${tutorUserId}', 'Tutor PR', 'tutor.${tutorUserId}@test.com'),
               ('${studentUserId}', 'Student PR', 'student.${studentUserId}@test.com');
      `);

      await client.query(`
        INSERT INTO tutor_profiles (user_id, headline)
        VALUES ('${tutorUserId}', 'Math Tutor');
      `);

      const levelRes = await client.query('SELECT id FROM education_levels LIMIT 1;');
      const subjectRes = await client.query('SELECT id FROM subjects LIMIT 1;');

      await client.query(`
        INSERT INTO bookings (id, requester_user_id, student_user_id, tutor_user_id, subject_id, education_level_id, mode, price_per_session_minor, duration_minutes, cancellation_policy_version)
        VALUES ('${bookingId}', '${studentUserId}', '${studentUserId}', '${tutorUserId}', '${subjectRes.rows[0].id}', '${levelRes.rows[0].id}', 'online', 100000, 60, 'v1');
      `);

      await expect(
        client.query(`
          INSERT INTO progress_reports (
            booking_id, student_user_id, tutor_user_id,
            period_start, period_end, attendance_rate, observable_progress
          )
          VALUES (
            '${bookingId}', '${studentUserId}', '${tutorUserId}',
            '2026-10-15', '2026-10-01', 95.0, 'Inverted dates test'
          );
        `),
      ).rejects.toThrow(/chk_progress_report_dates/);
    });

    it('FINANCIAL INVARIANT: verify_ledger_journal_balance should confirm balanced debits and credits', async () => {
      const journalId = crypto.randomUUID();
      const idempotencyKey = `ledger-test-balance-${Date.now()}`;

      // Insert test journal
      await client.query(`
        INSERT INTO ledger_journals (id, source_type, source_id, idempotency_key, description)
        VALUES ('${journalId}', 'test_payment', gen_random_uuid(), '${idempotencyKey}', 'Test balanced journal');
      `);

      // Insert or ensure test accounts exist
      await client.query(`
        INSERT INTO ledger_accounts (code, name, account_type, currency)
        VALUES ('1000', 'Escrow Holding Pool', 'asset', 'BDT'),
               ('2100', 'Student Escrow Deposit', 'liability', 'BDT')
        ON CONFLICT (code) DO NOTHING;
      `);

      // Fetch sample accounts (e.g. 1000 and 2100)
      const acc1000 = await client.query("SELECT id FROM ledger_accounts WHERE code = '1000';");
      const acc2100 = await client.query("SELECT id FROM ledger_accounts WHERE code = '2100';");

      const acc1000Id = acc1000.rows[0].id;
      const acc2100Id = acc2100.rows[0].id;

      // 1. Insert balanced entries: Debit 50,000 poisha and Credit 50,000 poisha (500 BDT)
      await client.query(`
        INSERT INTO ledger_entries (journal_id, account_id, direction, amount_minor, currency)
        VALUES ('${journalId}', '${acc1000Id}', 'debit', 50000, 'BDT'),
               ('${journalId}', '${acc2100Id}', 'credit', 50000, 'BDT');
      `);

      const verifyRes = await client.query<{ verify_ledger_journal_balance: boolean }>(`
        SELECT verify_ledger_journal_balance('${journalId}');
      `);

      expect(verifyRes.rows[0].verify_ledger_journal_balance).toBe(true);

      // 2. Unbalanced test: add extra debit of 10,000 poisha to break balance
      await client.query(`
        INSERT INTO ledger_entries (journal_id, account_id, direction, amount_minor, currency)
        VALUES ('${journalId}', '${acc1000Id}', 'debit', 10000, 'BDT');
      `);

      const unbalancedRes = await client.query<{ verify_ledger_journal_balance: boolean }>(`
        SELECT verify_ledger_journal_balance('${journalId}');
      `);

      expect(unbalancedRes.rows[0].verify_ledger_journal_balance).toBe(false);
    });

    it('NEGATIVE TEST: should reject duplicate notification preference for same user, category and channel', async () => {
      const testUserId = crypto.randomUUID();
      await client.query(`
        INSERT INTO users (id, display_name, email)
        VALUES ('${testUserId}', 'Pref Tester', 'preftester-${Date.now()}@example.com');
      `);

      await client.query(`
        INSERT INTO notification_preferences (user_id, category, channel, is_enabled)
        VALUES ('${testUserId}', 'booking', 'sms', true);
      `);

      // Duplicate insertion must violate uq_notification_preferences
      await expect(
        client.query(`
          INSERT INTO notification_preferences (user_id, category, channel, is_enabled)
          VALUES ('${testUserId}', 'booking', 'sms', false);
        `),
      ).rejects.toThrow(/uq_notification_preferences/);
    });
  });
});
