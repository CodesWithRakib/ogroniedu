import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;

export interface MigrationConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
}

export class MigrationRunner {
  private config: MigrationConfig;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      connectionString: config.connectionString || process.env.DATABASE_URL,
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || Number(process.env.DB_PORT) || 5432,
      user: config.user || process.env.DB_USERNAME || 'postgres',
      password: config.password || process.env.DB_PASSWORD || 'password',
      database: config.database || process.env.DB_NAME || 'ogroniedu_dev',
      ssl: config.ssl,
    };
  }

  private async getClient(): Promise<pg.Client> {
    const connectionString = this.config.connectionString;
    const isSsl =
      Boolean(this.config.ssl) ||
      process.env.DB_SSL === 'true' ||
      Boolean(connectionString && connectionString.includes('sslmode=require'));
    const ssl = isSsl ? { rejectUnauthorized: false } : undefined;

    const client = connectionString
      ? new Client({ connectionString, ssl })
      : new Client({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          ssl,
        });

    await client.connect();
    return client;
  }

  /**
   * Run all pending migrations in alphabetical sequence
   */
  async runMigrations(): Promise<string[]> {
    const client = await this.getClient();
    const executed: string[] = [];

    try {
      // 1. Ensure migrations tracking table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      // 2. Fetch already executed migrations
      const existingRes = await client.query<{ name: string }>(
        'SELECT name FROM schema_migrations ORDER BY id ASC;',
      );
      const appliedSet = new Set(existingRes.rows.map((r) => r.name));

      // 3. Locate SQL files
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      let migrationsDir = path.join(currentDir, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        migrationsDir = path.join(currentDir, '..', 'src', 'migrations');
      }

      if (!fs.existsSync(migrationsDir)) {
        throw new Error(`Migrations directory not found: ${migrationsDir}`);
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      // 4. Execute pending migrations in transaction
      for (const file of files) {
        if (appliedSet.has(file)) {
          continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
          await client.query('COMMIT');
          executed.push(file);
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`Failed to apply migration ${file}: ${(err as Error).message}`);
        }
      }

      return executed;
    } finally {
      await client.end();
    }
  }

  /**
   * Fetch current migration status
   */
  async getStatus(): Promise<{ applied: string[]; pending: string[] }> {
    const client = await this.getClient();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      const res = await client.query<{ name: string }>(
        'SELECT name FROM schema_migrations ORDER BY id ASC;',
      );
      const applied = res.rows.map((r) => r.name);

      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      let migrationsDir = path.join(currentDir, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        migrationsDir = path.join(currentDir, '..', 'src', 'migrations');
      }
      const files = fs.existsSync(migrationsDir)
        ? fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort()
        : [];

      const pending = files.filter((f) => !applied.includes(f));
      return { applied, pending };
    } finally {
      await client.end();
    }
  }
}
