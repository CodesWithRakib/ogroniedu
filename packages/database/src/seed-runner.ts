import pg from 'pg';
import { runInitialSeed } from './seeds/initial_seed.js';
import type { MigrationConfig } from './migration-runner.js';

const { Client } = pg;

export class SeedRunner {
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

  async runSeeds(options: { isProduction?: boolean } = {}): Promise<void> {
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

    try {
      await client.query('BEGIN');
      await runInitialSeed(client, options);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Seeding failed: ${(err as Error).message}`);
    } finally {
      await client.end();
    }
  }
}
