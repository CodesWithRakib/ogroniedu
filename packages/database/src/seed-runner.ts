import pg from 'pg';
import { runInitialSeed } from './seeds/initial_seed.js';
import type { MigrationConfig } from './migration-runner.js';

const { Client } = pg;

export class SeedRunner {
  private config: MigrationConfig;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || Number(process.env.DB_PORT) || 5432,
      user: config.user || process.env.DB_USERNAME || 'postgres',
      password: config.password || process.env.DB_PASSWORD || 'password',
      database: config.database || process.env.DB_NAME || 'ogroniedu_dev',
    };
  }

  async runSeeds(): Promise<void> {
    const client = new Client(this.config);
    await client.connect();

    try {
      await client.query('BEGIN');
      await runInitialSeed(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Seeding failed: ${(err as Error).message}`);
    } finally {
      await client.end();
    }
  }
}
