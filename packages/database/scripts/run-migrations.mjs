import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Auto-load root .env if environment variables are not preloaded
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidateEnvs = [
    path.resolve(currentDir, '..', '..', '.env'),
    path.resolve(currentDir, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of candidateEnvs) {
    if (fs.existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
        break;
      } catch {
        // ignore load errors
      }
    }
  }
}

import { MigrationRunner } from '../dist/index.js';

const targetDb = process.env.DB_NAME || (process.env.DATABASE_URL ? 'configured database' : 'ogroniedu_dev');
const runner = new MigrationRunner(process.env.DATABASE_URL ? {} : { database: targetDb });

async function main() {
  console.log(`Starting migrations on database: ${process.env.DB_NAME || 'ogroniedu_dev'}...`);
  const executed = await runner.runMigrations();
  if (executed.length === 0) {
    console.log('No pending migrations. Database schema is up to date.');
  } else {
    console.log(`Successfully executed migrations: ${executed.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
