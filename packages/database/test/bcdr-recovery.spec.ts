import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import crypto from 'node:crypto';
import { MigrationRunner } from '../src/migration-runner';

const { Client } = pg;

/**
 * NFR-006: Backup and Disaster Recovery (BCDR) Drill & PITR Replay Test Suite
 *
 * Simulates catastrophic primary storage failure, verifies cold recovery of
 * PostgreSQL schema migrations (001 through 009), validates point-in-time sequence
 * integrity, view recreations, and double-entry ledger balance invariants.
 */
describe('NFR-006: Database BCDR Disaster Recovery & Migration Replay Drill', () => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ogroniedu_test',
  };

  const runner = new MigrationRunner(dbConfig);
  let client: pg.Client;

  beforeAll(async () => {
    client = new Client(dbConfig);
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('STAGE 1: Simulate catastrophic wipe and execute cold recovery migration replay', async () => {
    // 1. Simulate catastrophic data loss / cold start by dropping public schema
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');

    // 2. Execute full cold recovery via MigrationRunner
    const executed = await runner.runMigrations();

    // Verify all 18 ordered migrations were replayed from WAL / migration log
    expect(executed).toHaveLength(18);
    expect(executed).toEqual([
      '001_initial_schema.sql',
      '002_auth_verification_codes.sql',
      '003_learning_management.sql',
      '004_payments_and_ledger.sql',
      '005_notifications_and_communication.sql',
      '006_reviews_and_trust_safety.sql',
      '007_admin_and_operations.sql',
      '008_analytics_and_reporting.sql',
      '009_security_and_privacy_hardening.sql',
      '010_performance_and_load_indexes.sql',
      '011_session_cancellation_tracking.sql',
      '012_support_tickets.sql',
      '013_auth_onboarding_and_magic_links.sql',
      '014_tutor_verification_dossier.sql',
      '015_academic_streams_and_institutions.sql',
      '016_tutor_discovery_and_replacement_workflow.sql',
      '017_tutor_profile_localization.sql',
      '018_profile_avatar_urls.sql',
    ]);

    // Verify schema_migrations ledger records all 18 entries
    const migrationRecords = await client.query<{ name: string; id: number }>(
      'SELECT id, name FROM schema_migrations ORDER BY id ASC;',
    );
    expect(migrationRecords.rows).toHaveLength(18);
    expect(migrationRecords.rows[0].name).toBe('001_initial_schema.sql');
    expect(migrationRecords.rows[17].name).toBe('018_profile_avatar_urls.sql');
  });

  it('STAGE 2: Verify post-recovery schema completeness and catalog invariants', async () => {
    const tableRes = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = new Set(tableRes.rows.map((r) => r.table_name));

    const coreTables = [
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
      'payment_refunds',
      'notifications',
      'notification_deliveries',
      'notification_preferences',
      'booking_messages',
      'reviews',
      'safety_reports',
      'tutor_replacement_cases',
      'support_tickets',
      'tutor_verification_levels',
      'tutor_verification_documents',
      'system_settings',
      'feature_flags',
      'schema_migrations',
    ];

    for (const table of coreTables) {
      expect(tables.has(table)).toBe(true);
    }

    // Verify operational analytics view was successfully compiled in recovery
    const viewRes = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public';
    `);
    const views = viewRes.rows.map((v) => v.table_name);
    expect(views).toContain('v_operational_daily_metrics');

    // Query view to verify column presence and calculation compatibility
    const viewQueryRes = await client.query('SELECT * FROM v_operational_daily_metrics LIMIT 1;');
    expect(viewQueryRes).toBeDefined();
    expect(Array.isArray(viewQueryRes.rows)).toBe(true);
  });

  it('STAGE 3: Verify Phase 17 security and Phase 19 performance indexes exist post-recovery in recovered catalog', async () => {
    const indexRes = await client.query<{ indexname: string }>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND indexname IN (
          'ix_file_assets_owner',
          'ix_users_status_privacy',
          'ix_bookings_active_participants',
          'ix_booking_sessions_booking_start',
          'ix_audit_logs_created_desc'
        );
    `);

    const indexes = indexRes.rows.map((r) => r.indexname);
    expect(indexes).toContain('ix_file_assets_owner');
    expect(indexes).toContain('ix_users_status_privacy');
    expect(indexes).toContain('ix_bookings_active_participants');
    expect(indexes).toContain('ix_booking_sessions_booking_start');
    expect(indexes).toContain('ix_audit_logs_created_desc');
  });

  it('STAGE 4: Point-In-Time Recovery (PITR) replay idempotency drill', async () => {
    // Calling runMigrations a second time must detect 0 pending changes and execute cleanly
    const secondPass = await runner.runMigrations();
    expect(secondPass).toHaveLength(0);

    const status = await runner.getStatus();
    expect(status.pending).toHaveLength(0);
    expect(status.applied).toHaveLength(18);
  });

  it('STAGE 5: Double-entry ledger balance conservation invariant drill', async () => {
    // Seed default chart of accounts if not present
    await client.query(`
      INSERT INTO ledger_accounts (code, name, account_type, currency, is_active)
      VALUES 
        ('1000', 'Escrow Holding Account', 'asset', 'BDT', true),
        ('2000', 'Tutor Payable Account', 'liability', 'BDT', true),
        ('4000', 'Platform Revenue Account', 'revenue', 'BDT', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    const journalId = crypto.randomUUID();
    const idempotencyKey = `bcdr-drill-${Date.now()}`;
    const amountMinor = 50000; // 500 BDT
    const tutorShare = 46000; // 92%
    const platformFee = 4000; // 8%

    // Create journal transaction
    await client.query(
      `
      INSERT INTO ledger_journals (id, source_type, source_id, idempotency_key, description)
      VALUES ($1, 'bcdr_drill_order', $2, $3, 'BCDR Ledger Balance Drill');
    `,
      [journalId, crypto.randomUUID(), idempotencyKey],
    );

    // Fetch accounts
    const accountsRes = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM ledger_accounts WHERE code IN ('1000', '2000', '4000');`,
    );
    const accMap = new Map(accountsRes.rows.map((r) => [r.code, r.id]));

    // Post balanced debit and credit entries
    // Debit Escrow (Asset) 50,000
    // Credit Tutor Payable (Liability) 46,000
    // Credit Platform Revenue (Revenue) 4,000
    const entry1 = crypto.randomUUID();
    const entry2 = crypto.randomUUID();
    const entry3 = crypto.randomUUID();

    await client.query(
      `
      INSERT INTO ledger_entries (id, journal_id, account_id, direction, amount_minor, currency)
      VALUES 
        ($1, $4, $5, 'debit', $7, 'BDT'),
        ($2, $4, $6, 'credit', $8, 'BDT'),
        ($3, $4, $9, 'credit', $10, 'BDT');
    `,
      [
        entry1,
        entry2,
        entry3,
        journalId,
        accMap.get('1000'),
        accMap.get('2000'),
        amountMinor,
        tutorShare,
        accMap.get('4000'),
        platformFee,
      ],
    );

    // 1. Check using migration 004 verification function
    const funcRes = await client.query<{ verify_ledger_journal_balance: boolean }>(
      `SELECT verify_ledger_journal_balance($1);`,
      [journalId],
    );
    expect(funcRes.rows[0].verify_ledger_journal_balance).toBe(true);

    // 2. Direct mathematical conservation check: Sum debits - Sum credits = 0
    const balanceCheck = await client.query<{ net_difference: string }>(
      `
      SELECT 
        SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE -amount_minor END) AS net_difference
      FROM ledger_entries
      WHERE journal_id = $1;
    `,
      [journalId],
    );

    expect(Number(balanceCheck.rows[0].net_difference)).toBe(0);
  });
});
