import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { SeedRunner } from '../src/seed-runner';
import { MigrationRunner } from '../src/migration-runner';

const { Client } = pg;

describe('Database Seed Runner & Idempotency Tests', () => {
  const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: 'ogroniedu_test',
  };

  const migrationRunner = new MigrationRunner(dbConfig);
  const seedRunner = new SeedRunner(dbConfig);
  let client: pg.Client;

  beforeAll(async () => {
    client = new Client(dbConfig);
    await client.connect();
    // Ensure migrations are in place before seeding
    await migrationRunner.runMigrations();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  it('should run initial seeds and populate foundational tables', async () => {
    await seedRunner.runSeeds();

    const rolesRes = await client.query('SELECT count(*) FROM roles;');
    expect(Number(rolesRes.rows[0].count)).toBeGreaterThanOrEqual(5);

    const curriculaRes = await client.query('SELECT count(*) FROM curricula;');
    expect(Number(curriculaRes.rows[0].count)).toBeGreaterThanOrEqual(4);

    const levelsRes = await client.query('SELECT count(*) FROM education_levels;');
    expect(Number(levelsRes.rows[0].count)).toBeGreaterThanOrEqual(5);

    const subjectsRes = await client.query('SELECT count(*) FROM subjects;');
    expect(Number(subjectsRes.rows[0].count)).toBeGreaterThanOrEqual(8);

    const accountsRes = await client.query('SELECT count(*) FROM ledger_accounts;');
    expect(Number(accountsRes.rows[0].count)).toBeGreaterThanOrEqual(7);

    const usersRes = await client.query('SELECT count(*) FROM users;');
    expect(Number(usersRes.rows[0].count)).toBeGreaterThanOrEqual(3);
  });

  it('VERIFICATION: should be strictly idempotent when seeded twice', async () => {
    // Record initial counts
    const rolesBefore = await client.query('SELECT count(*) FROM roles;');
    const curriculaBefore = await client.query('SELECT count(*) FROM curricula;');
    const levelsBefore = await client.query('SELECT count(*) FROM education_levels;');
    const subjectsBefore = await client.query('SELECT count(*) FROM subjects;');
    const accountsBefore = await client.query('SELECT count(*) FROM ledger_accounts;');
    const usersBefore = await client.query('SELECT count(*) FROM users;');

    // Execute second seed run
    await seedRunner.runSeeds();

    // Verify counts are unchanged
    const rolesAfter = await client.query('SELECT count(*) FROM roles;');
    const curriculaAfter = await client.query('SELECT count(*) FROM curricula;');
    const levelsAfter = await client.query('SELECT count(*) FROM education_levels;');
    const subjectsAfter = await client.query('SELECT count(*) FROM subjects;');
    const accountsAfter = await client.query('SELECT count(*) FROM ledger_accounts;');
    const usersAfter = await client.query('SELECT count(*) FROM users;');

    expect(rolesAfter.rows[0].count).toBe(rolesBefore.rows[0].count);
    expect(curriculaAfter.rows[0].count).toBe(curriculaBefore.rows[0].count);
    expect(levelsAfter.rows[0].count).toBe(levelsBefore.rows[0].count);
    expect(subjectsAfter.rows[0].count).toBe(subjectsBefore.rows[0].count);
    expect(accountsAfter.rows[0].count).toBe(accountsBefore.rows[0].count);
    expect(usersAfter.rows[0].count).toBe(usersBefore.rows[0].count);
  });

  it('should verify chart of accounts conforms to double-entry ledger categories', async () => {
    const res = await client.query<{ code: string; account_type: string }>(
      'SELECT code, account_type FROM ledger_accounts;',
    );

    const accounts = res.rows;
    const types = accounts.map((a) => a.account_type);

    expect(types).toContain('asset');
    expect(types).toContain('liability');
    expect(types).toContain('equity');
    expect(types).toContain('revenue');
    expect(types).toContain('expense');
  });
});
