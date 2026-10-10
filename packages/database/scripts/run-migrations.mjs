import { MigrationRunner } from '../dist/index.js';

const runner = new MigrationRunner({
  database: process.env.DB_NAME || 'ogroniedu_dev',
});

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
